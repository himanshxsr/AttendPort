const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: './server/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://himanshu:ElisiumSpace@cluster0.qutmnik.mongodb.net/attendance-portal?retryWrites=true&w=majority&appName=Cluster0';

const missingUsers = [
  { name: 'Arbaz Arshad', empNo: 'EMP004' },
  { name: 'Anirudh Gupta', empNo: 'EMP005' },
  { name: 'Abhisha Oli', empNo: 'EMP006' },
];

async function finalizeMigration() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Fix sequential employee codes for the remaining 3
    for (const item of missingUsers) {
      const user = await User.findOne({ 
        name: { $regex: new RegExp(`^\\s*${item.name}\\s*$`, 'i') } 
      });
      if (user) {
        user.employeeCode = item.empNo;
        // Also ensure they have default leave balances to fix the 0 display issue
        if (user.casualLeaveBalance === undefined || user.casualLeaveBalance === null) {
          user.casualLeaveBalance = 2;
        }
        if (user.sickLeaveBalance === undefined || user.sickLeaveBalance === null) {
          user.sickLeaveBalance = 2;
        }
        await user.save();
        console.log(`✅ Updated ${item.name} to ${item.empNo} and initialized balances.`);
      } else {
        console.log(`❌ User not found: ${item.name}`);
      }
    }

    // 2. Double check and initialize all other active users if needed
    const allUsers = await User.find({ isDeleted: false });
    for (const user of allUsers) {
      let changed = false;
      if (user.casualLeaveBalance === undefined || user.casualLeaveBalance === null) {
        user.casualLeaveBalance = 2;
        changed = true;
      }
      if (user.sickLeaveBalance === undefined || user.sickLeaveBalance === null) {
        user.sickLeaveBalance = 2;
        changed = true;
      }
      if (changed) {
        await user.save();
        console.log(`⚙️ Initialized balances for ${user.name}`);
      }
    }

    console.log('🎉 Migration check complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

finalizeMigration();
