const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const URI = "mongodb://127.0.0.1:27017";
const DB_NAME = "EcoCycleDatabase";
const DATA_DIR = path.join(__dirname, '..', '..', 'datasets');

const collectionFileMap = {
  'users': 'users-new.json',
  'products': 'products-new.json',
  'sellOrders': 'productOrders.json',
  'repairOrders': 'repairOrders.json',
  'recycleOrders': 'recycleOders.json',
  'invoices': 'invoices.json',
  'greencoins': 'greenCoins-new.json',
  'carts': 'carts.json',
  'notifications': 'notifications.json',
  'AI_assessments': 'AI_assessments-new.json',
  'reviews': 'reviews.json',
  'chats': 'chats.json',
  'messages': 'messages.json'
};

async function importAll() {
  const client = new MongoClient(URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    for (const [colName, fileName] of Object.entries(collectionFileMap)) {
      const filePath = path.join(DATA_DIR, fileName);
      const fallbackPath = path.join(DATA_DIR, `${colName}.json`);
      
      let targetPath = fs.existsSync(filePath) ? filePath : (fs.existsSync(fallbackPath) ? fallbackPath : null);

      if (targetPath) {
        const raw = fs.readFileSync(targetPath, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) {
          await db.collection(colName).deleteMany({});
          await db.collection(colName).insertMany(data);
          console.log(`Đã nạp [${colName}] (${data.length} bản ghi) từ ${path.basename(targetPath)}`);
        }
      } else {
        console.warn(`Không tìm thấy file cho collection [${colName}]`);
      }
    }
    console.log("Hoàn tất nạp toàn bộ 13 collections vào EcoCycleDatabase!");
  } catch (err) {
    console.error("Lỗi khi nạp dữ liệu:", err);
  } finally {
    await client.close();
  }
}

importAll();
