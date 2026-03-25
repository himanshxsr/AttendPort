const express = require('express');
const router = express.Router();
const {
  getAllAttendance,
  getAllUsers,
  addEmployee,
  updateUserRole,
  softDeleteUser,
  getDeletedUsers,
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/all-attendance', protect, admin, getAllAttendance);
router.get('/users', protect, admin, getAllUsers);
router.get('/deleted-users', protect, admin, getDeletedUsers);
router.post('/add-employee', protect, admin, addEmployee);
router.put('/update-role/:id', protect, admin, updateUserRole);
router.delete('/user/:id', protect, admin, softDeleteUser);

module.exports = router;
