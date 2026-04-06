const mongoose = require('mongoose');
const User = require('./server/models/User');
const Attendance = require('./server/models/Attendance');
const { calculateStatus, syncLeaveBalance } = require('./server/controllers/attendanceController');
require('dotenv').config({ path: './server/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://himanshu:ElisiumSpace@cluster0.qutmnik.mongodb.net/attendance-portal?retryWrites=true&w=majority&appName=Cluster0';

async function fixAnirudh() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    const user = await User.findOne({ email: 'anirudh.gupta1313@gmail.com' });
    if (!user) {
      console.log('Anirudh not found');
      return;
    }

    const record = await Attendance.findOne({ userId: user._id, date: '2026-04-03' });
    if (!record) {
      console.log('Record for Apr 3 not found');
      return;
    }

    console.log(`Current Status: ${record.status}, Hours: ${record.totalHours}`);
    
    const newStatus = calculateStatus(record.date, record.totalHours);
    console.log(`Calculated Status: ${newStatus}`);

    if (record.status !== newStatus) {
        record.status = newStatus;
        await record.save();
        console.log(`Status updated to ${newStatus}`);
    }

    console.log('Syncing leave balance...');
    await syncLeaveBalance(user._id, record._id);
    console.log('Done.');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAnirudh();
