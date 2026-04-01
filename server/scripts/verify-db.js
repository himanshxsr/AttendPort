const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verify() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const count = await User.countDocuments({});
    require('fs').writeFileSync(path.join(__dirname, 'verify.txt'), 'User count: ' + count + ' at ' + new Date().toISOString());
    process.exit(0);
  } catch (e) {
    require('fs').writeFileSync(path.join(__dirname, 'verify.txt'), 'Error: ' + e.message);
    process.exit(1);
  }
}
verify();
