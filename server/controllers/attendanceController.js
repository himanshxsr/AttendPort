const Attendance = require('../models/Attendance');
const WorkSession = require('../models/WorkSession');

// Helper to cleanup stale sessions (> 24h)
const cleanupStaleSessions = async (userId) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find all open sessions for this user that started more than 24h ago
  const staleSessions = await WorkSession.find({
    endTime: { $exists: false },
    startTime: { $lt: twentyFourHoursAgo },
  }).populate('attendanceId');

  for (const session of staleSessions) {
    if (session.attendanceId && session.attendanceId.userId.toString() === userId.toString()) {
      // Mark attendance as Absent
      const attendance = await Attendance.findById(session.attendanceId._id);
      if (attendance) {
        attendance.status = 'Absent';
        attendance.totalHours = 0;
        await attendance.save();
      }

      // Close the session
      session.endTime = session.startTime; // Mark as closed at start time
      await session.save();
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
        status: 'Present',
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

    attendance.checkOut = new Date();
    attendance.totalHours = +(totalMs / 3600000).toFixed(2);
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
