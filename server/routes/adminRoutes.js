const express = require('express');
const router = express.Router();
const {
  getAllAttendance,
  getAllUsers,
  addEmployee,
  updateUserRole,
  softDeleteUser,
  getDeletedUsers,
  getHolidays,
  addHoliday,
  deleteHoliday,
  markManualAttendance,
  updateUserProfile,
} = require('../controllers/adminController');
const { getAllLeaves, updateLeaveStatus } = require('../controllers/leaveController');
const { adminGeneratePayslip, adminGetAllPayslips, adminDeletePayslip } = require('../controllers/payslipController');
const { protect, admin } = require('../middleware/authMiddleware');

// Middleware to ensure user is admin
router.use(protect);
router.use(admin);

router.get('/all-attendance', getAllAttendance);
router.get('/users', getAllUsers);
router.get('/deleted-users', getDeletedUsers);
router.post('/add-employee', addEmployee);
router.put('/update-role/:id', updateUserRole);
router.put('/update-profile/:id', updateUserProfile);
router.delete('/user/:id', softDeleteUser);

// Holiday routes
router.get('/holidays', getHolidays);
router.post('/holiday', addHoliday);
router.delete('/holiday/:id', deleteHoliday);

// Manual attendance
router.post('/manual-attendance', markManualAttendance);

// Leave Management (Admin)
router.get('/all-leaves', getAllLeaves);
router.put('/update-leave/:id', updateLeaveStatus);

// Payroll (Admin)
router.post('/generate-payslip', adminGeneratePayslip);
router.get('/all-payslips', adminGetAllPayslips);
router.delete('/payslip/:id', adminDeletePayslip);

module.exports = router;
