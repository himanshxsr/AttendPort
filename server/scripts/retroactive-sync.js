const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
require('dotenv').config({ path: './server/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://himanshu:ElisiumSpace@cluster0.qutmnik.mongodb.net/attendance-portal?retryWrites=true&w=majority&appName=Cluster0';

async function performRetroactiveDeduction() {
  try {
    await mongoose.connect(MONGO_URI);
    
    // Find all 'Absent' and 'Half Day' attendance records that have not recorded a deduction yet
    const attendances = await Attendance.find({ 
      status: { $in: ['Absent', 'Leave', 'Half Day'] },
      $or: [
        { leaveDeducted: { $exists: false } },
        { leaveDeducted: 0 }
      ]
    });

    console.log(`Analyzing ${attendances.length} historical absence records for missing deductions...`);

    for (const record of attendances) {
      // Find the associated user
      const user = await User.findById(record.userId);
      if (!user) continue;

      let targetDeduction = 0;
      if (record.status === 'Absent' || record.status === 'Leave') targetDeduction = 1;
      if (record.status === 'Half Day') targetDeduction = 0.5;

      let currentBalance = user.casualLeaveBalance || 2; // Default to 2 if somehow undefined
      let actualDeduction = 0;

      // Cannot drop below 0
      if (currentBalance >= targetDeduction) {
        actualDeduction = targetDeduction;
      } else {
        actualDeduction = currentBalance;
      }

      if (actualDeduction > 0) {
        user.casualLeaveBalance = currentBalance - actualDeduction;
        await user.save();
        console.log(`[FIXED] Deducted ${actualDeduction} from ${user.name} for ${record.status} on ${record.date}. New Balance: ${user.casualLeaveBalance}`);
      }
      
      // Store the fact that we deducted it
      record.leaveDeducted = actualDeduction;
      await record.save();
    }

    console.log('Retroactive deduction analysis complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error during sync:', err);
    process.exit(1);
  }
}

performRetroactiveDeduction();
