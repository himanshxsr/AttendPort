const User = require('../models/User');
const Attendance = require('../models/Attendance');

// @desc    Get all attendance logs (Admin)
// @route   GET /api/admin/all-attendance
// @access  Private/Admin
exports.getAllAttendance = async (req, res, next) => {
  try {
    const logs = await Attendance.find({})
      .populate('userId', 'name email')
      .sort({ date: -1 });
    res.json(logs);
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
  const { name, email, role } = req.body;

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
        await userExists.save();
        return res.status(200).json(userExists);
      }
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      role: role || 'Employee',
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
