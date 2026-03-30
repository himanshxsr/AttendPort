const Payslip = require('../models/Payslip');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

// @desc    Generate a payslip (Admin)
// @route   POST /api/admin/generate-payslip
// @access  Private/Admin
exports.adminGeneratePayslip = async (req, res, next) => {
  try {
    const { userId, month, year, earnings, deductions, attendanceInfo } = req.body;

    // Calculate totals on server-side for security and accuracy
    const totalEarnings = earnings.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalDeductions = deductions.reduce((sum, item) => sum + Number(item.amount), 0);
    const netPay = totalEarnings - totalDeductions;

    // Upsert (Update if exists, otherwise Create)
    const payslip = await Payslip.findOneAndUpdate(
      { userId, month, year },
      {
        earnings,
        deductions,
        totalEarnings,
        totalDeductions,
        netPay,
        attendanceInfo,
        generatedAt: Date.now()
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json(payslip);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payslips (Admin)
// @route   GET /api/admin/all-payslips
// @access  Private/Admin
exports.adminGetAllPayslips = async (req, res, next) => {
  try {
    const payslips = await Payslip.find({})
      .populate('userId', 'name email')
      .sort({ year: -1, month: -1 });
    res.json(payslips);
  } catch (error) {
    next(error);
  }
};

// @desc    Get my payslips (User)
// @route   GET /api/attendance/my-payslips
// @access  Private
exports.getMyPayslips = async (req, res, next) => {
  try {
    const payslips = await Payslip.find({ userId: req.user._id })
      .sort({ year: -1, month: -1 });
    res.json(payslips);
  } catch (error) {
    next(error);
  }
};
