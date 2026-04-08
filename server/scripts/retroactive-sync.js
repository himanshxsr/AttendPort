const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const WorkSession = require('../models/WorkSession');
const { calculateStatus, syncLeaveBalance } = require('../controllers/attendanceController');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env.local' });
dotenv.config({ path: '../.env' });

const syncDate = async (dateStr) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`🧹 Retroactive Sync: Processing records for ${dateStr}...`);
    
    const records = await Attendance.find({ date: dateStr });
    
    for (const record of records) {
      // Recalculate hours
      const sessions = await WorkSession.find({ attendanceId: record._id });
      let totalMs = 0;
      sessions.forEach(s => {
        if (s.startTime && s.endTime) {
          totalMs += new Date(s.endTime) - new Date(s.startTime);
        }
      });
      
      record.totalHours = +(totalMs / 3600000).toFixed(2);
      
      // Force finalize status based on hours
      if (!record.status || record.status === '' || record.status === 'Absent') {
         const newStatus = calculateStatus(dateStr, record.totalHours);
         if (newStatus !== record.status) {
            record.status = newStatus;
            console.log(`✅ Updated ${record._id} for User ${record.userId}: ${record.status} (${record.totalHours}h)`);
         }
      }
      
      await record.save();
      await syncLeaveBalance(record.userId, record._id);
    }
    
    console.log('✨ Retroactive Sync: Completed.');
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

syncDate('2026-04-08');
