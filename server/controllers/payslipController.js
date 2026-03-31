const Payslip = require('../models/Payslip');
const User = require('../models/User');

// @desc    Generate or update a payslip (Admin)
// @route   POST /api/admin/generate-payslip
// @access  Private/Admin
exports.adminGeneratePayslip = async (req, res, next) => {
  try {
    const { 
      userId, 
      month, 
      year, 
      employeeDetails, 
      attendanceSummary, 
      earnings, 
      deductions, 
      leaveBalances, 
      netPayInWords 
    } = req.body;

    // Calculate totals automatically
    const totalEarnings = (earnings || []).reduce((acc, curr) => acc + (curr.total || 0), 0);
    const totalDeductions = (deductions || []).reduce((acc, curr) => acc + (curr.total || 0), 0);
    const netPay = totalEarnings - totalDeductions;

    // Find and update or create new
    const payslip = await Payslip.findOneAndUpdate(
      { userId, month, year },
      {
        employeeDetails,
        attendanceSummary,
        earnings,
        deductions,
        leaveBalances,
        totalEarnings,
        totalDeductions,
        netPay,
        netPayInWords
      },
      { upsert: true, new: true }
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
