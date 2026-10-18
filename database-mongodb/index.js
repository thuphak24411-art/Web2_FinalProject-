require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const createAuthRouter = require('./auth.routes');
const { TWO_ACTIONS, buildMarketPriceReferences, requestAssessment } = require('./ai-assessment.service');
const { normalizeRepairOrderStatus } = require('./repair-status');

const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore DNS override errors if in restricted environment
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: '14mb' }));

const URI = process.env.MONGODB_URI || "mongodb+srv://tuongvck24411_db_user:d71kcLaJwNeHBqWt@cluster0.vshnczr.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(URI);
const DB_NAME = process.env.MONGODB_DB_NAME || "EcoCycleDatabase";
const JWT_SECRET = process.env.JWT_SECRET || "ecocycle-jwt-secret-key-2026";

async function ensureIndexes() {
  const db = client.db(DB_NAME);
  try {
    const users = db.collection('users');
    const userIndexes = await users.listIndexes().toArray();
    const emailIndex = userIndexes.find(index => index.key && index.key.email === 1);
    if (!emailIndex) {
      await users.createIndex(
        { email: 1 },
        { unique: true, sparse: true, name: 'unique_user_email' }
      );
    }

    const sellOrders = db.collection('sellOrders');
    const sellIndexes = await sellOrders.listIndexes().toArray();
    const custIndex = sellIndexes.find(index => index.key && index.key.customerID === 1);
    if (!custIndex) {
      await sellOrders.createIndex({ customerID: 1, createdAt: -1 });
    }

    const products = db.collection('products');
    const prodIndexes = await products.listIndexes().toArray();
    const prodIdIndex = prodIndexes.find(index => index.key && index.key["Products.id"] === 1);
    if (!prodIdIndex) {
      await products.createIndex({ "Products.id": 1 });
    }
  } catch (err) {
    console.warn("Lỗi kiểm tra/tạo index (tiếp tục chạy):", err.message);
  }
}

client.connect()
  .then(async () => {
    await ensureIndexes();
    app.use('/api/auth', createAuthRouter(client.db(DB_NAME)));
    registerRepairRoutes();
    console.log(`Đã kết nối thành công tới MongoDB (${DB_NAME})`);
    app.listen(PORT, () => {
      console.log(`Server MongoDB EcoCycleDatabase đang chạy tại http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("Lỗi kết nối MongoDB:", err);
    process.exitCode = 1;
  });

function getCollection(collectionName) {
  return client.db(DB_NAME).collection(collectionName);
}

function authenticate(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'Bạn cần đăng nhập.' });
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ.' });
  }
}

function requireAdmin(req, res, next) {
  if (!['ADMIN', 'TECHNICIAN'].includes(req.auth?.role)) {
    return res.status(403).json({ message: 'Bạn không có quyền quản lý sửa chữa.' });
  }
  next();
}

app.get('/api/admin/users', authenticate, requireAdmin, async (_req, res) => {
  try {
    const users = await getCollection('users').find(
      {},
      { projection: { password: 0 } }
    ).sort({ joinDate: -1, _id: -1 }).toArray();
    res.status(200).json({ users });
  } catch (err) {
    console.error('Lỗi khi tải danh sách tài khoản admin:', err);
    res.status(500).json({ message: 'Không thể tải danh sách tài khoản.' });
  }
});

app.get('/api/admin/orders', authenticate, requireAdmin, async (_req, res) => {
  try {
    const orders = await getCollection('orders').find({})
      .sort({ createdAt: -1, _id: -1 })
      .toArray();
    res.status(200).json({ orders });
  } catch (err) {
    console.error('Lỗi khi tải danh sách đơn hàng admin:', err);
    res.status(500).json({ message: 'Không thể tải danh sách đơn hàng.' });
  }
});

app.get('/api/admin/reports', authenticate, requireAdmin, async (_req, res) => {
  try {
    const [orders, users] = await Promise.all([
      getCollection('orders').find({}).toArray(),
      getCollection('users').find({}, { projection: { greenCoins: 1, eWasteRecycledKg: 1 } }).toArray()
    ]);
    const cancelledStatuses = ['Đã hủy', 'Đã huỷ'];
    const activeOrders = orders.filter(order => !cancelledStatuses.includes(order.status));
    const parseAmount = value => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      return Number(String(value || '').replace(/[^\d.-]/g, '')) || 0;
    };
    const totalRevenue = activeOrders.reduce((sum, order) => sum + parseAmount(order.totalPrice), 0);
    const totalProductsSold = activeOrders.reduce((sum, order) =>
      sum + (order.products || order.items || []).reduce((productSum, product) =>
        productSum + (Number(product.quantity) || 0), 0), 0);
    const totalGreenCoins = users.reduce((sum, user) => sum + (Number(user.greenCoins) || 0), 0);
    const totalEWasteRecycledKg = users.reduce((sum, user) => sum + (Number(user.eWasteRecycledKg) || 0), 0);

    res.status(200).json({
      totalRevenue,
      totalOrdersSold: activeOrders.length,
      totalProductsSold,
      totalGreenCoins,
      totalEWasteRecycledKg,
      totalCo2Reduced: totalEWasteRecycledKg * 100
    });
  } catch (err) {
    console.error('Lỗi khi tải báo cáo admin:', err);
    res.status(500).json({ message: 'Không thể tải báo cáo tổng quan.' });
  }
});

app.patch('/api/admin/users/:userID/green-coins', authenticate, requireAdmin, async (req, res) => {
  try {
    const recycledKg = Number(req.body?.recycledKg);
    const amount = recycledKg * 1000;
    if (!Number.isFinite(recycledKg) || recycledKg <= 0 ||
      !Number.isSafeInteger(amount) || amount > 1000000000) {
      return res.status(400).json({ message: 'Khối lượng tái chế hoặc số GreenCoin không hợp lệ.' });
    }

    const users = getCollection('users');
    const targetUser = await users.findOne(
      { userID: req.params.userID },
      { projection: { role: 1 } }
    );
    if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    if (targetUser.role !== 'CUSTOMER') {
      return res.status(400).json({ message: 'Chỉ tài khoản CUSTOMER mới được thêm GreenCoin.' });
    }
    const result = await users.findOneAndUpdate(
      { userID: req.params.userID },
      { $inc: { greenCoins: amount, eWasteRecycledKg: recycledKg } },
      { returnDocument: 'after', projection: { password: 0 } }
    );
    if (!result) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    res.status(200).json({ user: result, amount, recycledKg });
  } catch (err) {
    console.error('Lỗi khi thêm GreenCoin cho tài khoản:', err);
    res.status(500).json({ message: 'Không thể cập nhật GreenCoin.' });
  }
});

async function hydrateRepairOrder(order) {
  const users = getCollection('users');
  const assessments = getCollection('AI_assessments');
  const customer = order.customerID
    ? await users.findOne({ userID: order.customerID }, { projection: { password: 0 } })
    : null;
  const rawHistory = await assessments.find({
    $or: [
      { repairOrderID: order.repairOrderID },
      ...(order.requestID ? [{ requestID: order.requestID }] : [])
    ]
  }).sort({ createdAt: -1, _id: -1 }).toArray();
  const history = rawHistory.map(normalizeAssessment);
  const latestAssessment = history[0] || null;
  return {
    ...order,
    deviceName: order.deviceName || latestAssessment?.deviceName || latestAssessment?.productInfo?.productName || 'Thiết bị cần sửa',
    deviceType: order.deviceType || latestAssessment?.deviceType || '',
    issueDescription: order.issueDescription || latestAssessment?.summary || latestAssessment?.productInfo?.condition || '',
    status: normalizeRepairOrderStatus(order),
    specialistAssessment: order.specialistAssessment
      ? {
          ...order.specialistAssessment,
          recommendations: {
            repair: order.specialistAssessment.recommendations?.repair,
            resell: order.specialistAssessment.recommendations?.resell
          },
          estimatedPrices: {
            repair: order.specialistAssessment.estimatedPrices?.repair,
            resell: order.specialistAssessment.estimatedPrices?.resell
          }
        }
      : undefined,
    customer,
    aiAssessmentHistory: history,
    assessment: order.assessment || latestAssessment
  };
}

function normalizeAssessment(assessment) {
  const productInfo = assessment.productInfo || {};
  const hasAiResult = assessment.source === 'gemini' || assessment.source === 'cache';
  const safeAssessment = { ...assessment };
  delete safeAssessment.error;
  const repair = Number.parseInt(String(assessment.estimatedRepairCost || '').replace(/[^\d]/g, ''), 10) || null;
  const resale = Number.parseInt(String(assessment.estimatedResalePrice || '').replace(/[^\d]/g, ''), 10) || null;
  const estimate = (amountVnd, rationale) => ({
    amountVnd,
    currency: 'VND',
    display: amountVnd === null ? 'Chưa có dữ liệu định giá' : `${amountVnd.toLocaleString('vi-VN')} VNĐ`,
    rationale
  });
  const existingRecommendations = assessment.recommendations || {};
  const existingPrices = assessment.estimatedPrices || {};
  return {
    ...safeAssessment,
    recommendations: {
      repair: existingRecommendations.repair,
      resell: existingRecommendations.resell
    },
    repairOrderID: assessment.repairOrderID || null,
    deviceName: assessment.deviceName || productInfo.productName || '',
    summary: hasAiResult
      ? assessment.summary || productInfo.condition || ''
      : 'Chưa có kết quả đánh giá tự động.',
    recommendation: assessment.recommendation || assessment.recommendedAction || '',
    estimatedPrice: assessment.estimatedPrice || assessment.estimatedRepairCost || 'Chưa có dữ liệu định giá',
    estimatedPrices: {
      repair: existingPrices.repair || estimate(repair, 'Chi phí sửa chữa tham khảo từ dữ liệu đánh giá.'),
      resell: existingPrices.resell || estimate(resale, 'Giá bán lại tham khảo từ dữ liệu đánh giá.')
    },
    status: hasAiResult ? assessment.status || 'Đã đánh giá' : 'Lỗi đánh giá Gemini',
    createdAt: assessment.createdAt || new Date().toISOString()
  };
}

async function processRepairAssessment(order) {
  const assessment = await requestAssessment({
    ...order,
    marketPriceReferences: await findRepairMarketPriceReferences(order)
  }, {
    userID: order.customerID,
    apiKey: process.env.GEMINI_API_KEY || 'AIzaSyCJ9sKKSpGjPQT_mdaVyE4-E_6flHMlcYE'
  });
  const hasAiResult = assessment.source === 'gemini' || assessment.source === 'cache';
  await getCollection('AI_assessments').insertOne({
    ...assessment,
    repairOrderID: order.repairOrderID,
    requestID: order.requestID
  });
  const assessmentCompletedAt = new Date().toISOString();
  const repairOrderUpdate = {
    aiAssessmentStatus: hasAiResult ? assessment.status : 'Lỗi đánh giá Gemini',
    updatedAt: assessmentCompletedAt
  };
  const transition = await getCollection('repairOrders').updateOne(
    {
      _id: order._id,
      specialistAssessment: { $exists: false },
      userChoice: { $exists: false },
      status: { $in: ['Chờ xác nhận', 'Chờ chuyên gia đánh giá'] }
    },
    {
      $set: repairOrderUpdate
    }
  );
  const notifications = [createRepairNotification(
    order.customerID,
    hasAiResult ? 'Đã có kết quả đánh giá Gemini' : 'Chưa thể hoàn tất đánh giá thiết bị',
    hasAiResult
      ? `Gemini đã hoàn tất đánh giá và định giá tham khảo cho yêu cầu ${order.repairOrderID}.`
      : `Yêu cầu ${order.repairOrderID} chưa có kết quả đánh giá tự động. Bạn có thể thử gửi đánh giá lại từ lịch sử yêu cầu.`,
    order.repairOrderID
  )];
  if (hasAiResult && transition.matchedCount) {
    notifications.push(notifyRepairManagers(
      'Yêu cầu sửa chữa cần chuyên gia đánh giá',
      `Gemini đã hoàn tất đánh giá yêu cầu ${order.repairOrderID}. Vui lòng mở yêu cầu và điền nhận xét cho hai phương án: sửa chữa và bán lại.`,
      order.repairOrderID
    ));
  }
  await sendRepairNotifications(notifications, `Lỗi thông báo khi hoàn tất AI ${order.repairOrderID}`);
  return assessment;
}

function queueRepairAssessment(order) {
  setImmediate(async () => {
    try {
      await processRepairAssessment(order);
    } catch (error) {
      console.error(`Lỗi xử lý Gemini nền cho ${order.repairOrderID}:`, error);
      try {
        const failedAt = new Date().toISOString();
        const failed = await getCollection('repairOrders').updateOne(
          { _id: order._id, aiAssessmentStatus: 'Đang đánh giá bằng Gemini' },
          { $set: { aiAssessmentStatus: 'Lỗi đánh giá Gemini', updatedAt: failedAt } }
        );
        if (failed.matchedCount) {
          await sendRepairNotifications([
            createRepairNotification(
              order.customerID,
              'Chưa thể hoàn tất đánh giá thiết bị',
              `Yêu cầu ${order.repairOrderID} chưa thể được Gemini phân tích. Bạn có thể thử gửi đánh giá lại từ lịch sử yêu cầu.`,
              order.repairOrderID
            ),
            notifyRepairManagers(
              'Đánh giá Gemini gặp lỗi',
              `Yêu cầu ${order.repairOrderID} chưa hoàn tất phân tích tự động. Vui lòng kiểm tra lại yêu cầu.`,
              order.repairOrderID
            )
          ], `Lỗi thông báo khi Gemini thất bại ${order.repairOrderID}`);
        }
      } catch (recoveryError) {
        console.error(`Không thể cập nhật trạng thái lỗi Gemini ${order.repairOrderID}:`, recoveryError);
      }
    }
  });
}

async function findRepairMarketPriceReferences(order) {
  const categories = await getCollection('products')
    .find({}, { projection: { CateName: 1, Products: 1 } })
    .toArray();
  return buildMarketPriceReferences(categories, order);
}

async function createRepairNotification(userID, title, content, targetID, type = 'repair') {
  if (!userID) return;
  await getCollection('notifications').insertOne({
    notificationID: `NT${Date.now()}${Math.floor(Math.random() * 1000)}`,
    userID,
    type,
    title,
    content,
    targetID,
    isRead: false,
    createdAt: new Date().toISOString()
  });
}

async function notifyRepairManagers(title, content, targetID) {
  const managers = await getCollection('users')
    .find({ role: { $in: ['ADMIN', 'TECHNICIAN'] } }, { projection: { userID: 1 } })
    .toArray();
  await Promise.all(managers.map(manager =>
    createRepairNotification(manager.userID, title, content, targetID, 'repair_admin')
  ));
}

async function sendRepairNotifications(notifications, context) {
  const results = await Promise.allSettled(notifications);
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`${context} (thông báo ${index + 1}):`, result.reason);
    }
  });
  return results.some(result => result.status === 'rejected');
}

function registerRepairRoutes() {
  app.get('/api/repair-requests', authenticate, async (req, res) => {
    try {
      const orders = await getCollection('repairOrders')
        .find({ customerID: req.auth.userID })
        .sort({ orderDate: -1, _id: -1 })
        .toArray();
      res.json({ requests: await Promise.all(orders.map(hydrateRepairOrder)) });
    } catch (error) {
      console.error('Lỗi tải repair của người dùng:', error);
      res.status(500).json({ message: 'Không thể tải yêu cầu sửa chữa.' });
    }
  });

  app.post('/api/repair-requests', authenticate, async (req, res) => {
    try {
      const body = req.body || {};
      const deviceName = typeof body.deviceName === 'string' ? body.deviceName.trim() : '';
      const deviceType = typeof body.deviceType === 'string' ? body.deviceType.trim() : '';
      const issueDescription = typeof body.issueDescription === 'string' ? body.issueDescription.trim() : '';
      const contactPhone = typeof body.contactPhone === 'string' ? body.contactPhone.trim() : '';
      const assessment = body.assessment;
      const images = assessment?.images;
      const estimatedPrice = body.userEstimatedPriceVnd;
      const appearance = assessment?.appearance;
      const functionality = assessment?.functionality;
      const battery = assessment?.battery;
      const imagePayloadSize = Array.isArray(images)
        ? images.reduce((size, image) => size + (typeof image?.preview === 'string' ? image.preview.length : 0), 0)
        : 0;
      if (!deviceName || deviceName.length > 120 || !deviceType || deviceType.length > 80 ||
          !issueDescription || issueDescription.length > 5000 || contactPhone.length > 30) {
        return res.status(400).json({ message: 'Vui lòng kiểm tra tên thiết bị, loại thiết bị, mô tả lỗi và số điện thoại.' });
      }
      if (!assessment || typeof assessment !== 'object' || Array.isArray(assessment) ||
          !Array.isArray(images) || images.length > 8 || imagePayloadSize > 12 * 1024 * 1024) {
        return res.status(400).json({ message: 'Thông tin đánh giá hoặc danh sách ảnh thiết bị không hợp lệ.' });
      }
      const hasRequiredAssessmentFields = [
        assessment.brand,
        assessment.usagePeriod,
        appearance?.overall,
        appearance?.screen,
        appearance?.casing,
        appearance?.waterDamage,
        functionality?.startup,
        functionality?.mainFunction,
        functionality?.ports,
        battery?.condition,
        battery?.repairHistory
      ].every(value => typeof value === 'string' && value.trim().length > 0);
      if (!hasRequiredAssessmentFields ||
          !functionality?.deviceChecks || typeof functionality.deviceChecks !== 'object' ||
          Array.isArray(functionality.deviceChecks) ||
          !Object.keys(functionality.deviceChecks).length ||
          Object.values(functionality.deviceChecks).some(value => typeof value !== 'string' || !value.trim()) ||
          !Array.isArray(functionality.issues) || !Array.isArray(battery?.replacedParts)) {
        return res.status(400).json({ message: 'Vui lòng hoàn tất các thông tin bắt buộc trong đánh giá thiết bị.' });
      }
      if (estimatedPrice !== null && estimatedPrice !== undefined &&
          (!['number', 'string'].includes(typeof estimatedPrice) ||
          typeof estimatedPrice === 'string' && !estimatedPrice.trim() ||
          !Number.isInteger(Number(estimatedPrice)) || Number(estimatedPrice) < 0 || Number(estimatedPrice) > 1000000000)) {
        return res.status(400).json({ message: 'Giá trị thiết bị ước tính phải là số nguyên từ 0 đến 1.000.000.000 VNĐ.' });
      }
      if (images.some(image =>
        !image || typeof image !== 'object' ||
        typeof image.preview !== 'string' ||
        !/^data:image\/(?:jpeg|png|webp);base64,/i.test(image.preview)
      )) {
        return res.status(400).json({ message: 'Ảnh thiết bị không hợp lệ.' });
      }
      const now = new Date().toISOString();
      const order = {
        repairOrderID: `RP${Date.now()}`,
        requestID: `RQ${Date.now()}`,
        customerID: req.auth.userID,
        deviceName,
        deviceType,
        issueDescription,
        contactPhone,
        userEstimatedPriceVnd: estimatedPrice ?? null,
        assessment,
        orderDate: now,
        createdAt: now,
        status: 'Chờ xác nhận',
        aiAssessmentStatus: 'Đang đánh giá bằng Gemini'
      };
      await getCollection('repairOrders').insertOne(order);
      setImmediate(() => {
        createRepairNotification(
          order.customerID,
          'Đã tiếp nhận yêu cầu sửa chữa',
          `Yêu cầu ${order.repairOrderID} của bạn đã được tiếp nhận và đang chờ kiểm tra.`,
          order.repairOrderID
        ).catch(error => console.error('Lỗi tạo thông báo tiếp nhận repair:', error));
      });
      queueRepairAssessment(order);
      res.status(201).json({ message: 'Đã tạo yêu cầu sửa chữa.', repairOrder: await hydrateRepairOrder(order) });
    } catch (error) {
      console.error('Lỗi tạo repair:', error);
      res.status(500).json({ message: 'Không thể tạo yêu cầu sửa chữa.' });
    }
  });

  app.post('/api/repair-requests/:repairOrderID/ai-assessment', authenticate, async (req, res) => {
    try {
      const { repairOrderID } = req.params;
      const order = await getCollection('repairOrders').findOne({ repairOrderID });
      if (!order || (order.customerID !== req.auth.userID && !['ADMIN', 'TECHNICIAN'].includes(req.auth.role))) {
        return res.status(404).json({ message: 'Không tìm thấy yêu cầu sửa chữa.' });
      }
      if (order.specialistAssessment || order.userChoice) {
        return res.status(409).json({ message: 'Yêu cầu đã có kết quả xử lý, không thể gửi đánh giá Gemini trùng lặp.' });
      }
      if (order.aiAssessmentStatus?.startsWith('Đang')) {
        return res.status(202).json({
          message: 'Đánh giá Gemini đang được xử lý.',
          status: order.aiAssessmentStatus
        });
      }
      const existingAssessment = await getCollection('AI_assessments').findOne({
        source: { $in: ['gemini', 'cache'] },
        $or: [
          { repairOrderID: order.repairOrderID },
          ...(order.requestID ? [{ requestID: order.requestID }] : [])
        ]
      });
      if (existingAssessment) {
        return res.status(409).json({ message: 'Yêu cầu đã có kết quả Gemini. Vui lòng xem lại lịch sử đánh giá.' });
      }
      const assessmentInProgress = await getCollection('repairOrders').updateOne(
        {
          _id: order._id,
          aiAssessmentStatus: { $not: /^Đang/ },
          specialistAssessment: { $exists: false }
        },
        { $set: { aiAssessmentStatus: 'Đang đánh giá bằng Gemini', updatedAt: new Date().toISOString() } }
      );
      if (!assessmentInProgress.matchedCount) {
        return res.status(409).json({ message: 'Yêu cầu đã được cập nhật hoặc đang đánh giá. Vui lòng tải lại.' });
      }
      order.aiAssessmentStatus = 'Đang đánh giá bằng Gemini';
      queueRepairAssessment(order);
      res.status(202).json({
        message: 'Yêu cầu đánh giá đã được đưa vào xử lý.',
        status: 'Đang đánh giá bằng Gemini'
      });
    } catch (error) {
      console.error('Lỗi đánh giá Gemini:', error);
      res.status(500).json({ message: 'Không thể đánh giá thiết bị.' });
    }
  });

  app.get('/api/admin/repair-requests', authenticate, requireAdmin, async (_req, res) => {
    try {
      const orders = await getCollection('repairOrders')
        .find({ 'userChoice.option': { $ne: 'resell' } })
        .sort({ orderDate: -1, _id: -1 })
        .toArray();
      res.json({ requests: await Promise.all(orders.map(hydrateRepairOrder)) });
    } catch (error) {
      console.error('Lỗi tải repair admin:', error);
      res.status(500).json({ message: 'Không thể tải danh sách sửa chữa.' });
    }
  });

  app.get('/api/repair-requests/:repairOrderID/specialist-assessment', authenticate, async (req, res) => {
    const repairOrderID = String(req.params.repairOrderID || '').trim();
    if (!repairOrderID) {
      return res.status(400).json({ message: 'Mã yêu cầu sửa chữa không hợp lệ.' });
    }
    try {
      const order = await getCollection('repairOrders').findOne({ repairOrderID });
      if (!order || (order.customerID !== req.auth.userID && !['ADMIN', 'TECHNICIAN'].includes(req.auth.role))) {
        return res.status(404).json({ message: 'Không tìm thấy yêu cầu sửa chữa.' });
      }
      return res.json({
        repairOrderID,
        specialistAssessment: order.specialistAssessment || null,
        status: normalizeRepairOrderStatus(order)
      });
    } catch (error) {
      console.error(`Lỗi tải đánh giá chuyên gia ${repairOrderID}:`, error);
      return res.status(500).json({ message: 'Không thể tải đánh giá chuyên gia.' });
    }
  });

  app.delete('/api/repair-requests/:repairOrderID', authenticate, requireAdmin, async (req, res) => {
    const repairOrderID = String(req.params.repairOrderID || '').trim();
    const reason = String(req.body?.reason || '').trim();
    if (!repairOrderID) return res.status(400).json({ message: 'Mã yêu cầu sửa chữa không hợp lệ.' });
    if (reason.length < 5 || reason.length > 500) {
      return res.status(400).json({ message: 'Vui lòng nhập lý do xóa từ 5 đến 500 ký tự.' });
    }
    try {
      const repairOrders = getCollection('repairOrders');
      const order = await repairOrders.findOne({ repairOrderID });
      if (!order) return res.status(404).json({ message: 'Không tìm thấy yêu cầu sửa chữa.' });

      await getCollection('repairOrderDeletions').insertOne({
        repairOrderID,
        customerID: order.customerID || null,
        deletedBy: req.auth.userID,
        reason,
        deletedAt: new Date().toISOString()
      });
      const assessmentFilter = {
        $or: [
          { repairOrderID },
          ...(order.requestID ? [{ requestID: order.requestID }] : [])
        ]
      };
      await Promise.all([
        getCollection('AI_assessments').deleteMany(assessmentFilter),
        getCollection('notifications').deleteMany({ targetID: repairOrderID })
      ]);
      const deleted = await repairOrders.deleteOne({ _id: order._id });
      if (!deleted.deletedCount) throw new Error(`Repair ${repairOrderID} was not deleted`);
      await createRepairNotification(
        order.customerID,
        'Yêu cầu sửa chữa đã bị xóa',
        `Yêu cầu ${repairOrderID} đã bị quản trị viên xóa. Lý do: ${reason}`,
        repairOrderID
      );
      return res.json({ message: 'Đã xóa yêu cầu sửa chữa và gửi thông báo kèm lý do cho người dùng.' });
    } catch (error) {
      console.error(`Lỗi xóa repair ${repairOrderID}:`, error);
      return res.status(500).json({ message: 'Không thể xóa yêu cầu sửa chữa.' });
    }
  });

  app.put('/api/repair-requests/:repairOrderID/status', authenticate, requireAdmin, async (req, res) => {
    const { status } = req.body || {};
    const allowedStatuses = [
      'Chờ xác nhận',
      'Đã hủy',
      'Chờ lựa chọn của người dùng',
      'Đang sửa chữa',
      'Đã hoàn thành',
      'Đã giao hàng'
    ];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái sửa chữa không hợp lệ.' });
    }
    try {
      const statusUpdatedAt = new Date().toISOString();
      const repairOrder = await getCollection('repairOrders').findOne(
        { repairOrderID: req.params.repairOrderID }
      );
      if (!repairOrder) return res.status(404).json({ message: 'Không tìm thấy yêu cầu sửa chữa.' });
      const allowedTransitions = {
        'Chờ xác nhận': ['Đã hủy'],
        'Đang sửa chữa': ['Đã hoàn thành'],
        'Đã hoàn thành': ['Đã giao hàng']
      };
      if (allowedTransitions[repairOrder.status] &&
          !allowedTransitions[repairOrder.status].includes(status)) {
        return res.status(409).json({ message: `Không thể chuyển từ ${repairOrder.status} sang ${status}.` });
      }
      if (repairOrder.userChoice?.option === 'resell') {
        return res.status(409).json({ message: 'Yêu cầu này đã được chuyển sang đăng bán, không thể đổi trạng thái sửa chữa.' });
      }
      const result = await getCollection('repairOrders').updateOne(
        {
          repairOrderID: req.params.repairOrderID,
          'userChoice.option': { $ne: 'resell' }
        },
        { $set: { status, statusUpdatedAt, updatedAt: statusUpdatedAt } }
      );
      if (!result.matchedCount) return res.status(404).json({ message: 'Không tìm thấy yêu cầu sửa chữa.' });
      const updatedOrder = await getCollection('repairOrders').findOne(
        { repairOrderID: req.params.repairOrderID },
        { projection: { customerID: 1 } }
      );
      await createRepairNotification(
        updatedOrder?.customerID,
        'Cập nhật trạng thái sửa chữa',
        `Yêu cầu ${req.params.repairOrderID} đã chuyển sang trạng thái: ${status}.`,
        req.params.repairOrderID
      );
      res.json({ message: 'Đã cập nhật trạng thái.', status });
    } catch (error) {
      console.error('Lỗi cập nhật trạng thái repair:', error);
      res.status(500).json({ message: 'Không thể cập nhật trạng thái.' });
    }
  });

  app.post('/api/repair-requests/:repairOrderID/specialist-assessment', authenticate, requireAdmin, async (req, res) => {
    const repairOrderID = String(req.params.repairOrderID || '').trim();
    const body = req.body || {};
    const summary = String(body.summary || '').trim();
    const recommendations = body.recommendations || {};
    if (summary.length < 10 || summary.length > 3000) {
      return res.status(400).json({ message: 'Nhận xét chuyên gia cần dài từ 10 đến 3000 ký tự.' });
    }
    const optionKeys = TWO_ACTIONS;
    if (
      !recommendations || typeof recommendations !== 'object' || Array.isArray(recommendations) ||
      optionKeys.some(key =>
        typeof recommendations[key] !== 'string' ||
        !recommendations[key].trim() ||
        recommendations[key].trim().length > 3000
      )
    ) {
      return res.status(400).json({
        message: 'Vui lòng nhập nhận định từ 1 đến 3000 ký tự cho đúng 2 phương án: Sửa chữa và Bán lại.'
      });
    }
    const estimatedPrices = body.estimatedPrices || {};
    for (const key of optionKeys) {
      const amount = estimatedPrices[key]?.amountVnd;
      const rationale = estimatedPrices[key]?.rationale;
      if (amount !== null && amount !== undefined &&
          (!['number', 'string'].includes(typeof amount) || String(amount).trim() === '' ||
          !Number.isInteger(Number(amount)) || Number(amount) < 0 || Number(amount) > 1000000000)) {
        return res.status(400).json({ message: 'Chi phí chuyên gia nhập không hợp lệ.' });
      }
      if (rationale !== null && rationale !== undefined &&
          (typeof rationale !== 'string' || rationale.trim().length > 1000)) {
        return res.status(400).json({ message: 'Cơ sở báo giá không được vượt quá 1000 ký tự.' });
      }
    }

    try {
      const order = await getCollection('repairOrders').findOne({ repairOrderID });
      if (!order) return res.status(404).json({ message: 'Không tìm thấy yêu cầu sửa chữa.' });
      if (!['Chờ xác nhận', 'Chờ chuyên gia đánh giá'].includes(order.status)) {
        return res.status(409).json({ message: 'Chỉ gửi đánh giá khi yêu cầu đang chờ xác nhận.' });
      }
      const specialist = await getCollection('users').findOne(
        { userID: req.auth.userID },
        { projection: { fullName: 1, userName: 1 } }
      );
      const cleanPrices = Object.fromEntries(optionKeys.map(key => {
        const price = estimatedPrices[key] || {};
        const amountVnd = price.amountVnd === '' || price.amountVnd === undefined || price.amountVnd === null
          ? null
          : Number(price.amountVnd);
        return [key, {
          amountVnd,
          currency: 'VND',
          display: amountVnd === null ? 'Chưa báo giá' : `${amountVnd.toLocaleString('vi-VN')} VNĐ`,
          rationale: String(price.rationale || '').trim()
        }];
      }));
      const specialistAssessment = {
        specialistID: req.auth.userID,
        specialistName: specialist?.fullName || specialist?.userName || req.auth.userID,
        summary,
        recommendations: Object.fromEntries(optionKeys.map(key => [key, recommendations[key].trim()])),
        estimatedPrices: cleanPrices,
        createdAt: new Date().toISOString()
      };
      const updateResult = await getCollection('repairOrders').updateOne(
        { _id: order._id, status: { $in: ['Chờ xác nhận', 'Chờ chuyên gia đánh giá'] } },
        {
          $set: {
            specialistAssessment,
            status: 'Chờ lựa chọn của người dùng',
            updatedAt: specialistAssessment.createdAt
          }
        }
      );
      if (!updateResult.matchedCount) {
        return res.status(409).json({ message: 'Yêu cầu đã được cập nhật. Vui lòng tải lại trước khi gửi đánh giá.' });
      }
      const notificationFailed = await sendRepairNotifications([
        createRepairNotification(
          order.customerID,
          'Chuyên gia đã đánh giá thiết bị',
          `Yêu cầu ${repairOrderID} đã có đánh giá chuyên gia. Hãy xem và chọn phương án xử lý.`,
          repairOrderID
        )
      ], `Lỗi thông báo đánh giá chuyên gia ${repairOrderID}`);
      return res.json({
        message: notificationFailed
          ? 'Đã lưu đánh giá và chuyển cho người dùng lựa chọn, nhưng gửi thông báo thất bại.'
          : 'Đã lưu đánh giá chuyên gia và chuyển cho người dùng lựa chọn.',
        specialistAssessment,
        status: 'Chờ lựa chọn của người dùng'
      });
    } catch (error) {
      console.error(`Lỗi lưu đánh giá chuyên gia ${repairOrderID}:`, error);
      return res.status(500).json({ message: 'Không thể lưu đánh giá chuyên gia.' });
    }
  });

  app.post('/api/repair-requests/:repairOrderID/choice', authenticate, async (req, res) => {
    const repairOrderID = String(req.params.repairOrderID || '').trim();
    const option = req.body?.option;
    const options = { repair: { status: 'Chờ admin cập nhật trạng thái' } };
    if (!Object.prototype.hasOwnProperty.call(options, option)) {
      return res.status(400).json({ message: 'Phương án lựa chọn không hợp lệ.' });
    }
    try {
      const orders = getCollection('repairOrders');
      const order = await orders.findOne({ repairOrderID, customerID: req.auth.userID });
      if (!order) return res.status(404).json({ message: 'Không tìm thấy yêu cầu sửa chữa.' });
      if (!order.specialistAssessment) {
        return res.status(409).json({ message: 'Yêu cầu chưa có đánh giá của chuyên gia.' });
      }
      if (order.userChoice) {
        return res.status(409).json({ message: 'Bạn đã chọn phương án cho yêu cầu này.' });
      }
      if (order.status !== 'Chờ lựa chọn của người dùng') {
        return res.status(409).json({ message: 'Yêu cầu hiện không chờ lựa chọn của người dùng.' });
      }
      const userChoice = { option, chosenAt: new Date().toISOString() };
      const updated = await orders.updateOne(
        {
          _id: order._id,
          userChoice: { $exists: false },
          status: 'Chờ lựa chọn của người dùng'
        },
        { $set: { userChoice, status: options[option].status, updatedAt: userChoice.chosenAt } }
      );
      if (!updated.matchedCount) {
        return res.status(409).json({ message: 'Yêu cầu đã được cập nhật. Vui lòng tải lại trước khi chọn.' });
      }
      const notificationFailed = await sendRepairNotifications([
        createRepairNotification(
        order.customerID,
        'Đã ghi nhận lựa chọn sửa chữa',
        `Bạn đã chọn sửa chữa cho yêu cầu ${repairOrderID}. Trạng thái hiện tại là "Chờ admin cập nhật trạng thái".`,
        repairOrderID
        ),
        notifyRepairManagers(
        'Người dùng đã chọn sửa chữa',
        `Yêu cầu ${repairOrderID} đã được chọn sửa chữa và đang chờ admin cập nhật trạng thái.`,
        repairOrderID
        )
      ], `Lỗi thông báo lựa chọn sửa chữa ${repairOrderID}`);
      return res.json({
        message: notificationFailed
          ? 'Đã lưu lựa chọn sửa chữa nhưng có lỗi khi gửi thông báo.'
          : 'Đã lưu lựa chọn sửa chữa.',
        status: options[option].status,
        userChoice
      });
    } catch (error) {
      console.error(`Lỗi lưu lựa chọn repair ${repairOrderID}:`, error);
      return res.status(500).json({ message: 'Không thể lưu lựa chọn.' });
    }
  });

  app.post('/api/repair-requests/:repairOrderID/resell-listing', authenticate, async (req, res) => {
    const repairOrderID = String(req.params.repairOrderID || '').trim();
    const title = String(req.body?.title || '').trim();
    const cateID = String(req.body?.cateID || '').trim();
    const condition = String(req.body?.condition || '').trim();
    const description = String(req.body?.description || '').trim();
    const priceVnd = Number(req.body?.priceVnd);
    const image = String(req.body?.image || '').trim();
    if (!repairOrderID) return res.status(400).json({ message: 'Mã yêu cầu sửa chữa không hợp lệ.' });
    if (title.length < 3 || title.length > 120) {
      return res.status(400).json({ message: 'Tên sản phẩm phải dài từ 3 đến 120 ký tự.' });
    }
    if (!Number.isInteger(priceVnd) || priceVnd <= 0 || priceVnd > 1000000000) {
      return res.status(400).json({ message: 'Vui lòng nhập giá bán hợp lệ từ 1 đến 1.000.000.000 VNĐ.' });
    }
    if (!condition || condition.length > 100 || description.length > 3000) {
      return res.status(400).json({ message: 'Thông tin tình trạng hoặc mô tả sản phẩm không hợp lệ.' });
    }
    if (
      image.length > 8 * 1024 * 1024 ||
      (image && !/^https?:\/\/|^data:image\/(?:jpeg|png|webp);base64,/i.test(image))
    ) {
      return res.status(400).json({ message: 'Ảnh sản phẩm không hợp lệ hoặc vượt quá dung lượng cho phép.' });
    }

    let addedProductID;
    let categoryID;
    let listingCommitted = false;
    try {
      const repairOrders = getCollection('repairOrders');
      const order = await repairOrders.findOne({
        repairOrderID,
        customerID: req.auth.userID
      });
      if (!order) return res.status(404).json({ message: 'Không tìm thấy yêu cầu sửa chữa.' });
      if (!order.specialistAssessment || order.status !== 'Chờ lựa chọn của người dùng') {
        return res.status(409).json({ message: 'Chỉ có thể đăng bán sau khi chuyên gia hoàn tất đánh giá.' });
      }
      if (order.userChoice) {
        return res.status(409).json({ message: 'Bạn đã chọn phương án xử lý cho yêu cầu này.' });
      }

      const category = await getCollection('products').findOne({ CateID: cateID });
      if (!category) return res.status(400).json({ message: 'Danh mục sản phẩm không hợp lệ.' });

      addedProductID = `RS${Date.now()}${Math.floor(Math.random() * 100000)}`;
      categoryID = category.CateID;
      const formattedPrice = `${priceVnd.toLocaleString('vi-VN')}₫`;
      const chosenAt = new Date().toISOString();
      const product = {
        id: addedProductID,
        img: image || '/assets/ecocycle-logo.svg',
        title,
        quantity: 1,
        fromPrice: formattedPrice,
        newPrice: formattedPrice,
        saving: '',
        discount: '',
        sellerid: req.auth.userID,
        condition,
        Status: 'Còn hàng',
        Description: description,
        repairOrderID,
        createdAt: new Date().toISOString()
      };

      const added = await getCollection('products').updateOne(
        { CateID: categoryID },
        { $push: { Products: product } }
      );
      if (!added.matchedCount) throw new Error(`Không thể lưu tin bán ${addedProductID}`);

      try {
        const updated = await repairOrders.updateOne(
          {
            _id: order._id,
            status: 'Chờ lựa chọn của người dùng',
            userChoice: { $exists: false }
          },
          {
            $set: {
              userChoice: { option: 'resell', chosenAt },
              saleListingID: addedProductID,
              status: 'Đang bán',
              updatedAt: chosenAt
            }
          }
        );
        if (!updated.matchedCount) {
          await getCollection('products').updateOne(
            { CateID: categoryID },
            { $pull: { Products: { id: addedProductID } } }
          );
          return res.status(409).json({ message: 'Yêu cầu đã được cập nhật. Vui lòng tải lại và thử lại.' });
        }
        listingCommitted = true;
      } catch (error) {
        await getCollection('products').updateOne(
          { CateID: categoryID },
          { $pull: { Products: { id: addedProductID } } }
        );
        throw error;
      }

      let notificationWarning;
      try {
        await createRepairNotification(
          req.auth.userID,
          'Thiết bị đã được đăng bán',
          `Sản phẩm "${title}" đã được đăng thành công trên marketplace với giá ${formattedPrice}.`,
          addedProductID,
          'seller'
        );
      } catch (error) {
        console.error(`Không thể tạo thông báo đăng bán ${addedProductID}:`, error);
        notificationWarning = 'Tin bán đã được lưu nhưng không thể gửi thông báo.';
      }
      return res.status(201).json({
        message: notificationWarning || 'Đã xác nhận đăng bán và đưa sản phẩm lên marketplace.',
        productID: addedProductID,
        status: 'Đang bán',
        userChoice: { option: 'resell', chosenAt }
      });
    } catch (error) {
      console.error(`Lỗi tạo tin bán cho yêu cầu ${repairOrderID}:`, error);
      if (listingCommitted) {
        return res.status(500).json({ message: 'Tin bán đã được lưu nhưng có lỗi khi hoàn tất các bước phụ trợ.' });
      }
      return res.status(500).json({ message: 'Không thể đăng sản phẩm lên marketplace.' });
    }
  });
}

async function deductProductQuantity(items) {
  try {
    if (!Array.isArray(items) || items.length === 0) return;
    const productsCollection = await getCollection('products');
    const pIds = items.map(item => item.productId || item.productID || item.id).filter(Boolean);
    const catDocs = await productsCollection.find({ "Products.id": { $in: pIds } }).toArray();

    const updates = [];
    for (const item of items) {
      const pId = item.productId || item.productID || item.id;
      const deductQty = parseInt(item.quantity || 1, 10);
      const catDoc = catDocs.find(c => (c.Products || []).some(p => p.id === pId));
      if (catDoc && catDoc.Products) {
        const prod = catDoc.Products.find(p => p.id === pId);
        if (prod) {
          const currentQty = parseInt(prod.quantity || 1, 10);
          const newQty = Math.max(0, currentQty - deductQty);
          const newStatus = newQty <= 0 ? 'Đã bán' : (prod.Status || 'Sẵn có');

          updates.push(
            productsCollection.updateOne(
              { _id: catDoc._id, "Products.id": pId },
              { 
                $set: { 
                  "Products.$.quantity": newQty,
                  "Products.$.Status": newStatus
                } 
              }
            )
          );
        }
      }
    }
    if (updates.length > 0) {
      await Promise.all(updates);
    }
  } catch (err) {
    console.error("Lỗi khi trừ số lượng sản phẩm trong MongoDB products:", err);
  }
}

async function restoreProductQuantity(items) {
  try {
    if (!Array.isArray(items) || items.length === 0) return;
    const productsCollection = await getCollection('products');
    const pIds = items.map(item => item.productID || item.productId || item.id).filter(Boolean);
    const catDocs = await productsCollection.find({ "Products.id": { $in: pIds } }).toArray();

    const updates = [];
    for (const item of items) {
      const pId = item.productID || item.productId || item.id;
      const restoreQty = parseInt(item.quantity || 1, 10);

      const catDoc = catDocs.find(c => (c.Products || []).some(p => p.id === pId));
      if (catDoc && catDoc.Products) {
        const prod = catDoc.Products.find(p => p.id === pId);
        if (prod) {
          const currentQty = parseInt(prod.quantity || 0, 10);
          const newQty = currentQty + restoreQty;
          
          updates.push(
            productsCollection.updateOne(
              { _id: catDoc._id, "Products.id": pId },
              { 
                $set: { 
                  "Products.$.quantity": newQty,
                  "Products.$.Status": "Sẵn có"
                } 
              }
            )
          );
        }
      }
    }
    if (updates.length > 0) {
      await Promise.all(updates);
    }
  } catch (err) {
    console.error("Lỗi khi hoàn trả số lượng sản phẩm trong MongoDB products:", err);
  }
}

app.get('/products', async (req, res) => {
  try {
    const collection = await getCollection('products');
    const categories = await collection.find({}).toArray();
    
    // Chỉ truy vấn những người bán thực sự có sản phẩm, dùng projection để giảm tối đa payload
    const sellerIds = new Set();
    categories.forEach(cat => {
      (cat.Products || []).forEach(p => {
        if (p.sellerid) sellerIds.add(p.sellerid);
      });
    });

    const usersCollection = await getCollection('users');
    const sellers = sellerIds.size > 0
      ? await usersCollection.find(
          { userID: { $in: Array.from(sellerIds) } },
          { projection: { userID: 1, fullName: 1, avatar: 1, sellerDetails: 1, joinDate: 1 } }
        ).toArray()
      : [];
    
    const userMap = {};
    sellers.forEach(u => {
      userMap[u.userID] = u;
    });

    const availableCategories = categories.map(cat => {
      const activeProducts = (cat.Products || [])
        .filter(p => p.Status !== 'Đã bán' && (p.quantity === undefined || p.quantity > 0))
        .map(p => {
          const sellerUser = userMap[p.sellerid];
          let loc = 'TP.HCM';
          let sellerInfo = null;
          if (sellerUser) {
            if (sellerUser.sellerDetails && sellerUser.sellerDetails.address) {
              const addr = sellerUser.sellerDetails.address;
              const parts = addr.split(',');
              loc = parts[parts.length - 1].trim();
            }
            sellerInfo = {
              id: sellerUser.userID,
              name: sellerUser.fullName,
              avatar: sellerUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              address: (sellerUser.sellerDetails && sellerUser.sellerDetails.address) ? sellerUser.sellerDetails.address : 'TP.HCM',
              joinDate: sellerUser.joinDate || '2026-01-01',
              rating: 4.9,
              isVerified: true
            };
          } else {
            sellerInfo = {
              id: p.sellerid || 'SELLER_ECO',
              name: `Người bán (${p.sellerid || 'ECO'})`,
              avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              address: 'TP.HCM',
              joinDate: '2026-01-01',
              rating: 4.9,
              isVerified: true
            };
          }
          return { ...p, sellerLocation: loc, sellerInfo: sellerInfo };
        });
      return { ...cat, Products: activeProducts };
    });

    res.status(200).json(availableCategories);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách sản phẩm:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/products/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const collection = await getCollection('products');
    
    const categoryDoc = await collection.findOne({
      "Products.id": id
    });

    if (!categoryDoc) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    const rawProduct = categoryDoc.Products.find(p => p.id === id);
    if (!rawProduct) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    const product = JSON.parse(JSON.stringify(rawProduct));

    if (product.sellerid) {
      const usersCollection = await getCollection('users');
      const sellerUser = await usersCollection.findOne({ userID: product.sellerid });
      if (sellerUser) {
        product.sellerInfo = {
          id: sellerUser.userID,
          name: sellerUser.fullName,
          avatar: sellerUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          address: (sellerUser.sellerDetails && sellerUser.sellerDetails.address) ? sellerUser.sellerDetails.address : 'Khu Đô thị Đại học Quốc gia TP.HCM',
          joinDate: sellerUser.joinDate || '2026-01-01',
          rating: 4.9,
          isVerified: true
        };
      }
    }

    res.status(200).json(product);
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết sản phẩm:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/users/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.auth.userID !== id && req.auth.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Bạn không có quyền xem hồ sơ này.' });
    }
    const usersCollection = await getCollection('users');
    const userDoc = await usersCollection.findOne(
      { userID: id },
      { projection: { password: 0 } }
    );
    if (!userDoc) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
    res.status(200).json(userDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/products/filter', async (req, res) => {
  try {
    const { cateId, keyword } = req.query;
    const collection = await getCollection('products');
    let query = {};

    if (cateId) {
      query["CateID"] = cateId;
    }

    let categories = await collection.find(query).toArray();

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      categories = categories.map(cat => {
        const filteredProducts = cat.Products.filter(p => 
          (p.title.toLowerCase().includes(lowerKeyword) ||
          (p.Description && p.Description.toLowerCase().includes(lowerKeyword))) &&
          p.Status !== 'Đã bán' && (p.quantity === undefined || p.quantity > 0)
        );
        return { ...cat, Products: filteredProducts };
      });
    }

    res.status(200).json(categories);
  } catch (err) {
    console.error("Lỗi khi lọc sản phẩm:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/orders', authenticate, async (req, res) => {
  try {
    const orderData = req.body;
    if (!orderData || !orderData.items || orderData.items.length === 0) {
      return res.status(400).json({ message: "Đơn hàng không có sản phẩm" });
    }
    const sellOrdersCollection = await getCollection('sellOrders');
    const usersCollection = await getCollection('users');

    // Chỉ tìm đúng các người bán có trong đơn hàng
    const sellerIds = new Set();
    (orderData.sellerPackages || []).forEach(pkg => {
      if (pkg.sellerId) sellerIds.add(pkg.sellerId);
    });
    (orderData.items || []).forEach(item => {
      if (item.sellerId || item.sellerid) sellerIds.add(item.sellerId || item.sellerid);
    });

    const sellers = sellerIds.size > 0
      ? await usersCollection.find(
          { userID: { $in: Array.from(sellerIds) } },
          { projection: { userID: 1, fullName: 1, avatar: 1, sellerDetails: 1 } }
        ).toArray()
      : [];

    const userMap = {};
    sellers.forEach(u => userMap[u.userID] = u);
    
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const formattedOrderDate = `${day}/${month}/${year}`;
    const dateStr = `${year}${month}${day}`;

    const customerID = req.auth.userID;

    const createdOrders = [];
    const sellerPackages = orderData.sellerPackages || [];

    const earnedCoins = 10000;

    if (sellerPackages.length > 0) {
      for (const pkg of sellerPackages) {
        const pkgItems = orderData.items.filter(i => pkg.itemIds.includes(i.productId || i.id));
        const firstItem = pkgItems[0] || {};

        const cond = (firstItem.condition || '').toLowerCase();
        let orderType = 'resell';
        if (cond === 'mới' || cond === 'moi' || cond.includes('mới 100%') || cond.includes('nguyên seal') || cond.includes('brandnew')) {
          orderType = 'brandnew';
        }

        const pkgSubtotal = pkgItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const pkgShippingFee = pkg.shippingFee || 20000;
        const pkgTotalPrice = pkgSubtotal + pkgShippingFee;

        const sId = pkg.sellerId || 'SL000001';
        const sellerUser = userMap[sId];

        const newSellOrder = {
          orderID: `OD${Math.floor(100000 + Math.random() * 900000)}`,
          orderType: orderType,
          customerID: customerID,
          sellerID: sId,
          sellerInfo: {
            id: sId,
            name: pkg.sellerName || (sellerUser ? sellerUser.fullName : `Người bán ${sId}`),
            avatar: sellerUser ? (sellerUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150') : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
          },
          invoiceNumber: `HD${dateStr.slice(0, 4)}${Math.floor(1000 + Math.random() * 9000)}`,
          orderDate: formattedOrderDate,
          shippingAddress: `${orderData.shippingInfo.addressDetail}, ${orderData.shippingInfo.district}, ${orderData.shippingInfo.province}`,
          products: pkgItems.map(item => ({
            productID: item.productId || item.id,
            title: item.title,
            img: item.img,
            quantity: item.quantity,
            price: `${(item.price || 0).toLocaleString('vi-VN')}đ`
          })),
          subtotal: `${pkgSubtotal.toLocaleString('vi-VN')}đ`,
          shippingFee: `${pkgShippingFee.toLocaleString('vi-VN')}đ`,
          totalPrice: `${pkgTotalPrice.toLocaleString('vi-VN')}đ`,
          earnedCoins: earnedCoins,
          status: 'Chờ xác nhận',
          shippingInfo: orderData.shippingInfo,
          createdAt: now.toISOString()
        };

        await sellOrdersCollection.insertOne(newSellOrder);
        createdOrders.push(newSellOrder);
      }
    } else {
      const firstItem = orderData.items[0];
      const cond = (firstItem.condition || '').toLowerCase();
      let orderType = 'resell';
      if (cond === 'mới' || cond === 'moi' || cond.includes('mới 100%') || cond.includes('nguyên seal') || cond.includes('brandnew')) {
        orderType = 'brandnew';
      }

      const totalAmt = orderData.totalAmount || 0;
      const sId = firstItem.sellerId || 'SL000001';
      const sellerUser = userMap[sId];

      const randomNum = Math.floor(100000 + Math.random() * 900000);
      const newSellOrder = {
        orderID: `OD${randomNum}`,
        orderType: orderType,
        customerID: customerID,
        sellerID: sId,
        sellerInfo: {
          id: sId,
          name: sellerUser ? sellerUser.fullName : `Người bán ${sId}`,
          avatar: sellerUser ? (sellerUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150') : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
        },
        invoiceNumber: `HD${dateStr.slice(0, 4)}${Math.floor(1000 + Math.random() * 9000)}`,
        orderDate: formattedOrderDate,
        shippingAddress: `${orderData.shippingInfo.addressDetail}, ${orderData.shippingInfo.district}, ${orderData.shippingInfo.province}`,
        products: orderData.items.map(item => ({
          productID: item.productId || item.id,
          title: item.title,
          img: item.img,
          quantity: item.quantity,
          price: `${(item.price || 0).toLocaleString('vi-VN')}đ`
        })),
        subtotal: `${(orderData.subTotal || 0).toLocaleString('vi-VN')}đ`,
        shippingFee: `${(orderData.shippingFee || 0).toLocaleString('vi-VN')}đ`,
        totalPrice: `${totalAmt.toLocaleString('vi-VN')}đ`,
        earnedCoins: earnedCoins,
        status: 'Chờ xác nhận',
        shippingInfo: orderData.shippingInfo,
        createdAt: now.toISOString()
      };

      await sellOrdersCollection.insertOne(newSellOrder);
      createdOrders.push(newSellOrder);
    }

    await deductProductQuantity(orderData.items);

    res.status(201).json({ 
      success: true, 
      message: "Tạo đơn hàng thành công vào sellOrders và đã trừ tồn kho sản phẩm", 
      order: { orderId: createdOrders[0].orderID },
      orders: createdOrders 
    });
  } catch (err) {
    console.error("Lỗi khi tạo đơn hàng:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/orders/cancel/:orderId', authenticate, async (req, res) => {
  try {
    const targetOrderId = req.params.orderId || req.body.orderId || req.query.orderId;
    const sellOrdersCollection = await getCollection('sellOrders');
    
    const order = await sellOrdersCollection.findOne({ 
      customerID: req.auth.userID,
      $or: [{ orderID: targetOrderId }, { orderId: targetOrderId }]
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (order.status === 'Đã hủy') {
      return res.status(400).json({ message: "Đơn hàng đã được hủy trước đó" });
    }

    await sellOrdersCollection.updateOne(
      { _id: order._id },
      { $set: { status: 'Đã hủy', updatedAt: new Date().toISOString() } }
    );

    const prods = order.products || order.items || [];
    if (prods.length > 0) {
      await restoreProductQuantity(prods);
    }

    res.status(200).json({ success: true, message: "Đã hủy đơn hàng thành công và cộng lại số lượng sản phẩm vào kho" });
  } catch (err) {
    console.error("Lỗi khi hủy đơn hàng:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/orders/status/:orderId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const allowedStatuses = [
      'Chờ xác nhận',
      'Đang giao hàng',
      'Đang vận chuyển',
      'Đã giao',
      'Đã giao hàng',
      'Hoàn thành',
      'Đã hủy',
      'Đã huỷ',
      'Trả hàng/Hoàn tiền',
      'Hoàn tiền'
    ];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái đơn hàng không hợp lệ.' });
    }
    const sellOrdersCollection = await getCollection('sellOrders');
    const usersCollection = await getCollection('users');

    const order = await sellOrdersCollection.findOne({
      $or: [{ orderID: orderId }, { orderId: orderId }]
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const previousStatus = order.status;
    await sellOrdersCollection.updateOne(
      { _id: order._id },
      { $set: { status: status, updatedAt: new Date().toISOString() } }
    );

    const deliveredStatuses = ['Đã giao', 'Đã giao hàng', 'Hoàn thành'];
    if (deliveredStatuses.includes(status) && !deliveredStatuses.includes(previousStatus)) {
      const cId = order.customerID;
      if (!cId) {
        return res.status(500).json({ message: 'Đơn hàng không có tài khoản sở hữu.' });
      }
      await usersCollection.updateOne(
        { userID: cId },
        { $inc: { greenCoins: 10000 } }
      );
    }

    res.status(200).json({ success: true, message: `Đã chuyển trạng thái đơn hàng sang ${status}` });
  } catch (err) {
    console.error("Lỗi khi cập nhật trạng thái đơn hàng:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/orders/detail/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const sellOrdersCollection = await getCollection('sellOrders');

    const ord = await sellOrdersCollection.findOne({
      $or: [{ orderID: id }, { orderId: id }]
    });

    if (!ord) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }
    if (
      ord.customerID !== req.auth.userID &&
      ord.sellerID !== req.auth.userID &&
      !['ADMIN', 'TECHNICIAN'].includes(req.auth.role)
    ) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const sId = ord.sellerID || ord.sellerId || 'SL000001';
    let sellerInfo = ord.sellerInfo;
    if (!sellerInfo || !sellerInfo.name) {
      const usersCollection = await getCollection('users');
      const sellerUser = await usersCollection.findOne(
        { userID: sId },
        { projection: { fullName: 1, avatar: 1, sellerDetails: 1, phoneNumber: 1 } }
      );
      sellerInfo = {
        id: sId,
        name: sellerUser ? sellerUser.fullName : (sId.startsWith('usr') ? `Thành viên ${sId}` : `Người bán ${sId}`),
        avatar: sellerUser ? (sellerUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150') : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        address: sellerUser && sellerUser.sellerDetails ? sellerUser.sellerDetails.address : 'TP.HCM',
        phone: sellerUser ? sellerUser.phoneNumber : '0901234567'
      };
    }

    // Chỉ tìm sản phẩm nếu đơn hàng thiếu thông tin ảnh hoặc tên
    const missingPIds = (ord.products || ord.items || [])
      .filter(item => !item.title || !item.img)
      .map(item => item.productID || item.productId || item.id)
      .filter(Boolean);

    let prodMap = {};
    if (missingPIds.length > 0) {
      const productsCollection = await getCollection('products');
      const categories = await productsCollection.find({ "Products.id": { $in: missingPIds } }).toArray();
      categories.forEach(cat => {
        (cat.Products || []).forEach(p => {
          prodMap[p.id] = p;
        });
      });
    }

    const enrichedProducts = (ord.products || ord.items || []).map(item => {
      const pId = item.productID || item.productId || item.id;
      const dbProd = prodMap[pId];
      return {
        ...item,
        productID: pId,
        title: item.title || (dbProd ? dbProd.title : `Sản phẩm ${pId}`),
        img: item.img || (dbProd ? (dbProd.img || dbProd.Image || (dbProd.images && dbProd.images[0])) : 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=150'),
        quantity: item.quantity || 1,
        price: item.price || (dbProd ? (typeof dbProd.Price === 'number' ? `${dbProd.Price.toLocaleString('vi-VN')}đ` : dbProd.fromPrice || dbProd.price) : '0đ')
      };
    });

    res.status(200).json({
      ...ord,
      sellerInfo: sellerInfo,
      products: enrichedProducts,
      earnedCoins: ord.earnedCoins || 10000
    });
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết đơn hàng:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/orders', authenticate, async (req, res) => {
  try {
    const customerID = req.auth.userID;
    const sellOrdersCollection = await getCollection('sellOrders');
    const ordersList = await sellOrdersCollection.find({ customerID: customerID }).sort({ createdAt: -1, _id: -1 }).toArray();

    // Chỉ bổ sung nếu có đơn cũ bị thiếu sellerInfo hoặc thiếu chi tiết sản phẩm
    const missingSellerIds = new Set();
    const missingProductIds = new Set();

    ordersList.forEach(ord => {
      if (!ord.sellerInfo || !ord.sellerInfo.name) {
        const sId = ord.sellerID || ord.sellerId;
        if (sId) missingSellerIds.add(sId);
      }
      (ord.products || ord.items || []).forEach(item => {
        if (!item.title || !item.img) {
          const pId = item.productID || item.productId || item.id;
          if (pId) missingProductIds.add(pId);
        }
      });
    });

    let userMap = {};
    if (missingSellerIds.size > 0) {
      const usersCollection = await getCollection('users');
      const sellers = await usersCollection.find(
        { userID: { $in: Array.from(missingSellerIds) } },
        { projection: { userID: 1, fullName: 1, avatar: 1, sellerDetails: 1 } }
      ).toArray();
      sellers.forEach(u => userMap[u.userID] = u);
    }

    let prodMap = {};
    if (missingProductIds.size > 0) {
      const productsCollection = await getCollection('products');
      const categories = await productsCollection.find(
        { "Products.id": { $in: Array.from(missingProductIds) } }
      ).toArray();
      categories.forEach(cat => {
        (cat.Products || []).forEach(p => {
          prodMap[p.id] = p;
        });
      });
    }

    const enrichedOrders = ordersList.map(ord => {
      const sId = ord.sellerID || ord.sellerId || 'SL000001';
      const sellerUser = userMap[sId];
      
      const sellerInfo = ord.sellerInfo && ord.sellerInfo.name 
        ? ord.sellerInfo
        : {
            id: sId,
            name: sellerUser ? sellerUser.fullName : (sId.startsWith('usr') ? `Thành viên ${sId}` : `Người bán ${sId}`),
            avatar: sellerUser ? (sellerUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150') : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            address: sellerUser && sellerUser.sellerDetails ? sellerUser.sellerDetails.address : 'TP.HCM'
          };

      const enrichedProducts = (ord.products || ord.items || []).map(item => {
        const pId = item.productID || item.productId || item.id;
        const dbProd = prodMap[pId];
        return {
          ...item,
          productID: pId,
          title: item.title || (dbProd ? dbProd.title : `Sản phẩm ${pId}`),
          img: item.img || (dbProd ? (dbProd.img || dbProd.Image || (dbProd.images && dbProd.images[0])) : 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=150'),
          quantity: item.quantity || 1,
          price: item.price || (dbProd ? (typeof dbProd.Price === 'number' ? `${dbProd.Price.toLocaleString('vi-VN')}đ` : dbProd.fromPrice || dbProd.price) : '0đ')
        };
      });

      return {
        ...ord,
        sellerInfo: sellerInfo,
        products: enrichedProducts,
        earnedCoins: ord.earnedCoins || 10000
      };
    });

    res.status(200).json(enrichedOrders);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách đơn hàng:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/carts/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.auth.userID) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập giỏ hàng này.' });
    }
    const cartsCollection = await getCollection('carts');
    const cartDoc = await cartsCollection.findOne({ userId });
    res.status(200).json(cartDoc ? cartDoc.items || [] : []);
  } catch (err) {
    console.error("Lỗi khi lấy giỏ hàng:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/carts/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.auth.userID) {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật giỏ hàng này.' });
    }
    const { items } = req.body;
    const cartsCollection = await getCollection('carts');
    
    await cartsCollection.updateOne(
      { userId },
      { $set: { userId, items: items || [], updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    res.status(200).json({ success: true, message: "Đã cập nhật giỏ hàng trong database carts" });
  } catch (err) {
    console.error("Lỗi khi lưu giỏ hàng:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/carts/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.auth.userID) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa giỏ hàng này.' });
    }
    const cartsCollection = await getCollection('carts');
    await cartsCollection.deleteOne({ userId });
    res.status(200).json({ success: true, message: "Đã xóa giỏ hàng khỏi database carts" });
  } catch (err) {
    console.error("Lỗi khi xóa giỏ hàng:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/notifications', authenticate, async (req, res) => {
  try {
    const userId = req.auth.userID;
    const notificationsCollection = await getCollection('notifications');
    const notifications = await notificationsCollection
      .find({ userID: userId })
      .sort({ createdAt: -1, _id: -1 })
      .toArray();
    res.status(200).json(notifications);
  } catch (err) {
    console.error("Lỗi khi lấy thông báo:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const notificationsCollection = await getCollection('notifications');
    const result = await notificationsCollection.updateOne(
      {
        userID: req.auth.userID,
        $or: [{ notificationID: id }, { targetID: id }]
      },
      { $set: { isRead: true } }
    );
    if (!result.matchedCount) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
    }
    res.status(200).json({ success: true, message: "Đã cập nhật trạng thái thông báo" });
  } catch (err) {
    console.error("Lỗi khi cập nhật thông báo:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/notifications/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.auth.userID;
    const notificationsCollection = await getCollection('notifications');
    await notificationsCollection.updateMany(
      { userID: userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.status(200).json({ success: true, message: "Đã đánh dấu tất cả thông báo là đã đọc" });
  } catch (err) {
    console.error("Lỗi khi đánh dấu tất cả thông báo:", err);
    res.status(500).json({ error: err.message });
  }
});
