const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const User = require('../server/models/User');

async function test() {
  try {
    console.log('Connecting to:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected');

    const user = await User.findOne({ name: 'Himanshu Aashish' });
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User found:', user.name, 'Bank:', user.bankName);
    
    // Simulate what the admin controller does
    const profileFields = [
      'employeeCode', 'designation', 'location', 'pan', 'sex', 
      'accountNumber', 'bankName', 'pfAccountNumber', 'pfUAN', 
      'esiNumber', 'joiningDate', 'leavingDate', 'taxRegime',
      'casualLeaveBalance', 'sickLeaveBalance', 'avatar',
      'emergencyContact', 'bloodGroup'
    ];

    const mockBody = {
      bankName: 'Repro Bank ' + Date.now(),
      employeeCode: user.employeeCode,
      // Include some other fields
      designation: user.designation
    };

    profileFields.forEach(field => {
      if (mockBody[field] !== undefined) {
        user[field] = mockBody[field];
      }
    });

    console.log('Attempting save...');
    await user.save();
    console.log('Save successful!');

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

test();
