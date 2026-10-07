const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const URI = "mongodb://127.0.0.1:27017";
const client = new MongoClient(URI);
const DB_NAME = "EcoCycleDatabase";

client.connect()
  .then(() => console.log("Đã kết nối thành công tới MongoDB local (EcoCycleDatabase)"))
  .catch(err => console.error("Lỗi kết nối MongoDB:", err));

function getCollection(collectionName) {
  return client.db(DB_NAME).collection(collectionName);
}

async function deductProductQuantity(items) {
  try {
    const productsCollection = await getCollection('products');
    for (const item of items) {
      const pId = item.productId || item.productID || item.id;
      const deductQty = parseInt(item.quantity || 1, 10);

      const catDoc = await productsCollection.findOne({ "Products.id": pId });
      if (catDoc && catDoc.Products) {
        const prod = catDoc.Products.find(p => p.id === pId);
        if (prod) {
          const currentQty = parseInt(prod.quantity || 1, 10);
          const newQty = Math.max(0, currentQty - deductQty);
          const newStatus = newQty <= 0 ? 'Đã bán' : (prod.Status || 'Sẵn có');

          await productsCollection.updateOne(
            { _id: catDoc._id, "Products.id": pId },
            { 
              $set: { 
                "Products.$.quantity": newQty,
                "Products.$.Status": newStatus
              } 
            }
          );
        }
      }
    }
  } catch (err) {
    console.error("Lỗi khi trừ số lượng sản phẩm trong MongoDB products:", err);
  }
}

async function restoreProductQuantity(items) {
  try {
    const productsCollection = await getCollection('products');
    for (const item of items) {
      const pId = item.productID || item.productId || item.id;
      const restoreQty = parseInt(item.quantity || 1, 10);

      const catDoc = await productsCollection.findOne({ "Products.id": pId });
      if (catDoc && catDoc.Products) {
        const prod = catDoc.Products.find(p => p.id === pId);
        if (prod) {
          const currentQty = parseInt(prod.quantity || 0, 10);
          const newQty = currentQty + restoreQty;
          
          await productsCollection.updateOne(
            { _id: catDoc._id, "Products.id": pId },
            { 
              $set: { 
                "Products.$.quantity": newQty,
                "Products.$.Status": "Sẵn có"
              } 
            }
          );
        }
      }
    }
  } catch (err) {
    console.error("Lỗi khi hoàn trả số lượng sản phẩm trong MongoDB products:", err);
  }
}

app.get('/products', async (req, res) => {
  try {
    const collection = await getCollection('products');
    const categories = await collection.find({}).toArray();
    
    const usersCollection = await getCollection('users');
    const allUsers = await usersCollection.find({}).toArray();
    
    const userMap = {};
    allUsers.forEach(u => {
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

app.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const usersCollection = await getCollection('users');
    const userDoc = await usersCollection.findOne({ userID: id });
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

app.post('/orders', async (req, res) => {
  try {
    const orderData = req.body;
    if (!orderData || !orderData.items || orderData.items.length === 0) {
      return res.status(400).json({ message: "Đơn hàng không có sản phẩm" });
    }
    const sellOrdersCollection = await getCollection('sellOrders');
    const usersCollection = await getCollection('users');
    const allUsers = await usersCollection.find({}).toArray();
    const userMap = {};
    allUsers.forEach(u => userMap[u.userID] = u);
    
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const formattedOrderDate = `${day}/${month}/${year}`;
    const dateStr = `${year}${month}${day}`;

    const customerID = orderData.customerID || 'CM000001';

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

app.put('/orders/cancel/:orderId', async (req, res) => {
  try {
    const targetOrderId = req.params.orderId || req.body.orderId || req.query.orderId;
    const sellOrdersCollection = await getCollection('sellOrders');
    
    const order = await sellOrdersCollection.findOne({ 
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

app.put('/orders/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
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

    if ((status === 'Đã giao' || status === 'Đã giao hàng' || status === 'Hoàn thành') && previousStatus !== status) {
      const cId = order.customerID || 'CM000001';
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

app.get('/orders/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sellOrdersCollection = await getCollection('sellOrders');
    const usersCollection = await getCollection('users');
    const productsCollection = await getCollection('products');

    const ord = await sellOrdersCollection.findOne({
      $or: [{ orderID: id }, { orderId: id }]
    });

    if (!ord) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const sId = ord.sellerID || ord.sellerId || 'SL000001';
    const sellerUser = await usersCollection.findOne({ userID: sId });

    const categories = await productsCollection.find({}).toArray();
    const prodMap = {};
    categories.forEach(cat => {
      (cat.Products || []).forEach(p => {
        prodMap[p.id] = p;
      });
    });

    const sellerName = ord.sellerInfo?.name 
      || (sellerUser ? sellerUser.fullName : (sId.startsWith('usr') ? `Thành viên ${sId}` : `Người bán ${sId}`));
    const sellerAvatar = ord.sellerInfo?.avatar 
      || (sellerUser ? (sellerUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150') : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');
    const sellerAddress = ord.sellerInfo?.address 
      || (sellerUser && sellerUser.sellerDetails ? sellerUser.sellerDetails.address : 'TP.HCM');

    const sellerInfo = {
      id: sId,
      name: sellerName,
      avatar: sellerAvatar,
      address: sellerAddress,
      phone: sellerUser ? sellerUser.phoneNumber : '0901234567'
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

    res.status(200).json({
      ...ord,
      sellerInfo: sellerInfo,
      products: enrichedProducts,
      earnedCoins: 10000
    });
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết đơn hàng:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/orders', async (req, res) => {
  try {
    const { userId } = req.query;
    const customerID = userId || 'CM000001';
    const sellOrdersCollection = await getCollection('sellOrders');
    const usersCollection = await getCollection('users');
    const productsCollection = await getCollection('products');

    const allUsers = await usersCollection.find({}).toArray();
    const userMap = {};
    allUsers.forEach(u => userMap[u.userID] = u);

    const categories = await productsCollection.find({}).toArray();
    const prodMap = {};
    categories.forEach(cat => {
      (cat.Products || []).forEach(p => {
        prodMap[p.id] = p;
      });
    });
    
    const ordersList = await sellOrdersCollection.find({ customerID: customerID }).sort({ createdAt: -1, _id: -1 }).toArray();

    const enrichedOrders = ordersList.map(ord => {
      const sId = ord.sellerID || ord.sellerId || 'SL000001';
      const sellerUser = userMap[sId];
      
      const sellerName = ord.sellerInfo?.name 
        || (sellerUser ? sellerUser.fullName : (sId.startsWith('usr') ? `Thành viên ${sId}` : `Người bán ${sId}`));
      const sellerAvatar = ord.sellerInfo?.avatar 
        || (sellerUser ? (sellerUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150') : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');
      const sellerAddress = ord.sellerInfo?.address 
        || (sellerUser && sellerUser.sellerDetails ? sellerUser.sellerDetails.address : 'TP.HCM');

      const sellerInfo = {
        id: sId,
        name: sellerName,
        avatar: sellerAvatar,
        address: sellerAddress
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

      const coins = 10000;

      return {
        ...ord,
        sellerInfo: sellerInfo,
        products: enrichedProducts,
        earnedCoins: coins
      };
    });

    res.status(200).json(enrichedOrders);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách đơn hàng:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/carts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const cartsCollection = await getCollection('carts');
    const cartDoc = await cartsCollection.findOne({ userId });
    res.status(200).json(cartDoc ? cartDoc.items || [] : []);
  } catch (err) {
    console.error("Lỗi khi lấy giỏ hàng:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/carts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
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

app.delete('/carts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const cartsCollection = await getCollection('carts');
    await cartsCollection.deleteOne({ userId });
    res.status(200).json({ success: true, message: "Đã xóa giỏ hàng khỏi database carts" });
  } catch (err) {
    console.error("Lỗi khi xóa giỏ hàng:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/notifications', async (req, res) => {
  try {
    const userId = req.query.userId || req.query.userID || 'CM000001';
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

app.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const notificationsCollection = await getCollection('notifications');
    await notificationsCollection.updateOne(
      { $or: [{ notificationID: id }, { targetID: id }] },
      { $set: { isRead: true } }
    );
    res.status(200).json({ success: true, message: "Đã cập nhật trạng thái thông báo" });
  } catch (err) {
    console.error("Lỗi khi cập nhật thông báo:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/notifications/read-all', async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId || 'CM000001';
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

app.listen(PORT, () => {
  console.log(`Server MongoDB EcoCycleDatabase đang chạy tại http://localhost:${PORT}`);
});

