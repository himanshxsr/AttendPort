const express = require('express');
const router = express.Router();
const { checkIn, checkOut, getTodayAttendance, getMyLogs, getHolidays } = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

router.post('/check-in', protect, checkIn);
router.put('/check-out', protect, checkOut);
router.get('/today', protect, getTodayAttendance);
router.get('/logs', protect, getMyLogs);
router.get('/holidays', protect, getHolidays);

module.exports = router;
