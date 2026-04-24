const Attendance = require('../models/Attendance');
const WorkSession = require('../models/WorkSession');
const User = require('../models/User');
const Leave = require('../models/Leave');
const { getISTDateString, getISTEndOfDayUTC } = require('../utils/dateUtils');

/**
 * Helper to calculate attendance status based on day of week and total hours.
 */
const calculateStatus = (dateStr, totalHours) => {
  // Use local components for day of week calculation as stored in DB
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

  // Wednesday Rule: < 3.5h is Absent
  if (dayOfWeek === 3) {
    return totalHours < 3.5 ? 'Absent' : 'Present';
  }

  // Workdays (Mon, Tue, Thu, Fri) Rule
  if ([1, 2, 4, 5].includes(dayOfWeek)) {
    if (totalHours < 4.0) return 'Absent';
    if (totalHours < 7.5) return 'Half Day'; // 7h 30m
    return 'Present';
  }

  // Weekends / Others: Always Present
  return 'Present';
};

/**
 * Helper to sync user's leave balance based on an attendance record.
 * Handles both deductions and refunds (e.g. if status improves from Half Day to Present).
 */
const syncLeaveBalance = async (userId, attendanceId) => {
  try {
    const attendance = await Attendance.findById(attendanceId);
    const user = await User.findById(userId);
    if (!attendance || !user) return;

    let targetDeduction = 0;
    let targetBucket = 'none';

    if (attendance.status === 'Absent') {
      targetDeduction = 1;
      targetBucket = 'casual';
    } else if (attendance.status === 'Half Day') {
      targetDeduction = 0.5;
      targetBucket = 'casual';
    } else if (attendance.status === 'Leave') {
      const approvedLeave = await Leave.findOne({
        userId,
        status: 'Approved',
        startDate: { $lte: attendance.date },
        endDate: { $gte: attendance.date }
      });
      if (approvedLeave?.type === 'Sick') {
        targetDeduction = 1;
        targetBucket = 'sick';
      } else {
        targetDeduction = 1;
        targetBucket = 'casual';
      }
    }

    const previousDeduction = attendance.leaveDeducted || 0;
    const previousBucket = attendance.leaveDeductedType || 'none';

    if (targetDeduction === previousDeduction && targetBucket === previousBucket) return;

    // Refund previous deduction first to the same bucket it came from.
    if (previousDeduction > 0) {
      if (previousBucket === 'sick') {
        user.sickLeaveBalance = +((user.sickLeaveBalance || 0) + previousDeduction).toPrecision(4);
      } else if (previousBucket === 'casual') {
        user.casualLeaveBalance = +((user.casualLeaveBalance || 0) + previousDeduction).toPrecision(4);
      }
    }

    let actualDeduction = 0;
    if (targetDeduction > 0) {
      if (targetBucket === 'sick') {
        const currentSick = user.sickLeaveBalance || 0;
        actualDeduction = Math.min(targetDeduction, currentSick);
        user.sickLeaveBalance = +(currentSick - actualDeduction).toPrecision(4);
      } else if (targetBucket === 'casual') {
        const currentCasual = user.casualLeaveBalance || 0;
        actualDeduction = Math.min(targetDeduction, currentCasual);
        user.casualLeaveBalance = +(currentCasual - actualDeduction).toPrecision(4);
      }
    }

    await user.save();

    // Update attendance record with what we actually took
    attendance.leaveDeducted = actualDeduction;
    attendance.leaveDeductedType = actualDeduction > 0 ? targetBucket : 'none';
    await attendance.save();

    console.log(`SyncLeaveBalance: ${user.name} for ${attendance.date}. Status: ${attendance.status}, Deduction: ${actualDeduction} (${attendance.leaveDeductedType})`);
  } catch (error) {
    console.error('SyncLeaveBalance Error:', error.message);
  }
};

// Helper to cleanup stale sessions (any open session from previous days)
const cleanupStaleSessions = async (userId) => {
  try {
    const todayStr = getISTDateString();
    
    // Find all open sessions for this user
    const openSessions = await WorkSession.find({
      $or: [{ endTime: { $exists: false } }, { endTime: null }]
    }).populate('attendanceId');

    const staleSessions = openSessions.filter(s => 
      s.attendanceId && 
      (userId ? s.attendanceId.userId.toString() === userId.toString() : true) &&
      s.attendanceId.date < todayStr
    );

    if (staleSessions.length > 0) {
      console.log(`🧹 Cleanup: Closing ${staleSessions.length} stale sessions${userId ? ` for User ${userId}` : ' globally'}`);
    }

    for (const session of staleSessions) {
      const attendance = await Attendance.findById(session.attendanceId._id);
      if (attendance) {
        const uId = attendance.userId;
        // Close at end-of-day in IST, stored as correct UTC instant
        const manualEndTime = getISTEndOfDayUTC(attendance.date);
        
        session.endTime = manualEndTime;
        await session.save();

        attendance.checkOut = manualEndTime;
        
        // Recalculate total hours accurately
        const allSessions = await WorkSession.find({ attendanceId: attendance._id });
        let totalMs = 0;
        allSessions.forEach((s) => {
          const start = new Date(s.startTime);
          const end = s.endTime ? new Date(s.endTime) : manualEndTime;
          if (start && end) {
            totalMs += end - start;
          }
        });
        
        attendance.totalHours = +(totalMs / 3600000).toFixed(2);
        
        // Finalize status: If it was auto-checked out, it's strictly Absent 
        // unless you want to use the standard calculation. 
        // Most companies use Absent for missed checkouts.
        attendance.status = 'Absent';
        
        await attendance.save();
        await syncLeaveBalance(uId, attendance._id);
      }
    }
  } catch (error) {
    console.error('CleanupStaleSessions Error:', error.message);
  }
};

// @desc    Check-in for the day
// @route   POST /api/attendance/check-in
// @access  Private
exports.checkIn = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Cleanup old sessions first
    await cleanupStaleSessions(userId);

    const today = getISTDateString();
    let attendance = await Attendance.findOne({ userId, date: today });

    if (!attendance) {
      attendance = await Attendance.create({
        userId,
        date: today,
        checkIn: new Date(),
        status: '', // Empty initially, updated on checkOut or cleanup
      });
    } else {
      // If user checks in again (re-entry), clear stale checkout and status
      attendance.checkOut = undefined;
      attendance.status = '';
      await attendance.save();
    }

    // 2. Check for 3-session limit
    const sessionCount = await WorkSession.countDocuments({ attendanceId: attendance._id });
    if (sessionCount >= 3) {
      return res.status(400).json({
        message: 'Daily limit reached. You can only check in up to 3 times per day.',
      });
    }

    // Block duplicate open sessions for the same day
    const existingOpenSession = await WorkSession.findOne({
      attendanceId: attendance._id,
      $or: [{ endTime: { $exists: false } }, { endTime: null }]
    });

    if (existingOpenSession) {
      return res.status(400).json({
        message: 'You already have an active session. Please check out first.',
      });
    }

    // 3. Create a new work session start
    const workSession = await WorkSession.create({
      attendanceId: attendance._id,
      startTime: new Date(),
    });

    res.status(201).json({ attendance, workSession });
  } catch (error) {
    next(error);
  }
};

// @desc    Check-out (end current session)
// @route   PUT /api/attendance/check-out
// @access  Private
exports.checkOut = async (req, res, next) => {
  try {
    const today = getISTDateString();
    const userId = req.user._id;

    const attendance = await Attendance.findOne({ userId, date: today });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found for today' });
    }

    // Find the latest open work session
    const workSession = await WorkSession.findOne({
      attendanceId: attendance._id,
      $or: [{ endTime: { $exists: false } }, { endTime: null }],
    }).sort({ startTime: -1 });

    if (!workSession) {
      return res.status(400).json({ message: 'No active work session found' });
    }

    workSession.endTime = new Date();
    await workSession.save();

    // Calculate total hours for the day
    const allSessions = await WorkSession.find({ attendanceId: attendance._id });
    let totalMs = 0;
    allSessions.forEach((session) => {
      if (session.startTime && session.endTime) {
        totalMs += new Date(session.endTime) - new Date(session.startTime);
      }
    });

    const totalHours = +(totalMs / 3600000).toFixed(2);
    attendance.checkOut = new Date();
    attendance.totalHours = totalHours;

    const status = calculateStatus(attendance.date, totalHours);

    // Finalize status only if 'Present' OR it's the 3rd (last) checkout
    if (status === 'Present' || allSessions.length >= 3) {
      attendance.status = status;
    } else {
      attendance.status = ''; // Postpone status until midnight or 3rd session
    }

    await attendance.save();

    // Sync leave balance ONLY if status is finalized
    if (attendance.status !== '') {
      await syncLeaveBalance(userId, attendance._id);
    }

    res.json({ attendance, workSession });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's attendance for the logged-in user
// @route   GET /api/attendance/today
// @access  Private
exports.getTodayAttendance = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Cleanup old sessions to ensure UI is accurate
    await cleanupStaleSessions(userId);

    const today = getISTDateString();
    const attendance = await Attendance.findOne({ userId, date: today });

    // FIXED: If today's record has an Incorrect status ('Present' with 0h or 'Absent' incorrectly), clear it
    if (attendance && attendance.date === today) {
      if ((attendance.status === 'Present' && (attendance.totalHours || 0) === 0) || 
          (attendance.status === 'Absent' && (attendance.totalHours || 0) === 0)) {
        attendance.status = '';
        await attendance.save();
      }
    }

    const workSessions = attendance
      ? await WorkSession.find({ attendanceId: attendance._id })
      : [];

    res.json({ attendance, workSessions });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all attendance logs for the logged-in user
// @route   GET /api/attendance/logs
// @access  Private
exports.getMyLogs = async (req, res, next) => {
  try {
    const logs = await Attendance.find({ userId: req.user._id })
      .populate('userId', 'name email avatar')
      .populate('workSessions')
      .sort({ date: -1 });
    res.json(logs);
  } catch (error) {
    next(error);
  }
};
// @desc    Get all holidays
// @route   GET /api/attendance/holidays
// @access  Private
exports.getHolidays = async (req, res, next) => {
  try {
    const Holiday = require('../models/Holiday');
    const holidays = await Holiday.find({}).sort({ date: 1 });
    res.json(holidays);
  } catch (error) {
    next(error);
  }
};

exports.calculateStatus = calculateStatus;
exports.syncLeaveBalance = syncLeaveBalance;
exports.cleanupStaleSessions = cleanupStaleSessions;
