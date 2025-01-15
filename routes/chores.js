const express = require('express');
const Chore = require('../models/Chore');
const { auth, isParent } = require('../middleware/auth');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

// Get all chores
router.get('/', auth, async (req, res, next) => {
  try {
    const { householdId } = req.query;
    
    if (!householdId) {
      return res.status(400).json({ message: 'Household ID is required' });
    }

    let chores;
    if (req.user.role === 'parent') {
      // Parents see all chores for the household
      chores = await Chore.find({ householdId })
        .populate('assignedTo', 'username firstName lastName')
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });
    } else {
      // Children only see their assigned chores for the household
      chores = await Chore.find({ 
        householdId,
        assignedTo: req.user._id 
      })
        .populate('assignedTo', 'username firstName lastName')
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });
    }

    console.log('Fetched chores:', chores); // Debug log
    res.json(chores);
  } catch (error) {
    console.error('Error fetching chores:', error);
    next(error);
  }
});

// Create a new chore
router.post('/', auth, isParent, async (req, res, next) => {
  try {
    const { title, description, points, choreType, assignedTo, dueDate, recurrence, householdId } = req.body;

    // Validate required fields
    if (!title || !points || !choreType || !householdId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate weekly recurrence has days selected
    if (choreType === 'recurring' && recurrence?.frequency === 'weekly') {
      if (!recurrence.daysOfWeek || recurrence.daysOfWeek.length === 0) {
        return res.status(400).json({ message: 'Weekly chores must have at least one day selected' });
      }
      // Ensure day names are lowercase
      recurrence.daysOfWeek = recurrence.daysOfWeek.map(day => day.toLowerCase());
    }

    // Create chore object with common fields
    const choreData = {
      title,
      description: description || '',
      points: Number(points),
      choreType,
      createdBy: req.user._id,
      householdId
    };

    // Add optional assignedTo if provided
    if (assignedTo) {
      choreData.assignedTo = assignedTo;
    }

    // Add type-specific fields
    if (choreType === 'one-time') {
      if (!dueDate) {
        return res.status(400).json({ message: 'Due date is required for one-time chores' });
      }
      choreData.dueDate = dueDate;
    } else if (choreType === 'recurring') {
      choreData.recurrence = {
        frequency: recurrence.frequency,
        daysOfWeek: recurrence.daysOfWeek
      };
    }

    const chore = new Chore(choreData);
    await chore.save();
    
    // Populate the response with user details
    await chore.populate([
      { path: 'assignedTo', select: 'username' },
      { path: 'createdBy', select: 'username' }
    ]);

    res.status(201).json(chore);
  } catch (error) {
    console.error('Error creating chore:', error);
    next(error);
  }
});

// Update a chore (parent only)
router.put('/:id', auth, isParent, async (req, res, next) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['title', 'description', 'points', 'choreType', 'assignedTo', 'dueDate', 'recurrence'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    const chore = await Chore.findById(req.params.id);

    if (!chore) {
      return res.status(404).json({ message: 'Chore not found' });
    }

    // Verify ownership
    if (chore.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this chore' });
    }

    // Validate required fields
    if (!req.body.title || !req.body.points || !req.body.choreType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate weekly recurrence has days selected
    if (req.body.choreType === 'recurring' && req.body.recurrence?.frequency === 'weekly') {
      if (!req.body.recurrence.daysOfWeek || req.body.recurrence.daysOfWeek.length === 0) {
        return res.status(400).json({ message: 'Weekly chores must have at least one day selected' });
      }
      // Ensure day names are lowercase
      req.body.recurrence.daysOfWeek = req.body.recurrence.daysOfWeek.map(day => day.toLowerCase());
    }

    // Update basic fields
    const updateData = {
      title: req.body.title,
      description: req.body.description || '',
      points: Number(req.body.points),
      choreType: req.body.choreType,
      assignedTo: req.body.assignedTo || undefined
    };

    // Handle type-specific updates
    if (req.body.choreType === 'one-time') {
      if (!req.body.dueDate) {
        return res.status(400).json({ message: 'Due date is required for one-time chores' });
      }
      updateData.dueDate = req.body.dueDate;
      updateData.recurrence = undefined;
    } else if (req.body.choreType === 'recurring') {
      updateData.recurrence = {
        frequency: req.body.recurrence.frequency,
        daysOfWeek: req.body.recurrence.daysOfWeek
      };
      updateData.dueDate = undefined;
    }

    const updatedChore = await Chore.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('assignedTo', 'username');

    res.json(updatedChore);
  } catch (error) {
    console.error('Error updating chore:', error);
    next(error);
  }
});

// Update chore status
router.patch('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const chore = await Chore.findById(id);
    if (!chore) {
      return res.status(404).json({ message: 'Chore not found' });
    }

    // Only assigned child or parent can update status
    if (req.user.role === 'child' && chore.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this chore' });
    }

    chore.status = status;
    if (status === 'completed') {
      chore.completedAt = new Date();
    }

    await chore.save();
    await chore.populate([
      { path: 'assignedTo', select: 'username' },
      { path: 'createdBy', select: 'username' }
    ]);

    res.json(chore);
  } catch (error) {
    console.error('Error updating chore:', error);
    next(error);
  }
});

// Unassign a chore from a child
router.patch('/:id/unassign', auth, async (req, res) => {
  try {
    // Only parents can unassign chores
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can unassign chores' });
    }

    const chore = await Chore.findById(req.params.id);
    if (!chore) {
      return res.status(404).json({ message: 'Chore not found' });
    }

    // Clear the assignment
    chore.assignedTo = null;
    chore.status = 'pending';
    await chore.save();

    res.json({ message: 'Chore unassigned successfully' });
  } catch (error) {
    console.error('Error unassigning chore:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete a chore
router.delete('/:id', auth, async (req, res) => {
  try {
    // Only parents can delete chores
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can delete chores' });
    }

    const chore = await Chore.findById(req.params.id);
    if (!chore) {
      return res.status(404).json({ message: 'Chore not found' });
    }

    await Chore.deleteOne({ _id: req.params.id });
    res.json({ message: 'Chore deleted successfully' });
  } catch (error) {
    console.error('Error deleting chore:', error);
    res.status(500).json({ message: error.message });
  }
});

// Verify chore completion (parent only)
router.patch('/:id/verify', auth, isParent, async (req, res, next) => {
  try {
    const { id } = req.params;
    const chore = await Chore.findById(id);

    if (!chore) {
      return res.status(404).json({ message: 'Chore not found' });
    }

    if (chore.status !== 'completed') {
      return res.status(400).json({ message: 'Chore must be completed before verification' });
    }

    chore.status = 'verified';
    await chore.save();

    // Award points to child
    await User.findByIdAndUpdate(
      chore.assignedTo,
      { $inc: { points: chore.points } }
    );

    await chore.populate([
      { path: 'assignedTo', select: 'username' },
      { path: 'createdBy', select: 'username' }
    ]);

    res.json(chore);
  } catch (error) {
    console.error('Error verifying chore:', error);
    next(error);
  }
});

// Mark chore as completed (by child)
router.patch('/:id/complete', auth, async (req, res, next) => {
  try {
    const chore = await Chore.findOne({
      _id: req.params.id,
      assignedTo: req.user._id,
      status: 'pending'
    });

    if (!chore) {
      return res.status(404).json({ error: 'Chore not found' });
    }

    chore.status = 'completed';
    chore.completedAt = new Date();
    await chore.save();
    await chore.populate([
      { path: 'assignedTo', select: 'username' },
      { path: 'createdBy', select: 'username' }
    ]);

    res.json(chore);
  } catch (error) {
    console.error('Error marking chore as completed:', error);
    next(error);
  }
});

// Rotate chores between children
router.post('/rotate', auth, isParent, async (req, res) => {
  try {
    // Get all children for this parent
    const children = await User.find({ parentId: req.user._id })
      .sort('choreRotationOrder')
      .select('_id choreRotationOrder');

    if (children.length === 0) {
      return res.status(400).json({ message: 'No children found to rotate chores between' });
    }

    // Get all assigned chores
    const chores = await Chore.find({
      assignedTo: { $in: children.map(child => child._id) }
    });

    // Group chores by current assignee
    const choresByChild = {};
    children.forEach(child => {
      choresByChild[child._id.toString()] = [];
    });

    chores.forEach(chore => {
      if (chore.assignedTo) {
        choresByChild[chore.assignedTo.toString()].push(chore);
      }
    });

    // Rotate chores
    const updates = [];
    Object.keys(choresByChild).forEach((childId, index) => {
      const nextChildIndex = (index + 1) % children.length;
      const nextChildId = children[nextChildIndex]._id;
      
      choresByChild[childId].forEach(chore => {
        updates.push({
          updateOne: {
            filter: { _id: chore._id },
            update: { $set: { assignedTo: nextChildId } }
          }
        });
      });
    });

    if (updates.length > 0) {
      await Chore.bulkWrite(updates);
    }

    res.json({ message: 'Chores rotated successfully' });
  } catch (error) {
    console.error('Error rotating chores:', error);
    res.status(500).json({ message: error.message });
  }
});

// Assign a chore to a child
router.patch('/:id/assign', auth, isParent, async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    const chore = await Chore.findById(id);
    if (!chore) {
      return res.status(404).json({ message: 'Chore not found' });
    }

    // If assigning to a child (not unassigning)
    if (assignedTo) {
      const child = await User.findById(assignedTo);
      if (!child) {
        return res.status(404).json({ message: 'Child not found' });
      }

      // Send email notification to child
      if (child.email) {
        try {
          await sendEmail(child.email, 'choreAssigned', {
            childName: child.firstName,
            choreName: chore.title,
            points: chore.points,
            dueDate: chore.dueDate
          });
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
          // Continue with the assignment even if email fails
        }
      }
    }

    // Update the chore's assignedTo field
    chore.assignedTo = assignedTo;
    await chore.save();

    // Populate the response
    await chore.populate([
      { path: 'assignedTo', select: 'username firstName lastName email' },
      { path: 'createdBy', select: 'username' }
    ]);

    res.json(chore);
  } catch (error) {
    console.error('Error assigning chore:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get assigned chores for a child
router.get('/assigned/:userId', auth, async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('Fetching chores for user:', userId); // Debug log

    // Verify the requesting user is either the child or their parent
    if (req.user.role === 'child' && req.user._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to view these chores' });
    }

    // Find all active chores assigned to this child
    const chores = await Chore.find({
      'assignedTo': userId,
      status: { $ne: 'archived' }
    }).sort({ createdAt: -1 });

    console.log('Found chores:', chores); // Debug log
    res.json(chores);
  } catch (error) {
    console.error('Error fetching assigned chores:', error);
    res.status(500).json({ message: error.message });
  }
});

// Complete a chore
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const choreId = req.params.id;
    const userId = req.user._id;

    // Find the chore
    const chore = await Chore.findOne({
      _id: choreId,
      assignedTo: userId,
      status: { $ne: 'archived' }
    }).populate('createdBy', 'firstName lastName email');

    if (!chore) {
      return res.status(404).json({ message: 'Chore not found' });
    }

    // Update chore status
    chore.status = 'completed';
    chore.completedAt = new Date();
    await chore.save();

    // Update user points
    const user = await User.findById(userId);
    if (user) {
      user.points += chore.points;
      await user.save();

      // Send email notification to parent
      if (chore.createdBy?.email) {
        try {
          await sendEmail(chore.createdBy.email, 'choreCompleted', {
            parentName: chore.createdBy.firstName,
            childName: user.firstName,
            choreName: chore.title
          });
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
          // Continue even if email fails
        }
      }
    }

    // If it's a recurring chore, create the next instance
    if (chore.choreType === 'recurring') {
      const nextDueDate = new Date();
      if (chore.recurrence.frequency === 'daily') {
        nextDueDate.setDate(nextDueDate.getDate() + 1);
      } else if (chore.recurrence.frequency === 'weekly') {
        nextDueDate.setDate(nextDueDate.getDate() + 7);
      }

      const newChore = new Chore({
        title: chore.title,
        description: chore.description,
        points: chore.points,
        choreType: chore.choreType,
        assignedTo: chore.assignedTo,
        createdBy: chore.createdBy,
        dueDate: nextDueDate,
        recurrence: chore.recurrence
      });

      await newChore.save();
    }

    res.json({ message: 'Chore completed successfully', points: user.points });
  } catch (error) {
    console.error('Error completing chore:', error);
    res.status(500).json({ message: error.message });
  }
});

// Undo chore completion
router.patch('/:id/undo', auth, async (req, res) => {
  try {
    const choreId = req.params.id;
    const userId = req.user._id;

    // Find the chore
    const chore = await Chore.findOne({
      _id: choreId,
      assignedTo: userId,
      status: 'completed'
    });

    if (!chore) {
      return res.status(404).json({ message: 'Completed chore not found' });
    }

    // Update chore status
    chore.status = 'pending';
    chore.completedAt = null;
    await chore.save();

    // Update user points
    const user = await User.findById(userId);
    if (user) {
      user.points = Math.max(0, user.points - chore.points); // Prevent negative points
      await user.save();
    }

    res.json({ message: 'Chore completion undone successfully' });
  } catch (error) {
    console.error('Error undoing chore completion:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
