const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const WorkSession = require('../models/WorkSession');
const User = require('../models/User');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectLogs() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to:', mongoose.connection.name);

    const logs = await Attendance.find({ 
      date: { $in: ['2026-04-14', '2026-04-15'] } 
    }).populate('userId', 'name').sort({ date: -1 });

    console.log(`Found ${logs.length} logs for April 14-15.`);

    for (const log of logs) {
      const sessions = await WorkSession.find({ attendanceId: log._id });
      console.log(`---
User: ${log.userId ? log.userId.name : 'Unknown'}
Date: ${log.date}
Check In: ${log.checkIn}
Check Out: ${log.checkOut}
Total Hours: ${log.totalHours}
Status: ${log.status}
Sessions: ${sessions.length}`);
      sessions.forEach((s, idx) => {
        console.log(`  S${idx+1}: ${s.startTime} - ${s.endTime}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

inspectLogs();
