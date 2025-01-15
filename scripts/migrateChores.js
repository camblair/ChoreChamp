const mongoose = require('mongoose');
const Chore = require('../models/Chore');
const Household = require('../models/Household');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/chorechamp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const migrateChores = async () => {
  try {
    // Get all households
    const households = await Household.find({});
    
    for (const household of households) {
      // Get all chores created by parents in this household
      const parentIds = household.parents.map(p => p.user.toString());
      
      // Update chores created by parents in this household
      await Chore.updateMany(
        { 
          createdBy: { $in: parentIds },
          householdId: { $exists: false }
        },
        { 
          $set: { householdId: household._id }
        }
      );
      
      console.log(`Updated chores for household: ${household.name}`);
    }
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateChores();
