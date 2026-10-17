
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomInt } = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "ecocycle-jwt-secret-key-2026";

function createAuthRouter(db) {
  const router = express.Router();
  const users = db.collection("users");

  router.get("/", (_req, res) => {
    return res.json({
      service: "ECOCycle authentication API",
      endpoints: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        currentUser: "GET /api/auth/me (Bearer token)",
        profile: "PUT /api/auth/profile (Bearer token)"
      },
      message: "Hãy sử dụng giao diện Angular tại http://localhost:4200/register để đăng ký."
    });
  });

  router.get("/register", (_req, res) => {
    return res.redirect(302, "http://localhost:4300/register");
  });

  router.get("/login", (_req, res) => {
    return res.redirect(302, "http://localhost:4300/login");
  });

  async function generateUserID(role) {
    const prefixes = {
      CUSTOMER: "CM",
      SELLER: "SL",
      TECHNICIAN: "TC",
      ADMIN: "AD"
    };

    const prefix = prefixes[role];

    for (let i = 0; i < 10; i++) {
      const number = randomInt(0, 1000000);
      const userID = prefix + String(number).padStart(6, "0");

      const exists = await users.findOne(
        { userID },
        { projection: { _id: 1 } }
      );

      if (!exists) return userID;
    }

    throw new Error("Không thể tạo mã người dùng.");
  }

  function createToken(user) {
    return jwt.sign(
      {
        userID: user.userID,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );
  }

  function publicUser(user) {
    const {
      password,
      ...safeUser
    } = user;

    return safeUser;
  }

  router.post("/register", async (req, res) => {
    try {
      const {
        userName,
        fullName,
        email,
        phoneNumber,
        province,
        district,
        streetAddress,
        businessName,
        shopName,
        password,
        role
      } = req.body;

      if (
        !userName ||
        !fullName ||
        !email ||
        !phoneNumber ||
        !province ||
        !streetAddress ||
        !password
      ) {
        return res.status(400).json({
          message: "Vui lòng nhập đầy đủ thông tin bắt buộc."
        });
      }

      const normalizedUserName = String(userName)
        .trim()
        .toLowerCase();

      const normalizedEmail = String(email)
        .trim()
        .toLowerCase();

      const normalizedFullName = String(fullName).trim();

      const normalizedPhone = String(phoneNumber || "")
        .trim()
        .replace(/[\s.-]/g, "");
      const normalizedProvince = String(province || "").trim();
      const normalizedDistrict = String(district || "").trim();
      const normalizedStreetAddress = String(streetAddress || "").trim();
      const normalizedBusinessName = String(businessName || "").trim();
      const normalizedShopName = String(shopName || "").trim();

      if (
        normalizedUserName.length < 3 ||
        normalizedUserName.length > 30 ||
        !/^[a-zA-Z0-9_.-]+$/.test(normalizedUserName)
      ) {
        return res.status(400).json({
          message: "Username dài 3–30 ký tự, chỉ dùng chữ, số, _, dấu chấm hoặc gạch ngang."
        });
      }

      if (
        normalizedFullName.length < 2 ||
        normalizedFullName.length > 100
      ) {
        return res.status(400).json({
          message: "Họ tên không hợp lệ."
        });
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      ) {
        return res.status(400).json({
          message: "Email không hợp lệ."
        });
      }

      if (
        typeof password !== "string" ||
        password.length < 8 ||
        password.length > 72 ||
        !/[a-z]/.test(password) ||
        !/[A-Z]/.test(password) ||
        !/[0-9]/.test(password) ||
        !/[^A-Za-z0-9]/.test(password)
      ) {
        return res.status(400).json({
          message: "Mật khẩu cần tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt."
        });
      }

      if (!/^(?:0|\+84)(?:3|5|7|8|9)\d{8}$/.test(normalizedPhone)) {
        return res.status(400).json({
          message: "Số điện thoại là bắt buộc và phải là số di động hợp lệ."
        });
      }


      const selectedRole = role || "CUSTOMER";

      if (!["CUSTOMER", "SELLER"].includes(selectedRole)) {
        return res.status(403).json({
          message: "Vai trò đăng ký không được hỗ trợ."
        });
      }
      if (normalizedProvince.length > 100 || normalizedDistrict.length > 100 ||
          normalizedStreetAddress.length < 3 || normalizedStreetAddress.length > 250) {
        return res.status(400).json({ message: "Địa chỉ tỉnh/thành, quận/huyện hoặc số nhà/đường không hợp lệ." });
      }
      if (selectedRole === "SELLER" &&
          (normalizedBusinessName.length < 2 || normalizedBusinessName.length > 120 ||
           normalizedShopName.length < 2 || normalizedShopName.length > 80)) {
        return res.status(400).json({ message: "Cửa hàng cần có tên doanh nghiệp và tên shop hợp lệ." });
      }
      const formattedAddress = [
        normalizedStreetAddress,
        normalizedDistrict,
        normalizedProvince
      ].filter(Boolean).join(", ");

      const existingEmail = await users.findOne(
        { email: normalizedEmail },
        { projection: { _id: 1 } }
      );
      if (existingEmail) {
        return res.status(409).json({
          code: "EMAIL_ALREADY_REGISTERED",
          message: "Email này đã được đăng ký. Vui lòng nhập email khác."
        });
      }

      const existingUserName = await users.findOne(
        { userName: normalizedUserName },
        { projection: { _id: 1 } }
      );
      if (existingUserName) {
        return res.status(409).json({
          code: "USERNAME_ALREADY_REGISTERED",
          message: "Username đã được sử dụng. Vui lòng chọn username khác."
        });
      }

      const userID = await generateUserID(selectedRole);
      const passwordHash = await bcrypt.hash(password, 12);

      const newUser = {
        userID,
        userName: normalizedUserName,
        fullName: normalizedFullName,
        email: normalizedEmail,
        phoneNumber: normalizedPhone,
        password: passwordHash,

        role: selectedRole,
        status: "ACTIVE",

        greenCoins: 0,
        eWasteRecycledKg: 0,
        joinDate: new Date().toISOString(),

        customerDetails:
          selectedRole === "CUSTOMER"
            ? {
                address: formattedAddress,
                province: normalizedProvince,
                district: normalizedDistrict,
                streetAddress: normalizedStreetAddress,
                bankInfo: {
                  bankName: "",
                  accountNumber: "",
                  accountHolder: ""
                }
              }
            : undefined,

        sellerDetails:
          selectedRole === "SELLER"
            ? {
                address: formattedAddress,
                province: normalizedProvince,
                district: normalizedDistrict,
                streetAddress: normalizedStreetAddress,
                businessName: normalizedBusinessName,
                shopName: normalizedShopName,
                taxCode: "",
                bankInfo: {
                  bankName: "",
                  accountNumber: "",
                  accountHolder: ""
                }
              }
            : undefined,

        avatar: "",
        isVerified: false
      };

      await users.insertOne(newUser);

      return res.status(201).json({
        message: "Đăng ký tài khoản thành công.",
        user: publicUser(newUser)
      });
    } catch (error) {
      console.error("Register error:", error);

   
      if (error.code === 11000) {
        if (error.keyPattern?.email || error.keyValue?.email) {
          return res.status(409).json({
            code: "EMAIL_ALREADY_REGISTERED",
            message: "Email này đã được đăng ký. Vui lòng nhập email khác."
          });
        }
        if (error.keyPattern?.userName || error.keyValue?.userName) {
          return res.status(409).json({
            code: "USERNAME_ALREADY_REGISTERED",
            message: "Username đã được sử dụng. Vui lòng chọn username khác."
          });
        }
        return res.status(409).json({
          message: "Username hoặc email đã tồn tại."
        });
      }

      return res.status(500).json({
        message: "Lỗi máy chủ khi đăng ký tài khoản."
      });
    }
  });

  
  router.post("/login", async (req, res) => {
    try {
      const { identifier, password } = req.body;

      if (
        typeof identifier !== "string" ||
        typeof password !== "string" ||
        !identifier.trim() ||
        !password
      ) {
        return res.status(400).json({
          message: "Vui lòng nhập tài khoản và mật khẩu."
        });
      }

      const account = identifier.trim().toLowerCase();

      const user = await users.findOne({
        $or: [
          { userName: account },
          { email: account },
          { userID: identifier.trim() },
          { userID: account }
        ]
      });

      if (!user || !user.password) {
        return res.status(401).json({
          message: "Tài khoản hoặc mật khẩu không chính xác."
        });
      }

      const isHashedPassword = typeof user.password === "string"
        && /^\$2[aby]\$\d{2}\$/.test(user.password);
      let passwordMatches = isHashedPassword
        ? await bcrypt.compare(password, user.password)
        : user.password === password;

      if (passwordMatches && !isHashedPassword) {
        await users.updateOne(
          { _id: user._id },
          { $set: { password: await bcrypt.hash(password, 12) } }
        );
      }

      if (!passwordMatches) {
        return res.status(401).json({
          message: "Tài khoản hoặc mật khẩu không chính xác."
        });
      }

      if (user.status !== "ACTIVE") {
        return res.status(403).json({
          message: "Tài khoản đã bị khóa hoặc ngừng hoạt động."
        });
      }

      const token = createToken(user);

      return res.json({
        message: "Đăng nhập thành công.",
        token,
        user: publicUser(user)
      });
    } catch (error) {
      console.error("Login error:", error);

      return res.status(500).json({
        message: "Lỗi máy chủ khi đăng nhập."
      });
    }
  });

  
  router.get("/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : "";

      if (!token) {
        return res.status(401).json({
          message: "Bạn chưa đăng nhập."
        });
      }

      const decoded = jwt.verify(token, JWT_SECRET);

      const user = await users.findOne({
        userID: decoded.userID
      });

      if (!user || user.status !== "ACTIVE") {
        return res.status(401).json({
          message: "Tài khoản không tồn tại hoặc đã bị khóa."
        });
      }

      return res.json({
        user: publicUser(user)
      });
    } catch (error) {
      return res.status(401).json({
        message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."
      });
    }
  });

  router.put("/profile", async (req, res) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return res.status(401).json({ message: "Bạn chưa đăng nhập." });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (_error) {
      return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
    }

    try {
      const {
        fullName, email, phoneNumber, address,
        province, district, streetAddress, businessName, shopName
      } = req.body;
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const normalizedFullName = String(fullName || "").trim();
      const normalizedPhone = String(phoneNumber || "").trim();

      if (normalizedFullName.length < 2 || normalizedFullName.length > 100) {
        return res.status(400).json({ message: "Họ tên không hợp lệ." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({ message: "Email không hợp lệ." });
      }
      if (normalizedPhone && !/^[0-9+()\-\s]{9,20}$/.test(normalizedPhone)) {
        return res.status(400).json({ message: "Số điện thoại không hợp lệ." });
      }

      const duplicate = await users.findOne({
        email: normalizedEmail,
        userID: { $ne: decoded.userID }
      });
      if (duplicate) return res.status(409).json({ message: "Email đã được sử dụng." });

      const current = await users.findOne({ userID: decoded.userID });
      if (!current) return res.status(404).json({ message: "Không tìm thấy tài khoản." });

      const detailsKey = current.role === "SELLER" ? "sellerDetails" : "customerDetails";
      const currentDetails = current[detailsKey] || {};
      const normalizedProvince = String(province ?? currentDetails.province ?? "").trim();
      const normalizedDistrict = String(district ?? currentDetails.district ?? "").trim();
      const normalizedStreetAddress = String(streetAddress ?? currentDetails.streetAddress ?? address ?? "").trim();
      const normalizedBusinessName = String(businessName ?? currentDetails.businessName ?? "").trim();
      const normalizedShopName = String(shopName ?? currentDetails.shopName ?? "").trim();
      if (!normalizedProvince || normalizedProvince.length > 100 ||
          normalizedDistrict.length > 100 ||
          normalizedStreetAddress.length < 3 || normalizedStreetAddress.length > 250) {
        return res.status(400).json({ message: "Vui lòng nhập tỉnh/thành và địa chỉ số nhà, đường hợp lệ." });
      }
      if (current.role === "SELLER" &&
          (normalizedBusinessName.length < 2 || normalizedBusinessName.length > 120 ||
           normalizedShopName.length < 2 || normalizedShopName.length > 80)) {
        return res.status(400).json({ message: "Tên doanh nghiệp và tên shop không hợp lệ." });
      }
      const details = {
        ...currentDetails,
        address: [normalizedStreetAddress, normalizedDistrict, normalizedProvince].filter(Boolean).join(", "),
        province: normalizedProvince,
        district: normalizedDistrict,
        streetAddress: normalizedStreetAddress,
        ...(current.role === "SELLER" ? { businessName: normalizedBusinessName, shopName: normalizedShopName } : {})
      };
      await users.updateOne(
        { userID: decoded.userID },
        {
          $set: {
            fullName: normalizedFullName,
            email: normalizedEmail,
            phoneNumber: normalizedPhone,
            [detailsKey]: details
          }
        }
      );

      const updated = await users.findOne({ userID: decoded.userID });
      return res.json({ message: "Cập nhật hồ sơ thành công.", user: publicUser(updated) });
    } catch (error) {
      console.error("Profile update error:", error);
      return res.status(500).json({ message: "Không thể cập nhật hồ sơ lúc này." });
    }
  });

  return router;
}

module.exports = createAuthRouter;