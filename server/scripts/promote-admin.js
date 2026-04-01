const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const TARGET_EMAIL = 'himanshu@elisium.net';

async function promoteAdmin() {
  try {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ Connected successfully.`);

    const user = await User.findOne({ email: TARGET_EMAIL });

    if (!user) {
      console.error(`❌ User not found: ${TARGET_EMAIL}. Please register first!`);
      process.exit(1);
    }

    if (user.role === 'Admin') {
      console.log(`ℹ️  User ${TARGET_EMAIL} is already an Admin.`);
      process.exit(0);
    }

    user.role = 'Admin';
    await user.save();

    console.log(`✅ User ${TARGET_EMAIL} has been promoted to 'Admin'.`);
    require('fs').writeFileSync(path.join(__dirname, '../../promote_success.txt'), 'SUCCESS at ' + new Date().toISOString());
    console.log(`⚠️  Please log out and log back in to see the changes.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during promotion:', error);
    process.exit(1);
  }
}

promoteAdmin();
