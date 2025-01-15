const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Household = require('../models/Household'); // Import Household model
const { auth, isParent } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

// Register a parent account
router.post('/register/parent', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'All fields are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username: username },
        { email: email }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.username === username ? 
          'Username already exists' : 
          'Email already exists'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      role: 'parent'
    });

    // Save user
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const userData = user.toObject();
    delete userData.password;

    res.status(201).json({ 
      user: userData, 
      token 
    });
  } catch (error) {
    console.error('Parent registration error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Username or email already exists'
      });
    }
    res.status(500).json({ 
      error: 'Registration failed. Please try again.' 
    });
  }
});

// Register a child (parent only)
router.post('/register/child', auth, isParent, async (req, res) => {
  try {
    const { username, firstName, lastName, email, phone, password } = req.body;

    // Validate required fields
    if (!username || !firstName || !password) {
      return res.status(400).json({ message: 'Username, First Name, and Password are required' });
    }

    // Check if username is taken
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 8);

    // Create child user
    const child = new User({
      username,
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      role: 'child',
      parentId: req.user._id,
      points: 0
    });

    await child.save();

    // Send welcome email if email is provided
    if (email) {
      try {
        await sendEmail(email, 'welcome', {
          name: firstName
        });
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Continue even if email fails
      }
    }

    // Return child info without sensitive data
    const childData = child.toObject();
    delete childData.password;
    
    res.status(201).json(childData);
  } catch (error) {
    console.error('Error registering child:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update child (parent only)
router.patch('/child/:id', auth, isParent, async (req, res) => {
  try {
    const { username, firstName, lastName, email, phone, password, householdId } = req.body;
    const childId = req.params.id;

    // Verify child belongs to parent
    const child = await User.findOne({
      _id: childId,
      parentId: req.user._id
    });

    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // If householdId is being changed, update the household's children array
    if (householdId !== undefined && householdId !== child.householdId) {
      // If child was in a previous household, remove them from it
      if (child.householdId) {
        await Household.findByIdAndUpdate(
          child.householdId,
          { $pull: { children: childId } }
        );
      }
      
      // Add child to new household if householdId is provided
      if (householdId) {
        const household = await Household.findById(householdId);
        if (!household) {
          return res.status(404).json({ message: 'Household not found' });
        }
        
        // Add child to household if not already there
        await Household.findByIdAndUpdate(
          householdId,
          { $addToSet: { children: childId } }
        );
      }
    }

    // Update fields if provided
    if (username) child.username = username;
    if (firstName !== undefined) child.firstName = firstName;
    if (lastName !== undefined) child.lastName = lastName;
    if (email !== undefined) child.email = email;
    if (phone !== undefined) child.phone = phone;
    if (householdId !== undefined) child.householdId = householdId;

    // Only update password if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 8);
      child.password = hashedPassword;
    }

    await child.save();

    // Return updated child without sensitive data
    const updatedChild = child.toObject();
    delete updatedChild.password;
    
    // Fetch and return the updated household data
    if (householdId) {
      const updatedHousehold = await Household.findById(householdId)
        .populate('children', 'username firstName lastName email phone points')
        .lean();
      
      console.log('Updated household data:', updatedHousehold);
    }
    
    res.json(updatedChild);
  } catch (error) {
    console.error('Error updating child:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update user profile
router.put('/user/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    console.log('Update request for user:', userId);
    console.log('Update data received:', req.body);
    
    // Ensure user can only update their own profile
    if (userId !== req.user._id.toString()) {
      console.log('Authorization failed: userId:', userId, 'requesterId:', req.user._id);
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for username/email uniqueness if being updated
    if (req.body.username || req.body.email) {
      const query = {
        _id: { $ne: userId },
        $or: []
      };
      
      if (req.body.username) {
        query.$or.push({ username: req.body.username });
      }
      if (req.body.email && req.body.email !== '') {
        query.$or.push({ email: req.body.email });
      }
      
      if (query.$or.length > 0) {
        const existingUser = await User.findOne(query);
        if (existingUser) {
          const field = existingUser.username === req.body.username ? 'username' : 'email';
          return res.status(400).json({ error: `This ${field} is already in use` });
        }
      }
    }

    // Use the safe update method
    await user.safeUpdate(req.body);
    console.log('User updated successfully:', user);

    // Return updated user without password
    const userData = user.toObject();
    delete userData.password;

    res.json({ user: userData });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        error: 'Invalid username or password'
      });
    }

    // Validate password
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid username or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const userData = user.toObject();
    delete userData.password;

    res.json({
      user: userData,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed. Please try again.'
    });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res, next) => {
  try {
    const userData = req.user.toObject();
    delete userData.password;
    res.json(userData);
  } catch (error) {
    console.error('Profile fetch error:', error);
    next(error);
  }
});

// Get children for parent
router.get('/children', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can access children list' });
    }

    const children = await User.find({ 
      parentId: req.user._id,
      role: 'child'
    }).select('_id username firstName lastName email phone householdId');

    res.json(children);
  } catch (error) {
    console.error('Error fetching children:', error);
    next(error);
  }
});

// Delete a child (parent only)
router.delete('/children/:id', auth, isParent, async (req, res) => {
  try {
    const childId = req.params.id;

    // Verify child belongs to parent
    const child = await User.findOne({
      _id: childId,
      parentId: req.user._id
    });

    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Delete the child
    await User.deleteOne({ _id: childId });

    res.status(200).json({ message: 'Child deleted successfully' });
  } catch (error) {
    console.error('Error deleting child:', error);
    res.status(500).json({ message: 'Failed to delete child. Please try again.' });
  }
});

module.exports = router;
