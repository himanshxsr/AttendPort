const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const email = 'himanshu@elisium.net';
    const user = await User.findOne({ email });
    
    if (user) {
      console.log(`User found: ${user.email}`);
      console.log(`Current Role: ${user.role}`);
      console.log(`User ID: ${user._id}`);
    } else {
      console.log(`User NOT found: ${email}`);
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
checkUser();
