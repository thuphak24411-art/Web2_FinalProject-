
const { ObjectId } = require('mongodb');

module.exports = async function registerChat({
  app, io, db, jwt, jwtSecret, authenticate
}) {
  const conversations = db.collection('conversations');
  const messages = db.collection('messages');

  await conversations.createIndex({ participants: 1, updatedAt: -1 });
  await messages.createIndex({ conversationID: 1, createdAt: 1 });

  // Xác thực JWT khi kết nối Socket.IO
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Chưa đăng nhập'));

      const decoded = jwt.verify(token, jwtSecret);
      if (!decoded.userID) {
        return next(new Error('Token không hợp lệ'));
      }

      socket.data.userID = String(decoded.userID);
      next();
    } catch {
      next(new Error('Phiên đăng nhập hết hạn'));
    }
  });

  async function getConversation(conversationID, userID) {
    if (!ObjectId.isValid(conversationID)) return null;

    return conversations.findOne({
      _id: new ObjectId(conversationID),
      participants: userID
    });
  }

  // REST API: Danh sách cuộc trò chuyện của người đang đăng nhập
  app.get('/api/chat/conversations', authenticate, async (req, res) => {
    try {
      const data = await conversations
        .find({ participants: req.auth.userID })
        .sort({ updatedAt: -1 })
        .toArray();

      res.json(data);
    } catch {
      res.status(500).json({ message: 'Không tải được cuộc trò chuyện' });
    }
  });

  // REST API: Tạo hoặc mở cuộc trò chuyện
  app.post('/api/chat/conversations', authenticate, async (req, res) => {
    try {
      const senderID = String(req.auth.userID);
      const receiverID = String(req.body.receiverID || '').trim();

      if (!receiverID || senderID === receiverID) {
        return res.status(400).json({
          message: 'Người nhận không hợp lệ'
        });
      }

      const receiver = await db.collection('users')
        .findOne({ userID: receiverID });

      if (!receiver) {
        return res.status(404).json({
          message: 'Không tìm thấy người nhận'
        });
      }

      const participants = [senderID, receiverID].sort();
      const productID = String(req.body.productID || '').trim();

      // Một cuộc trò chuyện cho mỗi cặp người dùng và sản phẩm
      const existing = await conversations.findOne({
        participants,
        productID
      });

      if (existing) return res.json(existing);

      const now = new Date();
      const doc = {
        participants,
        productID,
        lastMessage: '',
        createdAt: now,
        updatedAt: now
      };

      const result = await conversations.insertOne(doc);

      res.status(201).json({
        ...doc,
        _id: result.insertedId
      });
    } catch {
      res.status(500).json({ message: 'Không thể tạo cuộc trò chuyện' });
    }
  });

  // REST API: Lấy lịch sử tin nhắn
  app.get('/api/chat/conversations/:id/messages', authenticate, async (req, res) => {
    try {
      const conversation = await getConversation(
        req.params.id,
        req.auth.userID
      );

      if (!conversation) {
        return res.status(403).json({
          message: 'Không có quyền xem cuộc trò chuyện'
        });
      }

      const data = await messages
        .find({ conversationID: conversation._id.toString() })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();

      res.json(data.reverse());
    } catch {
      res.status(500).json({ message: 'Không tải được tin nhắn' });
    }
  });

  // Kết nối real-time
  io.on('connection', socket => {
    const userID = socket.data.userID;

    console.log('[CHAT] Socket kết nối:', {
      socketID: socket.id,
      userID
    });

  socket.join(`user:${userID}`);
    socket.on('chat:join', async (conversationID, callback) => {
      try {
        const conversation = await getConversation(conversationID, userID);

        if (!conversation) {
          return callback?.({ ok: false, message: 'Không có quyền truy cập' });
        }

        socket.join(`chat:${conversationID}`);
        callback?.({ ok: true });
      } catch {
        callback?.({ ok: false, message: 'Không thể tham gia chat' });
      }
    });

    socket.on('chat:send', async (payload, callback) => {
      try {
        const conversationID = String(payload?.conversationID || '');
        const content = String(payload?.content || '').trim();
        console.log('[CHAT] Tin nhắn gửi từ:', {
          socketID: socket.id,
          userID,
          content
        });

        if (!content || content.length > 2000) {
          return callback?.({ ok: false, message: 'Tin nhắn không hợp lệ' });
        }

        const conversation = await getConversation(conversationID, userID);

        if (!conversation) {
          return callback?.({ ok: false, message: 'Không có quyền gửi tin' });
        }

        const now = new Date();
        const doc = {
          conversationID,
          senderID: userID,
          content,
          createdAt: now,
          isRead: false
        };

        const result = await messages.insertOne(doc);

        await conversations.updateOne(
          { _id: conversation._id },
          {
            $set: {
              lastMessage: content,
              updatedAt: now
            }
          }
        );

        const savedMessage = {
          ...doc,
          _id: result.insertedId
        };

        // Gửi cho tất cả thành viên cuộc trò chuyện
        for (const participant of conversation.participants) {
          io.to(`user:${participant}`).emit('chat:message', savedMessage);
        }

        callback?.({ ok: true, message: savedMessage });
      } catch {
        callback?.({ ok: false, message: 'Gửi tin nhắn thất bại' });
      }
    });
  });
};
