const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });
const User = require('./server/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://himanshu:ElisiumSpace@cluster0.qutmnik.mongodb.net/attendance-portal?retryWrites=true&w=majority&appName=Cluster0';

const usersToUpdate = [
  { name: 'Vivek Jain', empNo: 'EMP001' },
  { name: 'Priyanshu Dash', empNo: 'EMP002' },
  { name: 'Himanshu Aashish', empNo: 'EMP003' },
  { name: 'Arbaz Arshad', empNo: 'EMP004' },
  { name: 'Anirudh Gupta', empNo: 'EMP005' },
  { name: 'Abhisha Oli', empNo: 'EMP006' },
];

async function updateUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    for (const item of usersToUpdate) {
      // Find user by name (case-insensitive)
      const user = await User.findOne({ name: { $regex: new RegExp(`^${item.name}$`, 'i') } });
      if (user) {
        user.employeeCode = item.empNo;
        await user.save();
        console.log(`Updated ${item.name} to ${item.empNo}`);
      } else {
        console.log(`User not found: ${item.name}`);
      }
    }

    console.log('Update complete');
    process.exit(0);
  } catch (error) {
    console.error('Error updating users:', error);
    process.exit(1);
  }
}

updateUsers();
