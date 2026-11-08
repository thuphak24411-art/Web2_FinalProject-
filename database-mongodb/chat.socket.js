
const { ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

module.exports = async function registerChat({
  app, io, db, jwt, jwtSecret, authenticate
}) {
  const conversations = db.collection('conversations');
  const messages = db.collection('messages');
  const uploadDir = path.join(__dirname, 'uploads', 'chat');
  fs.mkdirSync(uploadDir, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadDir),
      filename: (req, file, cb) => {
        const extension = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/webp': '.webp',
          'image/gif': '.gif'
        }[file.mimetype];

        cb(null, crypto.randomUUID() + extension);
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
      ];

      if (!allowed.includes(file.mimetype)) {
        return cb(new Error('Chỉ hỗ trợ JPG, PNG, WEBP hoặc GIF'));
      }

      cb(null, true);
    }
  });
  const users = db.collection('users');

  function getFullName(user) {
    if (!user) return '';

    return String(
      user.fullName ||
      user.fullname ||
      user.full_name ||
      ''
    ).trim();
  }

  async function attachParticipantNames(data) {
    const userIDs = [
      ...new Set(data.flatMap(item => item.participants))
    ];

    const userData = await users
      .find({ userID: { $in: userIDs } })
      .toArray();

    const nameMap = new Map(
      userData.map(user => [
        String(user.userID),
        getFullName(user)
      ])
    );

    const defaultAvatar =
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

    const avatarMap = new Map(
      userData.map(user => [
        String(user.userID),
        user.avatar || defaultAvatar
      ])
    );

    return data.map(conversation => ({
      ...conversation,
      participantNames: Object.fromEntries(
        conversation.participants.map(id => [
          id,
          nameMap.get(id) || id
        ])
      ),

      participantAvatars: Object.fromEntries(
        conversation.participants.map(id => [
          id,
          avatarMap.get(String(id)) || defaultAvatar
        ])
      )

    }));
  }
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

      const result = await attachParticipantNames(data);
      res.json(result);
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
        type: { $ne: 'support' },
        participants,
        productID
      });

      if (existing) return res.json(existing);

      const now = new Date();
      const doc = {
        type: 'product',
        participants,
        productID,
        lastMessage: '',
        createdAt: now,
        updatedAt: now
      };

      const result = await conversations.insertOne(doc);

      // Tạo nội dung tin nhắn chào
      const welcomeMessage = {
        conversationID: result.insertedId.toString(),
        senderID: 'SYSTEM',
        content: 'Xin chào! 👋 Cảm ơn bạn đã quan tâm đến sản phẩm trên EcoCycle. Người bán sẽ phản hồi bạn sớm nhất có thể.',
        type: 'system',
        createdAt: now,
        isRead: false
      };

      // Lưu tin nhắn chào vào MongoDB
      const welcomeResult = await messages.insertOne(welcomeMessage);

      // Cập nhật tin nhắn cuối cùng của cuộc trò chuyện
      await conversations.updateOne(
        { _id: result.insertedId },
        {
          $set: {
            lastMessage: welcomeMessage.content,
            updatedAt: now
          }
        }
      );

      // Chuẩn bị dữ liệu tin nhắn để gửi cho người dùng
      const savedWelcomeMessage = {
        ...welcomeMessage,
        _id: welcomeResult.insertedId
      };

      // Thông báo tin nhắn mới bằng Socket.IO
      for (const participant of participants) {
        io.to(`user:${participant}`).emit(
          'chat:message',
          savedWelcomeMessage
        );
      }

      // Trả kết quả cho Angular
      res.status(201).json({
        ...doc,
        _id: result.insertedId,
        lastMessage: welcomeMessage.content
      });
    } catch {
      res.status(500).json({ message: 'Không thể tạo cuộc trò chuyện' });
    }
  });
  // REST API: Tạo hoặc mở cuộc trò chuyện hỗ trợ Admin
  app.post('/api/chat/support', authenticate, async (req, res) => {
    try {
      // Lấy ID người đang đăng nhập
      const userID = String(req.auth.userID);

      // Tìm một tài khoản Admin trong MongoDB
      const admin = await users.findOne(
        {
          role: 'ADMIN',
          userID: { $ne: userID }
        },
        {
          sort: { userID: 1 }
        }
      );

      if (!admin) {
        return res.status(404).json({
          message: 'Hiện chưa có Admin để hỗ trợ'
        });
      }

      // Xác định hai người tham gia
      const adminID = String(admin.userID);
      const participants = [userID, adminID].sort();

      // Kiểm tra đã có cuộc trò chuyện hỗ trợ chưa
      const existing = await conversations.findOne({
        type: 'support',
        participants
      });

      if (existing) {
        const [conversation] = await attachParticipantNames([existing]);
        return res.json(conversation);
      }

      // Tạo cuộc trò chuyện hỗ trợ mới
      const now = new Date();

      const doc = {
        type: 'support',
        participants,
        productID: '',
        status: 'OPEN',
        lastMessage: '',
        createdAt: now,
        updatedAt: now
      };

      const result = await conversations.insertOne(doc);

      // Tạo lời chào hỗ trợ tự động
      const welcomeMessage = {
        conversationID: result.insertedId.toString(),
        senderID: 'SYSTEM',
        content: 'Xin chào! 👋 Đây là bộ phận hỗ trợ EcoCycle. Bạn cần chúng tôi giúp đỡ vấn đề gì?',
        type: 'system',
        createdAt: now,
        isRead: false
      };

      const welcomeResult = await messages.insertOne(welcomeMessage);

      // Cập nhật tin nhắn cuối cùng
      await conversations.updateOne(
        { _id: result.insertedId },
        {
          $set: {
            lastMessage: welcomeMessage.content,
            updatedAt: now
          }
        }
      );

      // Thông báo cho người dùng và Admin
      const savedMessage = {
        ...welcomeMessage,
        _id: welcomeResult.insertedId
      };

      for (const participant of participants) {
        io.to(`user:${participant}`).emit(
          'chat:message',
          savedMessage
        );
      }

      // Trả cuộc trò chuyện về Angular
      const [conversation] = await attachParticipantNames([
        {
          ...doc,
          _id: result.insertedId,
          lastMessage: welcomeMessage.content
        }
      ]);

      res.status(201).json(conversation);

    } catch (error) {
      console.error('[CHAT SUPPORT]', error);

      res.status(500).json({
        message: 'Không thể tạo cuộc trò chuyện hỗ trợ'
      });
    }
  });

  // API xử lý các chủ đề hỗ trợ tự động
  app.post(
    '/api/chat/support/:conversationID/topic',
    authenticate,
    async (req, res) => {
      try {
        // Lấy thông tin từ Angular
        const userID = String(req.auth.userID);
        const conversationID = String(req.params.conversationID);
        const topicID = String(req.body.topicID || '');

        // Danh sách câu trả lời tự động
        const topics = {
          order: {
            label: 'Đơn hàng',
            reply: 'Để kiểm tra đơn hàng, bạn hãy vào mục Đơn hàng trong tài khoản. Nếu đơn hàng gặp vấn đề, hãy nhắn thông tin cho Admin để được hỗ trợ.'
          },
          coins: {
            label: 'GreenCoins',
            reply: 'GreenCoins là điểm thưởng của EcoCycle. Bạn có thể kiểm tra số điểm trong tài khoản. Nếu điểm bị thiếu hoặc có vấn đề, hãy liên hệ Admin.'
          },
          account: {
            label: 'Tài khoản',
            reply: 'Nếu gặp vấn đề về tài khoản, bạn có thể kiểm tra thông tin cá nhân hoặc chức năng đổi mật khẩu. Nếu không đăng nhập được, hãy liên hệ bộ phận hỗ trợ.'
          },
          report: {
            label: 'Báo cáo vi phạm',
            reply: 'Nếu phát hiện người dùng hoặc sản phẩm vi phạm, vui lòng cung cấp thông tin và bằng chứng để Admin kiểm tra.'
          }
        };

        // Kiểm tra chủ đề có hợp lệ không
        const topic = topics[topicID];

        if (!topic) {
          return res.status(400).json({
            message: 'Chủ đề hỗ trợ không hợp lệ.'
          });
        }

        // Kiểm tra cuộc trò chuyện hỗ trợ
        if (!ObjectId.isValid(conversationID)) {
          return res.status(400).json({
            message: 'Mã cuộc trò chuyện không hợp lệ.'
          });
        }

        const conversation = await conversations.findOne({
          _id: new ObjectId(conversationID),
          type: 'support',
          participants: userID
        });

        if (!conversation) {
          return res.status(404).json({
            message: 'Không tìm thấy cuộc trò chuyện hỗ trợ.'
          });
        }

        // Tạo tin nhắn thể hiện lựa chọn của người dùng
        const now = new Date();

        const userMessage = {
          conversationID,
          senderID: userID,
          content: topic.label,
          type: 'text',
          createdAt: now,
          isRead: false
        };

        const userResult = await messages.insertOne(userMessage);

        // Tạo câu trả lời tự động của hệ thống
        const botMessage = {
          conversationID,
          senderID: 'SYSTEM',
          content: topic.reply,
          type: 'system',
          createdAt: new Date(),
          isRead: false
        };

        const botResult = await messages.insertOne(botMessage);

        // Cập nhật tin nhắn cuối cùng
        await conversations.updateOne(
          { _id: conversation._id },
          {
            $set: {
              lastMessage: botMessage.content,
              updatedAt: new Date()
            }
          }
        );

        // Gửi hai tin nhắn đến người tham gia qua Socket.IO
        const savedUserMessage = {
          ...userMessage,
          _id: userResult.insertedId
        };

        const savedBotMessage = {
          ...botMessage,
          _id: botResult.insertedId
        };

        for (const participant of conversation.participants) {
          io.to(`user:${participant}`).emit('chat:message', savedUserMessage);
          io.to(`user:${participant}`).emit('chat:message', savedBotMessage);
        }

        // Trả kết quả cho Angular
        res.json({
          ok: true,
          userMessage: savedUserMessage,
          botMessage: savedBotMessage
        });

      } catch (error) {
        console.error('[CHAT SUPPORT TOPIC]', error);

        res.status(500).json({
          message: 'Không thể xử lý chủ đề hỗ trợ.'
        });
      }
    }
  );

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
  app.post(
    '/api/chat/conversations/:id/images',
    authenticate,
    (req, res) => {
      upload.single('image')(req, res, async error => {
        if (error) {
          return res.status(400).json({
            message: error.message
          });
        }

        const file = req.file;

        if (!file) {
          return res.status(400).json({
            message: 'Vui lòng chọn hình ảnh'
          });
        }

        try {
          const userID = String(req.auth.userID);
          const conversation = await getConversation(req.params.id, userID);

          if (!conversation) {
            fs.unlinkSync(file.path);
            return res.status(403).json({
              message: 'Không có quyền gửi ảnh'
            });
          }

          // Kiểm tra định dạng thật của ảnh, không chỉ dựa vào MIME.
          const buffer = fs.readFileSync(file.path);
          const isJPEG = buffer.length >= 3 &&
            buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
          const isPNG = buffer.length >= 8 &&
            buffer.subarray(0, 8).equals(
              Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
            );
          const isGIF = buffer.length >= 6 &&
            ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6));
          const isWEBP = buffer.length >= 12 &&
            buffer.toString('ascii', 0, 4) === 'RIFF' &&
            buffer.toString('ascii', 8, 12) === 'WEBP';

          if (!(isJPEG || isPNG || isGIF || isWEBP)) {
            fs.unlinkSync(file.path);
            return res.status(400).json({
              message: 'File không phải hình ảnh hợp lệ'
            });
          }

          const now = new Date();
          const doc = {
            conversationID: conversation._id.toString(),
            senderID: userID,
            content: '',
            imageUrl: `/api/chat/images/${file.filename}`,
            type: 'image',
            createdAt: now,
            isRead: false
          };

          const result = await messages.insertOne(doc);

          await conversations.updateOne(
            { _id: conversation._id },
            {
              $set: {
                lastMessage: '[Hình ảnh]',
                updatedAt: now
              }
            }
          );

          const savedMessage = {
            ...doc,
            _id: result.insertedId
          };

          for (const participant of conversation.participants) {
            io.to(`user:${participant}`).emit('chat:message', savedMessage);
          }

          res.status(201).json(savedMessage);
        } catch (err) {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

          res.status(500).json({
            message: 'Không thể gửi hình ảnh'
          });
        }
      });
    }
  );
  app.get('/api/chat/images/:filename', authenticate, async (req, res) => {
    try {
      const filename = req.params.filename;

      if (!/^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(filename)) {
        return res.sendStatus(400);
      }

      const imageUrl = `/api/chat/images/${filename}`;
      const message = await messages.findOne({ imageUrl });

      if (!message) return res.sendStatus(404);

      const conversation = await getConversation(
        message.conversationID,
        String(req.auth.userID)
      );

      if (!conversation) return res.sendStatus(403);

      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.sendFile(path.join(uploadDir, filename));
    } catch {
      res.sendStatus(500);
    }
  });
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
