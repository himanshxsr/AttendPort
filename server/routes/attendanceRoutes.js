const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyLogs,
  getHolidays,
} = require('../controllers/attendanceController');
const { applyLeave, getMyLeaves, cancelLeave } = require('../controllers/leaveController');
const { getMyPayslips } = require('../controllers/payslipController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/check-in', checkIn);
router.put('/check-out', checkOut);
router.get('/today', getTodayAttendance);
router.get('/logs', getMyLogs);
router.get('/holidays', getHolidays);

// Leave management (User)
router.post('/apply-leave', applyLeave);
router.get('/my-leaves', getMyLeaves);
router.put('/cancel-leave/:id', cancelLeave);

// Payroll (User)
router.get('/my-payslips', getMyPayslips);

module.exports = router;
