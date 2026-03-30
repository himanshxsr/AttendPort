const express = require('express');
const router = express.Router();
const {
  getAllAttendance,
  getAllUsers,
  addEmployee,
  updateUserRole,
  softDeleteUser,
  getDeletedUsers,
  addHoliday,
  deleteHoliday,
  getHolidays,
  markManualAttendance,
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/all-attendance', protect, admin, getAllAttendance);
router.get('/users', protect, admin, getAllUsers);
router.get('/deleted-users', protect, admin, getDeletedUsers);
router.post('/add-employee', protect, admin, addEmployee);
router.put('/update-role/:id', protect, admin, updateUserRole);
router.delete('/user/:id', protect, admin, softDeleteUser);

// Holiday routes
router.get('/holidays', protect, admin, getHolidays);
router.post('/holiday', protect, admin, addHoliday);
router.delete('/holiday/:id', protect, admin, deleteHoliday);

// Manual attendance
router.post('/manual-attendance', protect, admin, markManualAttendance);

module.exports = router;
