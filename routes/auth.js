const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, isParent } = require('../middleware/auth');

const router = express.Router();

// Register a parent account
router.post('/register/parent', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Username already exists' 
      });
    }

    const user = new User({
      username,
      email,
      password,
      role: 'parent'
    });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    const userData = user.toObject();
    delete userData.password;

    res.status(201).json({ 
      user: userData, 
      token 
    });
  } catch (error) {
    console.error('Parent registration error:', error);
    next(error);
  }
});

// Register a child (parent only)
router.post('/register/child', auth, isParent, async (req, res) => {
  try {
    const { username, firstName, email, phone, password } = req.body;

    // Validate required fields
    if (!username || !firstName || !password) {
      return res.status(400).json({ message: 'Username, First Name, and Password are required' });
    }

    // Check if username is taken
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Get the count of existing children for this parent
    const childrenCount = await User.countDocuments({ parentId: req.user._id });

    // Create new child user
    const child = new User({
      username,
      firstName,
      email,
      phone,
      password,
      role: 'child',
      parentId: req.user._id,
      choreRotationOrder: childrenCount // Assign next available order number
    });

    await child.save();

    // Return child info without sensitive data
    res.status(201).json({
      _id: child._id,
      username: child.username,
      firstName: child.firstName,
      email: child.email,
      phone: child.phone,
      role: child.role,
      points: child.points,
      choreRotationOrder: child.choreRotationOrder
    });
  } catch (error) {
    console.error('Error registering child:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update child (parent only)
router.patch('/child/:id', auth, isParent, async (req, res) => {
  try {
    const { username, firstName, email, phone, password } = req.body;
    const childId = req.params.id;

    // Verify child belongs to parent
    const child = await User.findOne({ 
      _id: childId,
      parentId: req.user._id
    });

    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Check if username is taken by another user
    if (username !== child.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
    }

    // Check if email is taken by another user
    if (email && email !== child.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already registered' });
      }
    }

    // Update fields
    child.username = username;
    child.firstName = firstName;
    child.email = email || null; // Convert empty string to null
    child.phone = phone || null; // Convert empty string to null
    
    // Only update password if provided
    if (password) {
      child.password = password;
    }

    await child.save();

    // Return updated child info without sensitive data
    res.json({
      _id: child._id,
      username: child.username,
      firstName: child.firstName,
      email: child.email,
      phone: child.phone,
      role: child.role,
      points: child.points,
      choreRotationOrder: child.choreRotationOrder
    });
  } catch (error) {
    console.error('Error updating child:', error);
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Username and password are required' 
      });
    }

    const user = await User.findOne({ username });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ 
        message: 'Invalid login credentials' 
      });
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    const userData = user.toObject();
    delete userData.password;

    res.json({ 
      user: userData, 
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
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
    }).select('_id username');

    res.json(children);
  } catch (error) {
    console.error('Error fetching children:', error);
    next(error);
  }
});

module.exports = router;
