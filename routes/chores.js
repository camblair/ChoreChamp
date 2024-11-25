const express = require('express');
const Chore = require('../models/Chore');
const { auth, isParent } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get all chores
router.get('/', auth, async (req, res, next) => {
  try {
    let chores;
    if (req.user.role === 'parent') {
      // Parents see all chores
      chores = await Chore.find()
        .populate('assignedTo', 'username')
        .populate('createdBy', 'username');
    } else {
      // Children only see their assigned chores
      chores = await Chore.find({ assignedTo: req.user._id })
        .populate('assignedTo', 'username')
        .populate('createdBy', 'username');
    }
    res.json(chores);
  } catch (error) {
    console.error('Error fetching chores:', error);
    next(error);
  }
});

// Create a new chore
router.post('/', auth, isParent, async (req, res, next) => {
  try {
    const { title, description, points, choreType, assignedTo, dueDate, recurrence } = req.body;

    // Validate required fields
    if (!title || !points || !choreType) {
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
      createdBy: req.user._id
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

// Delete a chore (parent only)
router.delete('/:id', auth, isParent, async (req, res) => {
  try {
    const chore = await Chore.findById(req.params.id);
    
    if (!chore) {
      return res.status(404).json({ message: 'Chore not found' });
    }

    // Ensure the parent created this chore
    if (chore.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this chore' });
    }

    await Chore.findByIdAndDelete(req.params.id);
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

// Assign chore to child
router.patch('/:id/assign', auth, isParent, async (req, res) => {
  try {
    const { assignedTo } = req.body;
    
    // Validate child belongs to parent if assignedTo is provided
    if (assignedTo) {
      const child = await User.findOne({ 
        _id: assignedTo,
        parentId: req.user._id
      });

      if (!child) {
        return res.status(400).json({ message: 'Invalid child assignment' });
      }
    }

    const chore = await Chore.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { $set: { assignedTo: assignedTo || null } },
      { new: true }
    ).populate('assignedTo', 'username firstName');

    if (!chore) {
      return res.status(404).json({ message: 'Chore not found' });
    }

    res.json(chore);
  } catch (error) {
    console.error('Error assigning chore:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get currently assigned chores for a specific child
router.get('/assigned/:childId', auth, async (req, res) => {
  try {
    const childId = req.params.childId;

    // Verify authorization
    if (req.user.role !== 'parent' && req.user._id.toString() !== childId) {
      return res.status(403).json({ message: 'Not authorized to view these chores' });
    }

    // If parent, verify they're viewing their own child's chores
    if (req.user.role === 'parent') {
      const child = await User.findById(childId);
      if (!child || child.parentId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view these chores' });
      }
    }

    const chores = await Chore.find({
      'assignedTo._id': childId,
      status: { $nin: ['completed', 'archived'] }
    }).sort({ createdAt: -1 });

    res.json(chores);
  } catch (error) {
    console.error('Error fetching assigned chores:', error);
    res.status(500).json({ message: error.message });
  }
});

// Complete a chore
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const chore = await Chore.findById(req.params.id);
    if (!chore) {
      return res.status(404).json({ message: 'Chore not found' });
    }

    // Verify the chore is assigned to this user
    if (!chore.assignedTo || chore.assignedTo._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to complete this chore' });
    }

    // Check if chore is already completed
    if (chore.status === 'completed') {
      return res.status(400).json({ message: 'Chore is already completed' });
    }

    // Update chore status and completion time
    chore.status = 'completed';
    chore.lastCompleted = new Date();

    // Add points to user
    const user = await User.findById(req.user._id);
    user.points += chore.points;
    await user.save();

    // For recurring chores, calculate next reset time
    if (chore.choreType === 'recurring') {
      const now = new Date();
      let resetTime = new Date(now);
      resetTime.setHours(0, 0, 0, 0); // Set to midnight

      if (chore.recurrence.frequency === 'daily') {
        // Reset at next midnight
        resetTime.setDate(resetTime.getDate() + 1);
      } else if (chore.recurrence.frequency === 'weekly') {
        // Find the next occurrence after today
        const today = now.toLocaleString('en-us', { weekday: 'lowercase' });
        const currentDayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(today);
        
        // Convert days to numbers for comparison
        const choreDays = chore.recurrence.daysOfWeek.map(day => 
          ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day)
        );
        
        // Find next day that's in the chore's schedule
        let nextDay = choreDays.find(day => day > currentDayIndex);
        if (nextDay === undefined) {
          // If no days left this week, get first day of next week
          nextDay = choreDays[0];
          resetTime.setDate(resetTime.getDate() + (7 - currentDayIndex + nextDay));
        } else {
          resetTime.setDate(resetTime.getDate() + (nextDay - currentDayIndex));
        }
      }

      // Schedule reset
      setTimeout(async () => {
        try {
          chore.status = 'pending';
          chore.lastCompleted = null;
          await chore.save();
        } catch (error) {
          console.error('Error resetting chore:', error);
        }
      }, resetTime.getTime() - now.getTime());
    }

    await chore.save();
    res.json(chore);
  } catch (error) {
    console.error('Error completing chore:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
