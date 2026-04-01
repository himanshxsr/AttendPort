const cron = require('node-cron');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const WorkSession = require('../models/WorkSession');
const Holiday = require('../models/Holiday');
const { calculateStatus } = require('../controllers/attendanceController');

/**
 * Midnight Cron Job
 * Runs every day at 00:00 (Midnight)
 * 1. Auto-checkouts any active sessions from the previous day.
 * 2. Finalizes statuses for existing but incomplete records.
 * 3. Creates 'Absent' records for users who didn't check in at all.
 */
const initMidnightCron = () => {
  // schedule for 00:00 every day
  cron.schedule('0 0 * * *', async () => {
    console.log('🌙 Midnight Automation: Starting daily attendance finalization...');
    
    try {
      // 1. Identify yesterday's date string (YYYY-MM-DD)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toLocaleDateString('en-CA'); // YYYY-MM-DD
      
      // 2. Auto-Checkout dangling sessions
      // Find all work sessions for yesterday that never ended
      const openSessions = await WorkSession.find({
        endTime: { $exists: false }
      }).populate({
        path: 'attendanceId',
        match: { date: dateStr }
      });

      const filteredSessions = openSessions.filter(s => s.attendanceId);
      
      if (filteredSessions.length > 0) {
        console.log(`🌙 Midnight Automation: Closing ${filteredSessions.length} active sessions for ${dateStr}...`);
        const manualEndTime = new Date(yesterday);
        manualEndTime.setHours(23, 59, 59, 999);

        for (const session of filteredSessions) {
          session.endTime = manualEndTime;
          await session.save();
        }
      }

      // 3. Process all users to finalize statuses
      const users = await User.find({ isDeleted: { $ne: true } });
      const holiday = await Holiday.findOne({ date: dateStr });
      const dayOfWeek = yesterday.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      for (const user of users) {
        let attendance = await Attendance.findOne({ userId: user._id, date: dateStr });

        if (attendance) {
          // If record exists, recalculate hours and set status
          const sessions = await WorkSession.find({ attendanceId: attendance._id });
          let totalMs = 0;
          sessions.forEach(s => {
            if (s.startTime && s.endTime) {
              totalMs += new Date(s.endTime) - new Date(s.startTime);
            }
          });
          
          attendance.totalHours = +(totalMs / 3600000).toFixed(2);
          
          // Only finalize if status is currently empty or incorrectly marked
          if (!attendance.status || attendance.status === '') {
            attendance.status = calculateStatus(dateStr, attendance.totalHours);
          }
          
          await attendance.save();
        } else {
          // If no record exists, and it's NOT a holiday/weekend, mark as Absent
          if (!isWeekend && !holiday) {
            await Attendance.create({
              userId: user._id,
              date: dateStr,
              status: 'Absent',
              totalHours: 0
            });
          }
        }
      }

      console.log(`✅ Midnight Automation: Finalized all records for ${dateStr}.`);
    } catch (error) {
      console.error('❌ Midnight Automation Error:', error.message);
    }
  });
};

module.exports = initMidnightCron;
