const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Models
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payslip = require('../models/Payslip');
const WorkSession = require('../models/WorkSession');
const Holiday = require('../models/Holiday');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const ADMIN_EMAIL = 'himanshu@elisium.net';

async function resetDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected successfully.\n');

    console.log('--- Database Reset Summary ---');

    // 1. Attendance
    const attCount = await Attendance.countDocuments({});
    await Attendance.deleteMany({});
    console.log(`- Deleted ${attCount} Attendance records.`);

    // 2. Leaves
    const leaveCount = await Leave.countDocuments({});
    await Leave.deleteMany({});
    console.log(`- Deleted ${leaveCount} Leave requests.`);

    // 3. Payslips
    const payslipCount = await Payslip.countDocuments({});
    await Payslip.deleteMany({});
    console.log(`- Deleted ${payslipCount} Payslips.`);

    // 4. Work Sessions
    const wsCount = await WorkSession.countDocuments({});
    await WorkSession.deleteMany({});
    console.log(`- Deleted ${wsCount} WorkSessions.`);

    // 5. Users (Selective)
    const totalUsers = await User.countDocuments({});
    const deletedUsersResult = await User.deleteMany({ email: { $ne: ADMIN_EMAIL } });
    console.log(`- Deleted ${deletedUsersResult.deletedCount} Users (out of ${totalUsers}).`);
    
    // Ensure the Admin user is actually there
    const adminUser = await User.findOne({ email: ADMIN_EMAIL });
    if (adminUser) {
      console.log(`✅ Admin account "${ADMIN_EMAIL}" preserved.`);
    } else {
      console.warn(`⚠️  Warning: Admin account "${ADMIN_EMAIL}" was not found in the database. Please register this email to become the first Admin.`);
    }

    // 6. Holidays (Keeping them as requested)
    const holidayCount = await Holiday.countDocuments({});
    console.log(`- Preserved ${holidayCount} Holiday records for 2026.\n`);

    console.log('✅ Database reset complete. The portal is ready for live use from April 01, 2026.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database reset:', error);
    process.exit(1);
  }
}

resetDatabase();
