const mongoose = require('mongoose');

const householdSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parents: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'co-parent'],
      default: 'co-parent'
    },
    status: {
      type: String,
      enum: ['pending', 'active'],
      default: 'active'
    }
  }],
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  invites: [{
    email: {
      type: String,
      required: true
    },
    token: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['co-parent'],
      default: 'co-parent'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired'],
      default: 'pending'
    },
    expiresAt: {
      type: Date,
      required: true
    }
  }]
}, {
  timestamps: true
});

// Set the first parent (creator) as owner
householdSchema.pre('save', function(next) {
  if (this.isNew) {
    this.parents = [{
      user: this.createdBy,
      role: 'owner',
      status: 'active'
    }];
  }
  next();
});

const Household = mongoose.model('Household', householdSchema);

module.exports = Household;
