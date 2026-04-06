const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { calculateStatus, syncLeaveBalance } = require('../controllers/attendanceController');
require('dotenv').config({ path: './server/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://himanshu:ElisiumSpace@cluster0.qutmnik.mongodb.net/attendance-portal?retryWrites=true&w=majority&appName=Cluster0';

async function syncLeaves() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Specify the range we want to fix (e.g., April 2026)
    const startDate = '2026-04-01';
    const endDate = '2026-04-06';

    const attendances = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    });

    console.log(`Analyzing ${attendances.length} records from ${startDate} to ${endDate}...`);

    for (const record of attendances) {
      const oldStatus = record.status;
      
      // 1. Recalculate status based on new 7.5h rules
      // (Wait: Only recalculate if it wasn't manually marked as 'Leave')
      if (record.status !== 'Leave') {
        const newStatus = calculateStatus(record.date, record.totalHours);
        if (newStatus !== oldStatus) {
            record.status = newStatus;
            await record.save();
            console.log(`Updated status for user ${record.userId} on ${record.date}: ${oldStatus} -> ${newStatus}`);
        }
      }

      // 2. Sync leave balance (handles deduction or refund)
      await syncLeaveBalance(record.userId, record._id);
    }

    console.log('✅ Sync complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

syncLeaves();
