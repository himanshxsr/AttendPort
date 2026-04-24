const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error('MONGO_URI is missing. Backup aborted.');
  process.exit(1);
}

const run = async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupRoot = path.join(__dirname, '..', 'backups');
  const backupDir = path.join(backupRoot, `backup-${timestamp}`);

  fs.mkdirSync(backupDir, { recursive: true });

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  const manifest = {
    createdAt: new Date().toISOString(),
    database: db.databaseName,
    collections: []
  };

  for (const col of collections) {
    const name = col.name;
    const docs = await db.collection(name).find({}).toArray();
    const filePath = path.join(backupDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
    manifest.collections.push({ name, count: docs.length, file: `${name}.json` });
    console.log(`Backed up ${name}: ${docs.length} docs`);
  }

  fs.writeFileSync(
    path.join(backupDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  await mongoose.disconnect();
  console.log(`Backup complete: ${backupDir}`);
};

run().catch(async (err) => {
  console.error('Backup failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
