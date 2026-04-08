const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const User = require('../server/models/User');

async function test() {
  let log = '';
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: 'anirudh.gupta1313@gmail.com' });
    if (!user) {
      log += 'User Anirudh not found\n';
    } else {
      log += `Testing update for ${user.name} (${user._id})\n`;
      user.bankName = 'Test Bank ' + Date.now();
      
      // Explicitly check for employeeCode conflict
      if (user.employeeCode === '') {
          log += 'Warning: User has empty string employeeCode!\n';
      }

      try {
        await user.save();
        log += 'Update SUCCESS\n';
      } catch (saveErr) {
        log += 'Update FAILED: ' + saveErr.message + '\n';
        if (saveErr.code === 11000) {
            log += 'Duplicate Key Error Details: ' + JSON.stringify(saveErr.keyValue) + '\n';
        }
      }
    }
  } catch (err) {
    log += 'Global ERROR: ' + err.stack + '\n';
  } finally {
    fs.writeFileSync(path.join(__dirname, 'update-error.txt'), log);
    await mongoose.disconnect();
  }
}

test();
