const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './server/.env' });

async function listDBs() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    const admin = conn.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('Available Databases:');
    dbs.databases.forEach(db => console.log(`- ${db.name}`));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

listDBs();
