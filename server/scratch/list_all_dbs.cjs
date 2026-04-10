const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listAll() {
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas.');
    
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    
    console.log('\n--- Available Databases ---');
    for (const dbInfo of dbs.databases) {
      console.log(`\n📂 Database: ${dbInfo.name}`);
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      for (const coll of collections) {
        const count = await db.collection(coll.name).countDocuments();
        console.log(`  - ${coll.name}: ${count} documents`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

listAll();
