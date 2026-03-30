const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');

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
    const leaves = await Leave.find({ userId: req.user._id }).sort({ appliedAt: -1 });
    res.json(leaves);
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
      .populate('userId', 'name email')
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
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      
      // Iterate through each day in the range
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        
        // Upsert attendance record for each day in range to mark as 'Leave'
        await Attendance.findOneAndUpdate(
          { userId: leave.userId, date: dateStr },
          { status: 'Leave', totalHours: 0 },
          { upsert: true, new: true }
        );
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
