const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Find a test user (Employee)
    console.log('Finding test employee...');
    const user = await User.findOne({ role: 'Employee', isDeleted: false });
    if (!user) {
      console.log('No test user found');
      process.exit(0);
    }
    console.log(`Found test user: ${user.name} (${user._id})`);

    // 2. Find an admin user
    console.log('Finding admin user...');
    const admin = await User.findOne({ role: 'Admin' });
    if (!admin) {
      console.log('No admin user found');
      process.exit(0);
    }
    console.log(`Found admin user: ${admin.name} (${admin._id})`);

    // 3. Mark user as deleted (simulating soft delete)
    user.isDeleted = true;
    user.deletedBy = admin._id;
    user.deletedAt = new Date();
    await user.save();
    console.log(`User ${user.name} marked as deleted`);

    // 4. Verify in deleted list
    const deletedUser = await User.findOne({ _id: user._id, isDeleted: true }).populate('deletedBy', 'name');
    console.log('Verification:');
    console.log(`- isDeleted: ${deletedUser.isDeleted}`);
    console.log(`- deletedBy.name: ${deletedUser.deletedBy.name}`);
    console.log(`- deletedAt: ${deletedUser.deletedAt}`);

    // 5. Restore user (cleanup)
    user.isDeleted = false;
    user.deletedBy = undefined;
    user.deletedAt = undefined;
    await user.save();
    console.log('User restored for cleanup');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

test();
