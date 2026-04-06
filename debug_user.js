const mongoose = require('mongoose');
const User = require('./server/models/User');
const Attendance = require('./server/models/Attendance');
require('dotenv').config({ path: './server/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://himanshu:ElisiumSpace@cluster0.qutmnik.mongodb.net/attendance-portal?retryWrites=true&w=majority&appName=Cluster0';

async function debugUser() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: 'anirudh.gupta1313@gmail.com' });
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log(`User: ${user.name}`);
    console.log(`CL Balance: ${user.casualLeaveBalance}`);
    console.log(`SL Balance: ${user.sickLeaveBalance}`);

    const attendances = await Attendance.find({ userId: user._id, date: { $in: ['2026-04-02', '2026-04-03'] } });
    console.log('Attendance Records:');
    attendances.forEach(a => {
      console.log(`Date: ${a.date}, Status: ${a.status}, Hours: ${a.totalHours}, Leave Deducted: ${a.leaveDeducted}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugUser();
