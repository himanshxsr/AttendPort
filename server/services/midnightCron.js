const cron = require('node-cron');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const WorkSession = require('../models/WorkSession');
const Holiday = require('../models/Holiday');
const Leave = require('../models/Leave');
const { calculateStatus } = require('../controllers/attendanceController');
const { getISTDateString, getISTEndOfDayUTC } = require('../utils/dateUtils');

/**
 * Midnight Cron Job
 * Runs every day at 00:00 (Midnight)
 * 1. Auto-checkouts any active sessions from the previous day.
 * 2. Finalizes statuses for existing but incomplete records.
 * 3. Creates 'Absent' records for users who didn't check in at all.
 */
const initMidnightCron = () => {
  // schedule for 00:00 every day in India time
  cron.schedule('0 0 * * *', async () => {
    console.log('🌙 Midnight Automation: Starting daily attendance finalization...');
    
    try {
      // 1. Identify yesterday's date string (YYYY-MM-DD)
      // Since cron runs at 00:00 IST, subtracting 1 hour ensures we get the correct "yesterday"
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 1);
      const dateStr = getISTDateString(yesterday);
      
      // 2. Auto-Checkout dangling sessions
      // Find all work sessions for yesterday that never ended
      const openSessions = await WorkSession.find({
        $or: [{ endTime: { $exists: false } }, { endTime: null }]
      }).populate({
        path: 'attendanceId',
        match: { date: dateStr }
      });

      const filteredSessions = openSessions.filter(s => s.attendanceId);
      
      if (filteredSessions.length > 0) {
        console.log(`🌙 Midnight Automation: Closing ${filteredSessions.length} active sessions for ${dateStr}...`);
        const manualEndTime = getISTEndOfDayUTC(dateStr);

        for (const session of filteredSessions) {
          session.endTime = manualEndTime;
          await session.save();

          // Also update the parent attendance checkout time and mark as Absent
          const attendance = await Attendance.findById(session.attendanceId._id);
          if (attendance) {
            attendance.checkOut = manualEndTime;
            attendance.status = 'Absent'; // Strictly mark as Absent if auto-checked out
            await attendance.save();
          }
        }
      }

      // 3. Process all users to finalize statuses
      const users = await User.find({ isDeleted: { $ne: true } });
      const holiday = await Holiday.findOne({ date: dateStr });
      const dayOfWeek = yesterday.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      for (const user of users) {
        let attendance = await Attendance.findOne({ userId: user._id, date: dateStr });
        const approvedLeave = await Leave.findOne({
          userId: user._id,
          status: 'Approved',
          startDate: { $lte: dateStr },
          endDate: { $gte: dateStr }
        });

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
          
          // Ensure checkOut is visible on the dashboard if it was closed by automation
          if (!attendance.checkOut) {
            attendance.checkOut = getISTEndOfDayUTC(dateStr);
          }

          // Approved leave should be respected for zero-hour records.
          // Do not overwrite worked records to avoid data loss.
          if (approvedLeave && (attendance.totalHours || 0) === 0) {
            attendance.status = approvedLeave.type === 'Half Day (Casual)' ? 'Half Day' : 'Leave';
            attendance.totalHours = approvedLeave.type === 'Half Day (Casual)' ? 4.5 : 0;
          } else if (!attendance.status || attendance.status === '') {
            attendance.status = calculateStatus(dateStr, attendance.totalHours);
          }
          
          await attendance.save();
          // Sync leave balance for finalized existing records
          await require('../controllers/attendanceController').syncLeaveBalance(user._id, attendance._id);
        } else {
          // If no record exists:
          // - mark approved leave as Leave/Half Day
          // - otherwise mark Absent (except weekend/holiday)
          if (!isWeekend && !holiday) {
            const status = approvedLeave
              ? (approvedLeave.type === 'Half Day (Casual)' ? 'Half Day' : 'Leave')
              : 'Absent';
            const totalHours = approvedLeave && approvedLeave.type === 'Half Day (Casual)' ? 4.5 : 0;
            const newAttendance = await Attendance.create({
              userId: user._id,
              date: dateStr,
              status,
              totalHours
            });
            // Sync leave balance for new automated Absent records
            await require('../controllers/attendanceController').syncLeaveBalance(user._id, newAttendance._id);
          }
        }
      }

      console.log(`✅ Midnight Automation: Finalized all records for ${dateStr}.`);
    } catch (error) {
      console.error('❌ Midnight Automation Error:', error.message);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
};

module.exports = initMidnightCron;
