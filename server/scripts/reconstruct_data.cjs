const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Models
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const WorkSession = require('../models/WorkSession');

dotenv.config({ path: path.join(__dirname, '../.env') });

const diagnosticData = require('../diagnostic_dump.json');

const usersToRestore = [
  { name: 'Vivek Jain', employeeCode: 'EMP001', email: 'vivek.jain@elisium.net', role: 'Employee' },
  { name: 'Priyanshu Dash', employeeCode: 'EMP002', email: 'priyanshu.dash@elisium.net', role: 'Employee' },
  { name: 'Himanshu Aashish', employeeCode: 'EMP003', email: 'himanshu@elisium.net', role: 'Admin' },
  { name: 'Arbaz Arshad', employeeCode: 'EMP004', email: 'arbaz.arshad@elisium.net', role: 'Employee' },
  { name: 'Anirudh Gupta', employeeCode: 'EMP005', email: 'anirudh.gupta1313@gmail.com', role: 'Employee' },
  { name: 'Abhisha Oli', employeeCode: 'EMP006', email: 'oliabhisha@gmail.com', role: 'Employee' },
];

async function restore() {
  try {
    console.log('🔄 Starting Data Reconstruction...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to Atlas.');

    const userMap = {}; // OriginalID -> NewID

    // 1. Restore Users
    console.log('\n👥 Restoring Users...');
    for (const userData of usersToRestore) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        user = await User.create({
          ...userData,
          casualLeaveBalance: 2,
          sickLeaveBalance: 2
        });
        console.log(`- Created User: ${user.name} (${user.email})`);
      } else {
        console.log(`- User already exists: ${user.name}`);
      }
      
      // Specifically map Himanshu to his diagnostic ID for log linking
      if (user.email === 'himanshu@elisium.net') {
          userMap['69c2623dd9cf7b7d91f753ac'] = user._id;
      }
    }

    // 2. Restore Logs from diagnostic_dump.json
    console.log('\n📅 Restoring Attendance Logs...');
    const targetUserId = userMap['69c2623dd9cf7b7d91f753ac'];
    
    if (targetUserId) {
        let logCount = 0;
        for (const entry of diagnosticData) {
            const { attendance, sessions } = entry;
            
            // Check if record already exists for this date
            const exists = await Attendance.findOne({ userId: targetUserId, date: attendance.date });
            if (exists) continue;

            // Create Attendance
            const newAttendance = await Attendance.create({
                userId: targetUserId,
                date: attendance.date,
                checkIn: attendance.checkIn,
                checkOut: attendance.checkOut,
                totalHours: attendance.totalHours,
                status: attendance.status || 'Present',
                leaveDeducted: attendance.leaveDeducted || 0
            });

            // Create sessions
            for (const session of sessions) {
                await WorkSession.create({
                    attendanceId: newAttendance._id,
                    startTime: session.startTime,
                    endTime: session.endTime
                });
            }
            logCount++;
            console.log(`- Restored logs for ${attendance.date}`);
        }
        console.log(`✅ Successfully restored ${logCount} attendance days.`);
    } else {
        console.warn('⚠️ Could not map userId for logs. Skipping attendance restoration.');
    }

    console.log('\n✨ Reconstruction COMPLETE. Please verify in the Portal.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Reconstruction FAILED:', err);
    process.exit(1);
  }
}

restore();
