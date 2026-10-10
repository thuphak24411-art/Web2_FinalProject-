const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const URI = "mongodb://127.0.0.1:27017";
const DB_NAME = "EcoCycleDatabase";
const EXPORT_DIR = path.join(__dirname, '..', '..', 'datasets');

async function exportAll() {
  const client = new MongoClient(URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collections = await db.listCollections().toArray();

    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }

    for (const col of collections) {
      const docs = await db.collection(col.name).find({}).toArray();
      const filePath = path.join(EXPORT_DIR, `${col.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
      console.log(`Đã xuất collection [${col.name}] (${docs.length} bản ghi) -> ${filePath}`);
    }
    console.log("Hoàn tất xuất toàn bộ cơ sở dữ liệu!");
  } catch (err) {
    console.error("Lỗi khi xuất dữ liệu:", err);
  } finally {
    await client.close();
  }
}

exportAll();
