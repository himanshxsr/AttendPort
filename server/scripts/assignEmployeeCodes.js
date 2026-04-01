const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
const envLocalPath = path.join(__dirname, '../.env.local');
const envPath = path.join(__dirname, '../.env');
console.log('📂 Looking for .env at:', envPath);
dotenv.config({ path: envLocalPath });
dotenv.config({ path: envPath });

const User = require('../models/User');
const connectDB = require('../config/db');

// Helper to generate a unique 4-digit employee code
const generateUniqueEmployeeCode = async () => {
  let isUnique = false;
  let code;
  while (!isUnique) {
    code = Math.floor(1000 + Math.random() * 9000).toString();
    const exists = await User.exists({ employeeCode: code });
    if (!exists) isUnique = true;
  }
  return code;
};

const migrate = async () => {
  try {
    await connectDB();

    console.log('🔍 Searching for users without employee codes...');
    const usersToUpdate = await User.find({
      $or: [
        { employeeCode: { $exists: false } },
        { employeeCode: null },
        { employeeCode: '' }
      ]
    });

    console.log(`📊 Found ${usersToUpdate.length} users to update.`);

    if (usersToUpdate.length === 0) {
      console.log('✅ No users need updating.');
      process.exit(0);
    }

    let updatedCount = 0;
    for (const user of usersToUpdate) {
      const newCode = await generateUniqueEmployeeCode();
      user.employeeCode = newCode;
      await user.save();
      updatedCount++;
      console.log(`✨ [${updatedCount}/${usersToUpdate.length}] Assigned ${newCode} to ${user.name} (${user.email})`);
    }

    console.log(`\n🎉 Success! Updated ${updatedCount} users.`);
    
    // Final verification: check for duplicates
    const allCodes = await User.find({ employeeCode: { $exists: true, $ne: null } }).select('employeeCode');
    const codeSet = new Set(allCodes.map(u => u.employeeCode));
    
    if (codeSet.size !== allCodes.length) {
      console.warn('⚠️ Warning: Potential duplicate codes detected in final check. Please investigate.');
    } else {
      console.log('✅ Final uniqueness check passed.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

migrate();
