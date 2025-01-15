const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, isParent } = require('../middleware/auth');

// Get all children for a parent
router.get('/children', auth, isParent, async (req, res) => {
  try {
    const children = await User.find({ parentId: req.user._id })
      .select('-password');
    res.json(children);
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get a specific user (child or self)
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only allow parents to view their children or users to view themselves
    if (
      req.user.role !== 'parent' && 
      req.user._id.toString() !== user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to view this user' });
    }

    // If parent, verify they're viewing their own child
    if (
      req.user.role === 'parent' &&
      user.role === 'child' &&
      (!user.parentId || user.parentId.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ message: 'Not authorized to view this child' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
