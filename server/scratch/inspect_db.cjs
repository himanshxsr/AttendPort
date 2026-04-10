const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './server/.env' });

async function inspectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    const db = conn.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('--- Database Collections ---');
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`- ${coll.name}: ${count} documents`);
    }
    console.log('---------------------------');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

inspectDB();
