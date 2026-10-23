require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { BSON } = require('mongodb');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e){}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DATABASE_NAME = process.env.MONGODB_DB_NAME || 'EcoCycleDatabase';
const DATA_DIRECTORY = path.join(__dirname, '..', '..', 'data');

const collectionFileMap = {
  users: 'users.json',
  products: 'products.json',
  sellOrders: 'sellOrders.json',
  repairOrders: 'repairOrders.json',
  productRequests: 'productRequests.json',
  invoices: 'invoices.json',
  greencoins: 'greencoins.json',
  carts: 'carts.json',
  notifications: 'notifications.json',
  AI_assessments: 'AI_assessments.json',
  reviews: 'reviews.json',
  chats: 'chats.json',
  messages: 'messages.json'
};

function readCollectionFile(collection, fileName) {
  const filePath = path.join(DATA_DIRECTORY, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`[Cảnh báo] Bỏ qua [${collection}], không tìm thấy: ${filePath}`);
    return [];
  }

  const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(rawData)) {
    throw new Error(`Dữ liệu [${fileName}] phải là một mảng JSON.`);
  }

  return rawData.map(doc => {
    if (doc._id && doc._id.$oid) {
      doc._id = doc._id.$oid;
    }
    return doc;
  });
}

async function importAll() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const database = client.db(DATABASE_NAME);
    console.log(`[Import] Đã kết nối tới MongoDB: ${DATABASE_NAME} (${MONGODB_URI.includes('localhost') || MONGODB_URI.includes('127.0.0.1') ? 'Localhost' : 'Cloud Atlas'})`);

    for (const [collection, fileName] of Object.entries(collectionFileMap)) {
      const documents = readCollectionFile(collection, fileName);
      if (documents.length === 0) continue;
      const target = database.collection(collection);

      await target.deleteMany({});
      await target.insertMany(documents, { ordered: true });
      console.log(`- Đã nạp [${collection}]: ${documents.length} bản ghi từ data/${fileName}`);
    }

    console.log(`[Hoàn tất] Toàn bộ dữ liệu đã được nạp thành công vào MongoDB: ${DATABASE_NAME}`);
  } catch (error) {
    console.error('[Lỗi import]:', error.message);
  } finally {
    await client.close();
  }
}

importAll();
