require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DATABASE_NAME = process.env.MONGODB_DB_NAME || 'EcoCycleDatabase';
const DATA_DIRECTORY = path.join(__dirname, 'data');

const collectionFileMap = {
  users: 'users.json',
  products: 'products.json',
  sellOrders: 'sellOrders.json',
  orders: 'orders.json',
  repairOrders: 'repairOrders.json',
  recycleOrders: 'recycleOrders.json',
  invoices: 'invoices.json',
  greencoins: 'greencoins.json',
  carts: 'carts.json',
  notifications: 'notifications.json',
  AI_assessments: 'AI_assessments.json',
  reviews: 'reviews.json',
  chats: 'chats.json',
  messages: 'messages.json'
};

const indexMap = {
  users: [
    { key: { userID: 1 }, options: { unique: true, sparse: true } },
    { key: { email: 1 }, options: { unique: true, sparse: true } },
    { key: { userName: 1 }, options: { unique: true, sparse: true } }
  ],
  sellOrders: [{ key: { orderID: 1 }, options: { unique: true, sparse: true } }],
  orders: [{ key: { orderId: 1 }, options: { unique: true, sparse: true } }],
  repairOrders: [{ key: { repairOrderID: 1 }, options: { unique: true, sparse: true } }],
  recycleOrders: [{ key: { recycleOrderID: 1 }, options: { unique: true, sparse: true } }],
  invoices: [{ key: { invoiceID: 1 }, options: { unique: true, sparse: true } }],
  greencoins: [{ key: { transactionID: 1 }, options: { unique: true, sparse: true } }],
  carts: [{ key: { userId: 1 }, options: { unique: true, sparse: true } }],
  notifications: [{ key: { notificationID: 1 }, options: { sparse: true } }],
  AI_assessments: [{ key: { assessmentID: 1 }, options: { unique: true, sparse: true } }],
  reviews: [{ key: { reviewID: 1 }, options: { unique: true, sparse: true } }],
  chats: [{ key: { chatID: 1 }, options: { unique: true, sparse: true } }],
  messages: [{ key: { messageID: 1 }, options: { unique: true, sparse: true } }]
};

function readCollectionFile(collection, fileName) {
  const filePath = path.join(DATA_DIRECTORY, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy dữ liệu cho [${collection}]: ${filePath}`);
  }

  const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(rawData)) {
    throw new Error(`Dữ liệu [${fileName}] phải là một mảng JSON.`);
  }

  // Convert MongoDB Extended JSON ($oid, $date, ...) without changing document fields.
  return EJSON.parse(JSON.stringify(rawData), { relaxed: false });
}

async function importAll() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const database = client.db(DATABASE_NAME);

    for (const [collection, fileName] of Object.entries(collectionFileMap)) {
      const documents = readCollectionFile(collection, fileName);
      const target = database.collection(collection);

      await target.deleteMany({});
      if (documents.length > 0) {
        await target.insertMany(documents, { ordered: true });
      }

      for (const index of indexMap[collection] || []) {
        try {
          await target.createIndex(index.key, index.options);
        } catch (error) {
          const isExistingIndexConflict =
            error.codeName === 'IndexOptionsConflict' ||
            error.code === 85 ||
            error.code === 86 ||
            error.message.includes('same name as the requested index');
          if (!isExistingIndexConflict) {
            throw error;
          }
          console.warn(`Giữ nguyên index hiện có trên [${collection}] cho khóa ${JSON.stringify(index.key)}`);
        }
      }

      console.log(`Đã nạp ${collection}: ${documents.length} bản ghi từ data/${fileName}`);
    }

    console.log(`Hoàn tất tạo/cập nhật database MongoDB: ${DATABASE_NAME}`);
  } catch (error) {
    console.error(`Lỗi nạp dữ liệu vào MongoDB: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

importAll();
