const User = require('../models/User');
const Attendance = require('../models/Attendance');
const WorkSession = require('../models/WorkSession');
const Holiday = require('../models/Holiday');

// Helper to generate a unique 4-digit employee code
const generateUniqueEmployeeCode = async () => {
  let isUnique = false;
  let code;
  while (!isUnique) {
    code = Math.floor(1000 + Math.random() * 9000).toString();
    const exists = await User.exists({ employeeCode: code });
    if (!exists) isUnique = true;
  }
  return code;
};

// @desc    Get all attendance logs (Admin)
// @route   GET /api/admin/all-attendance
// @access  Private/Admin
exports.getAllAttendance = async (req, res, next) => {
  try {
    const logs = await Attendance.find({})
      .populate('userId', 'name email avatar')
      .populate('workSessions')
      .sort({ date: -1 });

    // Fetch all active sessions (no endTime)
    const activeSessions = await WorkSession.find({ endTime: { $exists: false } });
    const activeAttendanceIds = new Set(activeSessions.map(s => s.attendanceId.toString()));

    // Virtualize logs: if an active session exists, treat checkOut as null for the UI
    const virtualizedLogs = logs.map(log => {
      const logObj = log.toObject();
      if (activeAttendanceIds.has(log._id.toString())) {
        logObj.checkOut = null;
        logObj.status = ''; // Clear status to allow 'ACTIVE' display in frontend
      }
      return logObj;
    });

    res.json(virtualizedLogs);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (Admin)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ isDeleted: { $ne: true } }).select('-password');
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Add new employee (Admin)
// @route   POST /api/admin/add-employee
// @access  Private/Admin
exports.addEmployee = async (req, res, next) => {
  const { name, email, role, avatar } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      if (userExists.isDeleted) {
        // Restore the user
        userExists.isDeleted = false;
        userExists.name = name;
        userExists.role = role || 'Employee';
        userExists.deletedBy = undefined;
        userExists.deletedAt = undefined;
        
        // If the user being restored lacks an employee code, generate one
        if (!userExists.employeeCode) {
          userExists.employeeCode = await generateUniqueEmployeeCode();
        }

        await userExists.save();
        return res.status(200).json(userExists);
      }
      return res.status(400).json({ message: 'User already exists' });
    }

    const employeeCode = await generateUniqueEmployeeCode();

    const user = await User.create({
      name,
      email,
      role: role || 'Employee',
      employeeCode,
      avatar,
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role (Admin)
// @route   PUT /api/admin/update-role/:id
// @access  Private/Admin
exports.updateUserRole = async (req, res, next) => {
  const { role } = req.body;

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete user (Admin)
// @route   DELETE /api/admin/user/:id
// @access  Private/Admin
exports.softDeleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't delete self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete yourself' });
    }

    user.isDeleted = true;
    user.deletedBy = req.user._id;
    user.deletedAt = Date.now();
    await user.save();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all deleted users (Admin)
// @route   GET /api/admin/deleted-users
// @access  Private/Admin
exports.getDeletedUsers = async (req, res, next) => {
  try {
    const users = await User.find({ isDeleted: true })
      .populate('deletedBy', 'name')
      .select('-password')
      .sort({ deletedAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// --- Holiday Management ---

// @desc    Get all holidays
// @route   GET /api/admin/holidays
// @access  Private/Admin
exports.getHolidays = async (req, res, next) => {
  try {
    const holidays = await Holiday.find({}).sort({ date: 1 });
    res.json(holidays);
  } catch (error) {
    next(error);
  }
};

// @desc    Add a holiday
// @route   POST /api/admin/holiday
// @access  Private/Admin
exports.addHoliday = async (req, res, next) => {
  const { date, name } = req.body;
  try {
    const holiday = await Holiday.create({
      date,
      name,
      createdBy: req.user._id,
    });
    res.status(201).json(holiday);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A holiday already exists for this date' });
    }
    next(error);
  }
};

// @desc    Delete a holiday
// @route   DELETE /api/admin/holiday/:id
// @access  Private/Admin
exports.deleteHoliday = async (req, res, next) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }
    res.json({ message: 'Holiday deleted' });
  } catch (error) {
    next(error);
  }
};

// --- Manual Attendance ---

// @desc    Mark user as present manually (Admin)
// @route   POST /api/admin/manual-attendance
// @access  Private/Admin
exports.markManualAttendance = async (req, res, next) => {
  const { userId, date, status } = req.body;
  try {
    let attendance = await Attendance.findOne({ userId, date });
    if (attendance) {
      attendance.status = status || 'Present';
      attendance.totalHours = status === 'Present' ? 9 : 0; // Default to full day if present
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        userId,
        date,
        status: status || 'Present',
        totalHours: status === 'Present' ? 9 : 0,
        checkIn: new Date(`${date}T09:00:00`), // Dummy check-in
        checkOut: new Date(`${date}T18:00:00`), // Dummy check-out
      });
    }
    res.json(attendance);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile details (Admin)
// @route   PUT /api/admin/update-profile/:id
// @access  Private/Admin
exports.updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profileFields = [
      'employeeCode', 'designation', 'location', 'pan', 'sex', 
      'accountNumber', 'bankName', 'pfAccountNumber', 'pfUAN', 
      'esiNumber', 'joiningDate', 'leavingDate', 'taxRegime',
      'casualLeaveBalance', 'sickLeaveBalance', 'avatar'
    ];

    profileFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();
    res.json(user);
  } catch (error) {
    next(error);
  }
};
