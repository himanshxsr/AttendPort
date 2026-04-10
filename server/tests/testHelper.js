const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectTestDB = async () => {
  const uri = process.env.MONGO_URI_TEST || process.env.MONGO_URI.replace(/\/[^/]+$/, '/attendance_test');
  
  if (mongoose.connection.readyState !== 0) {
    const currentUri = mongoose.connection.getClient().s.url;
    if (currentUri.includes('attendance-portal')) {
       console.warn('⚠️ Safety Alert: Was connected to production. Disconnecting...');
       await mongoose.disconnect();
    } else {
       return;
    }
  }

  await mongoose.connect(uri);
  console.log(`Test MongoDB Connected: ${mongoose.connection.host} (DB: ${mongoose.connection.name})`);
};

const closeTestDB = async () => {
  await mongoose.connection.close();
};

const clearDatabase = async () => {
  // CRITICAL SAFETY CHECK: Never clear unless DB name contains 'test'
  if (!mongoose.connection.name.toLowerCase().includes('test')) {
    const errorMsg = `🚫 CRITICAL SAFETY STOP: Attempted to run clearDatabase() on a potentially non-test database: ${mongoose.connection.name}. Execution halted to prevent data loss.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
};

module.exports = { connectTestDB, closeTestDB, clearDatabase };
