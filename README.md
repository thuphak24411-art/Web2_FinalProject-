# HỆ THỐNG ECOCYCLE - NỀN TẢNG TUẦN HOÀN THIẾT BỊ ĐIỆN TỬ & RÁC THẢI CÔNG NGHỆ

## 1. Giới thiệu tổng quan hệ thống

**ECOCycle** là hệ sinh thái kinh tế tuần hoàn ứng dụng công nghệ thông tin trong việc quản lý, mua bán thiết bị điện tử cũ/mới, sửa chữa, thẩm định AI và tái chế rác thải công nghệ (E-Waste). Hệ thống khuyến khích người dùng tham gia bảo vệ môi trường thông qua chương trình tích lũy điểm thưởng **GreenCoins**.

### Các trụ cột tính năng chính:
1. **Sàn thương mại điện tử công nghệ (Marketplace):** Mua bán thiết bị công nghệ mới (Brandnew) và thiết bị đã qua sử dụng (Resell).
2. **Thẩm định & Khuyến nghị bằng AI (AI Assessment):** Đánh giá tình trạng linh kiện/thiết bị từ dữ liệu đầu vào, đề xuất giải pháp (Sửa chữa / Bán lại / Tái chế), ước lượng chi phí và lượng khí thải CO₂ giảm thiểu.
3. **Dịch vụ Sửa chữa thiết bị (Repair Services):** Đặt lịch hẹn và theo dõi tiến độ sửa chữa từ các trạm dịch vụ ủy quyền.
4. **Dịch vụ Thu gom & Tái chế (Recycle Services):** Đăng ký thu gom rác thải điện tử tận nhà, chuyển giao xử lý an toàn và nhận GreenCoins.
5. **Chương trình Điểm thưởng Xu Xanh (GreenCoins Loyalty):** Tích lũy GreenCoins khi mua sắm đồ cũ, tái chế hoặc tham gia các hoạt động xanh; sử dụng để giảm giá đơn hàng.
6. **Quản lý Đơn hàng, Giỏ hàng & Hóa đơn điện tử:** Quy trình đặt hàng, xử lý phân tách gói hàng theo từng Người bán (Seller Package), trừ/cộng tồn kho và sinh hóa đơn điện tử tự động.
7. **Hội thoại & Thông báo theo thời gian thực:** Trao đổi trực tiếp giữa Người mua và Người bán; cập nhật thông báo biến động đơn hàng, dịch vụ và điểm thưởng.

---

## 2. Kiến trúc kỹ thuật

- **Frontend:** Angular 20 (TypeScript, HTML5, CSS3 / Tailwind CSS, Bootstrap Icons, Signals, Router, Module-based & Standalone Architecture).
- **Backend API:** Node.js, Express.js RESTful API, MongoDB Native Driver.
- **Database:** MongoDB Local (`EcoCycleDatabase`) kết nối qua cổng mặc định `mongodb://127.0.0.1:27017`.
- **Tài khoản mặc định thử nghiệm:**
  - **Mã người dùng (userID):** `CM000001`
  - **Họ và tên:** Lê Quốc Khoa
  - **Số dư GreenCoins ban đầu:** 3.420 GreenCoins

---

## 3. Danh mục và Mô tả chi tiết 13 Collections trong MongoDB

Hệ thống quản lý dữ liệu tập trung qua **13 collections** trong cơ sở dữ liệu `EcoCycleDatabase`:

| STT | Tên Collection | Mô tả chức năng | Khóa chính / Định danh |
|:---:|---|---|---|
| 1 | `users` | Lưu trữ toàn bộ tài khoản người dùng (Khách hàng, Người bán, Kỹ thuật viên, Quản trị viên). | `userID` |
| 2 | `products` | Cây danh mục và thông tin chi tiết các sản phẩm/linh kiện đang được niêm yết. | `CateID`, `Products.id` |
| 3 | `sellOrders` | Quản lý các đơn hàng mua sắm thiết bị điện tử (Brandnew & Resell). | `orderID` |
| 4 | `repairOrders` | Quản lý các đơn yêu cầu dịch vụ sửa chữa thiết bị. | `repairOrderID` |
| 5 | `recycleOrders` | Quản lý các đơn đăng ký thu gom và tái chế rác thải điện tử. | `recycleOrderID` |
| 6 | `invoices` | Quản lý thông tin hóa đơn điện tử, thanh toán và chiết khấu. | `invoiceID` |
| 7 | `greencoins` | Ghi nhận sổ cái lịch sử giao dịch, tích lũy và sử dụng GreenCoins. | `transactionID` |
| 8 | `carts` | Giỏ hàng của từng người dùng được đồng bộ và lưu trữ trên cơ sở dữ liệu. | `userID` / `cartID` |
| 9 | `notifications` | Danh sách thông báo gửi đến từng người dùng về đơn hàng, dịch vụ, điểm thưởng. | `notificationID` |
| 10 | `AI_assessments` | Kết quả phân tích, thẩm định thiết bị, ước tính giá và lượng CO₂ từ AI. | `assessmentID` |
| 11 | `reviews` | Đánh giá, xếp hạng sao và bình luận của khách hàng về sản phẩm/dịch vụ. | `reviewID` |
| 12 | `chats` | Quản lý các phòng hội thoại giữa người mua và người bán. | `chatID` |
| 13 | `messages` | Nội dung chi tiết các tin nhắn trong từng cuộc hội thoại. | `messageID` |

---

## 4. Hướng dẫn Cài đặt & Khởi chạy Dự án

### Yêu cầu môi trường:
- **Node.js**: Phiên bản 18.x trở lên.
- **MongoDB**: Đang chạy cục bộ tại `mongodb://127.0.0.1:27017`.
- **Angular CLI**: Phiên bản 20.x (`npm install -g @angular/cli`).

### Bước 1: Khởi động Cơ sở dữ liệu MongoDB
Đảm bảo dịch vụ MongoDB đã được bật:
```bash
mongod --dbpath <đường_dẫn_lưu_data>
```
Cơ sở dữ liệu: `EcoCycleDatabase`.

### Bước 2: Khởi động Backend API Server (Port 3000)
Vào thư mục backend và chạy server Express:
```bash
cd final/Web2_FinalProject-/database-mongodb
node index.js
```
Server chạy tại: `http://localhost:3000`.

### Bước 3: Khởi động Ứng dụng Frontend Angular (Port 4200)
Mở một terminal mới, chuyển vào thư mục frontend:
```bash
cd final/Web2_FinalProject-/web2-final
npm install
npm start
```
Mở trình duyệt truy cập: `http://localhost:4200`.
