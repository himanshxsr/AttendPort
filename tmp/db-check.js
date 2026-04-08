const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const User = require('../server/models/User');

async function test() {
  let out = '';
  try {
    out += 'Connecting to: ' + process.env.MONGO_URI + '\n';
    await mongoose.connect(process.env.MONGO_URI);
    out += 'Connected\n';

    const usersWithEmptyCode = await User.find({ employeeCode: '' });
    out += 'Users with empty string employeeCode: ' + usersWithEmptyCode.length + '\n';
    usersWithEmptyCode.forEach(u => out += ' - ' + u.name + '\n');

    const allUsers = await User.find({});
    out += 'Total users in DB: ' + allUsers.length + '\n';
    
    // Check for Himanshu Aashish
    const h = allUsers.find(u => u.name.includes('Himanshu Aashish'));
    if (h) {
      out += 'Found Himanshu: ' + h.name + ' Code: ' + h.employeeCode + '\n';
    }

  } catch (err) {
    out += 'ERROR: ' + err.stack + '\n';
  } finally {
    await mongoose.disconnect();
    out += 'Disconnected\n';
    fs.writeFileSync(path.join(__dirname, 'db-results.txt'), out);
  }
}

test();
