const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Attendance = require('../models/Attendance');
const User = require('../models/User');

async function checkFuture() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const today = '2026-04-13';
    const futureLogs = await Attendance.find({ date: { $gt: today } }).populate('userId', 'name');
    console.log(`Found ${futureLogs.length} future logs:`);
    futureLogs.forEach(l => {
      console.log(`- Date: ${l.date}, User: ${l.userId?.name}, Status: "${l.status}", Hours: ${l.totalHours}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkFuture();
