const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
require('dotenv').config({ path: './server/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://himanshu:ElisiumSpace@cluster0.qutmnik.mongodb.net/attendance-portal?retryWrites=true&w=majority&appName=Cluster0';

async function syncLeaves() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all attendance records that are marked as Absent or Half Day 
    // where leaveDeducted is not set or 0
    const attendances = await Attendance.find({
      status: { $in: ['Absent', 'Leave', 'Half Day'] },
    });

    console.log(`Found ${attendances.length} records that might need fixing.`);

    for (const record of attendances) {
      if (!record.leaveDeducted) {
        const user = await User.findById(record.userId);
        if (!user) continue;

        let targetDeduction = 0;
        if (record.status === 'Absent' || record.status === 'Leave') targetDeduction = 1;
        if (record.status === 'Half Day') targetDeduction = 0.5;

        // Deduct from user balance
        let currentBalance = user.casualLeaveBalance || 0;
        let actualDeduction = 0;

        if (currentBalance >= targetDeduction) {
          actualDeduction = targetDeduction;
        } else {
          actualDeduction = currentBalance;
        }

        if (actualDeduction > 0) {
          user.casualLeaveBalance = currentBalance - actualDeduction;
          await user.save();
          console.log(`Deducted ${actualDeduction} from ${user.name} for ${record.status} on ${record.date}`);
        }

        record.leaveDeducted = actualDeduction;
        await record.save();
      }
    }

    console.log('✅ Sync complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

syncLeaves();
