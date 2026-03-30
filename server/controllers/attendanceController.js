const Attendance = require('../models/Attendance');
const WorkSession = require('../models/WorkSession');

// Helper to cleanup stale sessions (> 24h)
const cleanupStaleSessions = async (userId) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find all open sessions for this user that started more than 24h ago
  const staleSessions = await WorkSession.find({
    $or: [{ endTime: { $exists: false } }, { endTime: null }],
    startTime: { $lt: twentyFourHoursAgo },
  }).populate('attendanceId');

  for (const session of staleSessions) {
    if (session.attendanceId && session.attendanceId.userId.toString() === userId.toString()) {
      const attendance = await Attendance.findById(session.attendanceId._id);
      if (attendance) {
        // If session was never closed, close it now
        session.endTime = session.startTime; // Or some other logic, but close it
        await session.save();

        // Recalculate total hours for the day including this session
        const allSessions = await WorkSession.find({ attendanceId: attendance._id });
        let totalMs = 0;
        allSessions.forEach((s) => {
          if (s.startTime && s.endTime) {
            totalMs += new Date(s.endTime) - new Date(s.startTime);
          }
        });
        const totalHours = +(totalMs / 3600000).toFixed(2);
        attendance.totalHours = totalHours;

        // Enforce company rules in cleanup
        // Use a more careful date parsing for day of week
        const [year, month, day] = attendance.date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon, ..., 3=Wed, 4=Thu

        if (dayOfWeek === 3) { // Wednesday
          attendance.status = totalHours < 3.5 ? 'Absent' : 'Present';
        } else if ([1, 2, 4, 5].includes(dayOfWeek)) { // Mon, Tue, Thu, Fri
          // 7h 29m (7.483h) to 8h borderline rule
          attendance.status = totalHours < 7.48 ? 'Absent' : 'Present';
        } else {
          attendance.status = 'Present'; // Weekends etc
        }
        
        await attendance.save();
      }
    }
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

    const today = new Date().toISOString().split('T')[0];
    let attendance = await Attendance.findOne({ userId, date: today });

    if (!attendance) {
      attendance = await Attendance.create({
        userId,
        date: today,
        checkIn: new Date(),
        status: '', // Empty initially, updated on checkOut or cleanup
      });
    }

    // 2. Check for 3-session limit
    const sessionCount = await WorkSession.countDocuments({ attendanceId: attendance._id });
    if (sessionCount >= 3) {
      return res.status(400).json({
        message: 'Daily limit reached. You can only check in up to 3 times per day.',
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
    const today = new Date().toISOString().split('T')[0];
    const userId = req.user._id;

    const attendance = await Attendance.findOne({ userId, date: today });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found for today' });
    }

    // Find the latest open work session
    const workSession = await WorkSession.findOne({
      attendanceId: attendance._id,
      endTime: { $exists: false },
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

    // Apply company rules:
    // Mon, Tue, Thu, Fri: < 7h = Absent
    // Wed: < 3.5h = Absent
    const dayOfWeek = new Date(attendance.date).getUTCDay(); // 0=Sun, 1=Mon, ..., 3=Wed
    
    if (dayOfWeek === 3) {
      // Wednesday
      attendance.status = totalHours < 3.5 ? 'Absent' : 'Present';
    } else if ([1, 2, 4, 5].includes(dayOfWeek)) {
      // Standard working days: 8h rule
      if (totalHours >= 8) {
        attendance.status = 'Present';
      } else if (totalHours >= 7.48) { // 7h 29m+
        attendance.status = ''; // Blank until next day cleanup
      } else {
        attendance.status = 'Absent';
      }
    } else {
      // Sat/Sun or other
      attendance.status = 'Present';
    }

    await attendance.save();

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

    const today = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.findOne({ userId, date: today });

    // FIX: If today exists and was incorrectly marked "Present" with 0 hours, clear it
    if (attendance && attendance.status === 'Present' && (attendance.totalHours || 0) === 0) {
      attendance.status = '';
      await attendance.save();
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
    const logs = await Attendance.find({ userId: req.user._id }).sort({ date: -1 });
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
