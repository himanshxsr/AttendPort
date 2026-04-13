const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Attendance = require('../models/Attendance');

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const today = '2026-04-13';
    const result = await Attendance.deleteMany({ date: { $gt: today } });
    console.log(`✅ Deleted ${result.deletedCount} orphaned future attendance records.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanup();
