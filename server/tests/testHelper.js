const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectTestDB = async () => {
  const uri = process.env.MONGO_URI_TEST || process.env.MONGO_URI.replace(/\/[^/]+$/, '/attendance_test');
  
  // If we're already connected, check if it's the test URI
  if (mongoose.connection.readyState !== 0) {
    const currentUri = mongoose.connection.getClient().s.url;
    if (currentUri.includes('attendance-portal')) {
       console.warn('⚠️ Alert: Was connected to production. Disconnecting...');
       await mongoose.disconnect();
    } else {
       return; // Already connected to test
    }
  }

  await mongoose.connect(uri);
  console.log(`Test MongoDB Connected: ${mongoose.connection.host} (DB: ${mongoose.connection.name})`);
};

const closeTestDB = async () => {
  await mongoose.connection.close();
};

const clearDatabase = async () => {
  // SAFETY CHECK: Never clear if DB name doesn't contain 'test'
  if (!mongoose.connection.name.toLowerCase().includes('test')) {
    throw new Error(`🚫 SAFETY STOP: Attempted to clear non-test database: ${mongoose.connection.name}`);
  }

  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
};

module.exports = { connectTestDB, closeTestDB, clearDatabase };
