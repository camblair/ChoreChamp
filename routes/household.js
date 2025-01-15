const express = require('express');
const router = express.Router();
const Household = require('../models/Household');
const User = require('../models/User');
const { auth, isParent } = require('../middleware/auth');
const crypto = require('crypto');
const { sendHouseholdInvitation } = require('../utils/email');
const bcrypt = require('bcryptjs');

// Create a new household
router.post('/', auth, isParent, async (req, res) => {
  try {
    const { name } = req.body;
    
    // Check if user already has a household
    const existingHousehold = await Household.findOne({
      'parents.user': req.user._id
    });

    if (existingHousehold) {
      return res.status(400).json({ 
        error: 'You are already a member of a household' 
      });
    }

    const household = new Household({
      name,
      createdBy: req.user._id,
      parents: [{
        user: req.user._id,
        role: 'owner',
        status: 'active'
      }]
    });

    await household.save();
    
    // Populate the response
    await household.populate('parents.user', 'username email');
    
    res.status(201).json(household);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's household
router.get('/', auth, async (req, res) => {
  try {
    const { householdId } = req.query;
    
    // Find the specific household if householdId is provided
    const query = householdId 
      ? { _id: householdId, 'parents.user': req.user._id }
      : { 'parents.user': req.user._id };

    const household = await Household.findOne(query)
      .populate('parents.user', 'username email firstName lastName phone')
      .populate('children', 'username firstName lastName email phone points')
      .populate('createdBy', 'username email firstName lastName phone');

    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    res.json(household);
  } catch (error) {
    console.error('Error fetching household:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all households for the user
router.get('/all', auth, async (req, res) => {
  try {
    const households = await Household.find({
      'parents.user': req.user._id
    }).populate('parents.user', 'username email')
      .populate('children', 'username firstName');

    if (!households || households.length === 0) {
      return res.status(404).json({ error: 'No households found' });
    }

    res.json(households);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update household details
router.put('/', auth, isParent, async (req, res) => {
  try {
    const { name } = req.body;
    
    const household = await Household.findOne({
      'parents.user': req.user._id
    });

    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    // Only owner or co-parent can update household
    const parent = household.parents.find(
      p => p.user.toString() === req.user._id.toString()
    );

    if (!parent || !['owner', 'co-parent'].includes(parent.role)) {
      return res.status(403).json({ 
        error: 'Only household parents can update household details' 
      });
    }

    household.name = name;
    await household.save();

    await household.populate('parents.user', 'username email phone');
    await household.populate('children', 'username firstName');
    
    res.json(household);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update parent profile
router.put('/profile', auth, isParent, async (req, res) => {
  try {
    const { username, email, phone, currentPassword, newPassword } = req.body;
    
    // Find user
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ 
          error: 'Current password is required to change password' 
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // Update other fields if provided
    if (username) user.username = username;
    if (email) user.email = email;
    if (phone) user.phone = phone;

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        error: `This ${field} is already in use` 
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get all children (for adding to household)
router.get('/available-children', auth, isParent, async (req, res) => {
  try {
    // Find children not in any household
    const childrenInHouseholds = await Household.distinct('children');
    
    const availableChildren = await User.find({
      role: 'child',
      _id: { $nin: childrenInHouseholds }
    }).select('username firstName lastName');

    res.json(availableChildren);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Invite a co-parent
router.post('/invite', auth, isParent, async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find the user's household
    const household = await Household.findOne({
      'parents.user': req.user._id
    });

    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    // Check if email is already invited
    const existingInvite = household.invites.find(
      invite => invite.email === email && invite.status === 'pending'
    );

    if (existingInvite) {
      return res.status(400).json({ error: 'Invitation already sent' });
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 hour expiration

    household.invites.push({
      email,
      token,
      role: 'co-parent',
      expiresAt
    });

    await household.save();

    const inviteUrl = `${process.env.CLIENT_URL}/join-household/${token}`;
    
    try {
      await sendHouseholdInvitation(email, inviteUrl, req.user.username);
      res.json({ message: 'Invitation sent successfully' });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Still return success since the invite was created
      res.json({ 
        message: 'Invitation created but email failed to send',
        inviteUrl // Include URL for development
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept household invitation
router.post('/join/:token', auth, isParent, async (req, res) => {
  try {
    const { token } = req.params;

    const household = await Household.findOne({
      'invites': {
        $elemMatch: {
          token,
          status: 'pending',
          expiresAt: { $gt: new Date() }
        }
      }
    });

    if (!household) {
      return res.status(404).json({ 
        error: 'Invalid or expired invitation' 
      });
    }

    const invite = household.invites.find(i => i.token === token);

    // Verify the invited email matches the authenticated user
    if (invite.email !== req.user.email) {
      return res.status(403).json({ 
        error: 'This invitation was sent to a different email address' 
      });
    }

    // Add user as co-parent
    household.parents.push({
      user: req.user._id,
      role: 'co-parent',
      status: 'active'
    });

    // Update invite status
    invite.status = 'accepted';

    await household.save();

    // Populate the response
    await household.populate('parents.user', 'username email');
    await household.populate('children', 'username firstName');

    res.json(household);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Move children to household
router.post('/add-children', auth, isParent, async (req, res) => {
  try {
    const { childrenIds } = req.body;

    // Find the user's household
    const household = await Household.findOne({
      'parents.user': req.user._id
    });

    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    // Verify all children exist and are not in another household
    const children = await User.find({
      _id: { $in: childrenIds },
      role: 'child'
    });

    if (children.length !== childrenIds.length) {
      return res.status(400).json({ 
        error: 'One or more children not found' 
      });
    }

    // Check if any children are already in a household
    const childrenInHouseholds = await Household.find({
      children: { $in: childrenIds }
    });

    if (childrenInHouseholds.length > 0) {
      return res.status(400).json({ 
        error: 'One or more children are already in a household' 
      });
    }

    // Add children to household
    household.children.push(...childrenIds);
    await household.save();

    // Populate and return updated household
    await household.populate('children', 'username firstName');
    await household.populate('parents.user', 'username email');

    res.json(household);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove child from household
router.delete('/children/:childId', auth, isParent, async (req, res) => {
  try {
    const { childId } = req.params;

    const household = await Household.findOne({
      'parents.user': req.user._id
    });

    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    // Check if child is in household
    if (!household.children.includes(childId)) {
      return res.status(404).json({ error: 'Child not found in household' });
    }

    // Remove child
    household.children = household.children.filter(
      id => id.toString() !== childId
    );

    await household.save();

    // Populate and return updated household
    await household.populate('children', 'username firstName');
    await household.populate('parents.user', 'username email');

    res.json(household);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove a parent from household (owner only)
router.delete('/parents/:userId', auth, isParent, async (req, res) => {
  try {
    const { userId } = req.params;

    const household = await Household.findOne({
      'parents.user': req.user._id
    });

    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    // Check if requester is owner
    const requester = household.parents.find(
      p => p.user.toString() === req.user._id.toString()
    );

    if (!requester || requester.role !== 'owner') {
      return res.status(403).json({ 
        error: 'Only the household owner can remove parents' 
      });
    }

    // Cannot remove self if owner
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ 
        error: 'Household owner cannot be removed' 
      });
    }

    // Remove the parent
    household.parents = household.parents.filter(
      p => p.user.toString() !== userId
    );

    await household.save();
    
    res.json(household);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
