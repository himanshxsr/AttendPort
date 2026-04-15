const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

const parseYMD = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
};

const toYMD = (date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const eachDateInRange = (startDate, endDate) => {
  const s = parseYMD(startDate);
  const e = parseYMD(endDate);
  const start = new Date(Date.UTC(s.year, s.month - 1, s.day));
  const end = new Date(Date.UTC(e.year, e.month - 1, e.day));
  const dates = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(toYMD(d));
  }
  return dates;
};

// Helper to update leave balances month-over-month
const processLeaveAccrual = async (user) => {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  
  // Initialization for existing users who don't have these fields yet
  if (!user.lastLeaveAccrualDate) {
    user.casualLeaveBalance = 2;
    user.sickLeaveBalance = 2;
    user.lastLeaveAccrualDate = currentMonthStr;
    await user.save();
    return;
  }

  if (user.lastLeaveAccrualDate !== currentMonthStr) {
    const [lastYear, lastMonth] = user.lastLeaveAccrualDate.split('-').map(Number);
    const currYear = now.getFullYear();
    const currMonth = now.getMonth() + 1;
    
    // Calculate difference in months
    const monthsPassed = (currYear - lastYear) * 12 + (currMonth - lastMonth);

    if (monthsPassed > 0) {
      user.casualLeaveBalance += (monthsPassed * 2);
      user.sickLeaveBalance = 2; // Resets each month, no carry forward
      user.lastLeaveAccrualDate = currentMonthStr;
      await user.save();
    }
  }
};

// @desc    Apply for leave
// @route   POST /api/attendance/apply-leave
// @access  Private
exports.applyLeave = async (req, res, next) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    
    // Check if start is before end
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: 'Start date cannot be after end date' });
    }

    if (type === 'Half Day (Casual)' && startDate !== endDate) {
      return res.status(400).json({ message: 'Half Day leave must be on a single date' });
    }

    const leave = await Leave.create({
      userId: req.user._id,
      type,
      startDate,
      endDate,
      reason,
    });

    res.status(201).json(leave);
  } catch (error) {
    next(error);
  }
};

// @desc    Get my leaves
// @route   GET /api/attendance/my-leaves
// @access  Private
exports.getMyLeaves = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      await processLeaveAccrual(user);
    }
    const leaves = await Leave.find({ userId: req.user._id }).sort({ appliedAt: -1 });
    res.json({
      leaves,
      balances: {
        casual: user?.casualLeaveBalance || 0,
        sick: user?.sickLeaveBalance || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all leaves (Admin)
// @route   GET /api/admin/all-leaves
// @access  Private/Admin
exports.getAllLeaves = async (req, res, next) => {
  try {
    const leaves = await Leave.find({})
      .populate('userId', 'name email casualLeaveBalance sickLeaveBalance avatar')
      .sort({ appliedAt: -1 });
    res.json(leaves);
  } catch (error) {
    next(error);
  }
};

// @desc    Update leave status (Admin)
// @route   PUT /api/admin/update-leave/:id
// @access  Private/Admin
exports.updateLeaveStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    leave.status = status;
    leave.processedBy = req.user._id;
    leave.processedAt = Date.now();
    await leave.save();

    // If approved, update attendance records for those dates
    if (status === 'Approved') {
      const dates = eachDateInRange(leave.startDate, leave.endDate);
      
      // Iterate through each day in the range
      for (const dateStr of dates) {
        // Upsert attendance record for each day in range to mark as 'Leave' or 'Half Day'
        await Attendance.findOneAndUpdate(
          { userId: leave.userId, date: dateStr },
          { 
            status: leave.type === 'Half Day (Casual)' ? 'Half Day' : 'Leave', 
            totalHours: leave.type === 'Half Day (Casual)' ? 4.5 : 0 
          },
          { upsert: true, new: true }
        );
      }

      // SUBTRACT FROM BALANCE
      const user = await User.findById(leave.userId);
      if (user) {
        const days = dates.length;
        if (leave.type === 'Casual') {
          user.casualLeaveBalance = Math.max(0, user.casualLeaveBalance - days);
        } else if (leave.type === 'Half Day (Casual)') {
          user.casualLeaveBalance = Math.max(0, user.casualLeaveBalance - (days * 0.5));
        } else if (leave.type === 'Sick') {
          user.sickLeaveBalance = Math.max(0, user.sickLeaveBalance - days);
        }
        await user.save();
      }
    } else if (status === 'Rejected' || status === 'Pending') {
      // Logic for changing status from Approved back to something else
      // Ideally, recalculate attendance, but for now we focus on the approval flow
    }

    res.json(leave);
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel leave (User)
// @route   PUT /api/attendance/cancel-leave/:id
// @access  Private
exports.cancelLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Check ownership
    if (leave.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Check if it's already processed (only Allow if Pending or Approved)
    if (leave.status === 'Rejected' || leave.status === 'Cancelled') {
      return res.status(400).json({ message: `Cannot cancel a leave that is already ${leave.status}` });
    }

    // Restriction: Employees should not be able to cancel a leave that happened in the past
    // Only allow cancelling future leaves (start today or later)
    const todayStr = new Date().toISOString().split('T')[0];
    if (leave.startDate < todayStr) {
      return res.status(400).json({ message: 'Cannot cancel a leave that has already started or passed' });
    }

    const previousStatus = leave.status;
    leave.status = 'Cancelled';
    await leave.save();

    // Rollback logic for Approved leaves
    if (previousStatus === 'Approved') {
      const dates = eachDateInRange(leave.startDate, leave.endDate);
      const days = dates.length;

      // 1. Restore balance
      const user = await User.findById(leave.userId);
      if (user) {
        if (leave.type === 'Casual') {
          user.casualLeaveBalance += days;
        } else if (leave.type === 'Half Day (Casual)') {
          user.casualLeaveBalance += (days * 0.5);
        } else if (leave.type === 'Sick') {
          user.sickLeaveBalance += days;
        }
        await user.save();
      }

      // 2. Clear attendance markers
      for (const dateStr of dates) {
        // Delete the 'Leave' entry for this user on this date
        const statusToRemove = leave.type === 'Half Day (Casual)' ? 'Half Day' : 'Leave';
        await Attendance.findOneAndDelete({ userId: leave.userId, date: dateStr, status: statusToRemove });
      }
    }

    res.json({ message: 'Leave cancelled successfully', leave });
  } catch (error) {
    next(error);
  }
};
