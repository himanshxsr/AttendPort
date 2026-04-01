const Payslip = require('../models/Payslip');
const User = require('../models/User');

// @desc    Generate or update a payslip (Admin)
// @route   POST /api/admin/generate-payslip
// @access  Private/Admin
exports.adminGeneratePayslip = async (req, res, next) => {
  try {
    let { 
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

    // If employeeDetails not provided, auto-capture from User profile
    if (!employeeDetails || Object.keys(employeeDetails).length === 0) {
      const user = await User.findById(userId);
      if (user) {
        employeeDetails = {
          pan: user.pan,
          sex: user.sex,
          designation: user.designation,
          accountNumber: user.accountNumber,
          location: user.location,
          pfAccountNumber: user.pfAccountNumber,
          joiningDate: user.joiningDate,
          pfUan: user.pfUAN,
          leavingDate: user.leavingDate,
          esiNumber: user.esiNumber,
          taxRegime: user.taxRegime,
          employeeCode: user.employeeCode,
        };
      }
    }

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
      .populate('userId', 'name email avatar')
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

// @desc    Delete a payslip (Admin)
// @route   DELETE /api/admin/payslip/:id
// @access  Private/Admin
exports.adminDeletePayslip = async (req, res, next) => {
  try {
    const payslip = await Payslip.findById(req.params.id);

    if (!payslip) {
      return res.status(404).json({ message: 'Payslip not found' });
    }

    await payslip.deleteOne();
    res.json({ message: 'Payslip deleted successfully' });
  } catch (error) {
    next(error);
  }
};
