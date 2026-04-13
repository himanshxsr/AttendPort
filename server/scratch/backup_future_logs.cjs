const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Attendance = require('../models/Attendance');
const User = require('../models/User');

async function backup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const today = '2026-04-13';
    const futureLogs = await Attendance.find({ date: { $gt: today } }).lean();
    
    if (futureLogs.length > 0) {
      const backupPath = path.join(__dirname, 'future_logs_backup.json');
      fs.writeFileSync(backupPath, JSON.stringify(futureLogs, null, 2));
      console.log(`✅ Backed up ${futureLogs.length} future logs to ${backupPath}`);
    } else {
      console.log('No future logs found to backup.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

backup();
