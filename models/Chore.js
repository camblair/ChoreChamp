const mongoose = require('mongoose');

const choreSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  points: {
    type: Number,
    required: true,
    min: 0
  },
  householdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Household',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'verified'],
    default: 'pending'
  },
  choreType: {
    type: String,
    enum: ['one-time', 'recurring'],
    required: true
  },
  dueDate: {
    type: Date,
    required: function() {
      return this.choreType === 'one-time';
    }
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly'],
      required: function() {
        return this.parent().choreType === 'recurring';
      }
    },
    daysOfWeek: [{
      type: String,
      enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      lowercase: true,
      required: function() {
        return this.parent().choreType === 'recurring' && this.parent().recurrence.frequency === 'weekly';
      }
    }],
    lastCompleted: {
      type: Date
    }
  },
  completedAt: {
    type: Date
  },
  nextDueDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Method to check if a chore is due
choreSchema.methods.isDue = function() {
  const now = new Date();
  
  if (this.choreType === 'one-time') {
    return !this.completedAt && now >= this.dueDate;
  }

  if (this.choreType === 'recurring') {
    if (!this.recurrence || !this.recurrence.frequency) {
      return false;
    }

    if (this.recurrence.frequency === 'daily') {
      return !this.completedAt || 
             (now.getDate() !== this.completedAt.getDate() ||
              now.getMonth() !== this.completedAt.getMonth() ||
              now.getFullYear() !== this.completedAt.getFullYear());
    }

    if (this.recurrence.frequency === 'weekly') {
      const dayOfWeek = now.toLocaleString('en-us', { weekday: 'long' }).toLowerCase();
      return this.recurrence.daysOfWeek.includes(dayOfWeek) &&
             (!this.completedAt ||
              (now.getDate() !== this.completedAt.getDate() ||
               now.getMonth() !== this.completedAt.getMonth() ||
               now.getFullYear() !== this.completedAt.getFullYear()));
    }
  }

  return false;
};

// Update nextDueDate before saving
choreSchema.pre('save', function(next) {
  const now = new Date();

  if (this.choreType === 'one-time') {
    this.nextDueDate = this.dueDate;
  } else if (this.choreType === 'recurring') {
    if (this.recurrence.frequency === 'daily') {
      this.nextDueDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (this.recurrence.frequency === 'weekly') {
      const today = now.toLocaleString('en-us', { weekday: 'long' }).toLowerCase();
      const nextDay = this.recurrence.daysOfWeek.find(day => day > today);
      if (nextDay !== undefined) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayIndex = days.indexOf(today);
        const nextDayIndex = days.indexOf(nextDay);
        this.nextDueDate = new Date(now.setDate(now.getDate() + (nextDayIndex - todayIndex)));
      } else {
        const firstDay = Math.min(...this.recurrence.daysOfWeek);
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayIndex = days.indexOf(today);
        const firstDayIndex = days.indexOf(firstDay);
        this.nextDueDate = new Date(now.setDate(now.getDate() + (7 - todayIndex + firstDayIndex)));
      }
    }
  }

  next();
});

// Add validation for weekly chores to ensure at least one day is selected
choreSchema.pre('save', function(next) {
  if (
    this.choreType === 'recurring' && 
    this.recurrence.frequency === 'weekly' && 
    (!this.recurrence.daysOfWeek || this.recurrence.daysOfWeek.length === 0)
  ) {
    next(new Error('Weekly chores must have at least one day selected'));
  }
  next();
});

module.exports = mongoose.model('Chore', choreSchema);
