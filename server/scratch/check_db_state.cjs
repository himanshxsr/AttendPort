const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config({ path: './server/.env' });

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to:', mongoose.connection.name);
    const count = await User.countDocuments({});
    console.log('User count:', count);
    
    if (count === 0) {
        console.warn('⚠️ WARNING: THE DATABASE IS EMPTY!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkDB();
