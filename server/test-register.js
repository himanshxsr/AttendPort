require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const testRegistration = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const userData = {
      name: 'Test Bug',
      email: `testbug${Date.now()}@example.com`,
      password: 'password123',
    };

    console.log('Creating user...');
    const user = await User.create(userData);
    console.log('User created:', user);

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error during registration test:', err);
    process.exit(1);
  }
};

testRegistration();
