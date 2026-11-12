# HỆ THỐNG ECOCYCLE - NỀN TẢNG TUẦN HOÀN THIẾT BỊ ĐIỆN TỬ & RÁC THẢI CÔNG NGHỆ

## 1. Giới thiệu tổng quan hệ thống

**ECOCycle** là hệ sinh thái kinh tế tuần hoàn ứng dụng công nghệ thông tin trong việc quản lý, mua bán thiết bị điện tử cũ/mới, sửa chữa, thẩm định AI và tái chế rác thải công nghệ (E-Waste). Hệ thống khuyến khích người dùng tham gia bảo vệ môi trường thông qua chương trình tích lũy điểm thưởng **GreenCoins**.

### Các trụ cột tính năng chính:
1. **Sàn thương mại điện tử công nghệ (Marketplace):** Mua bán thiết bị công nghệ mới (Brandnew) và thiết bị đã qua sử dụng (Resell).
2. **Thẩm định & Khuyến nghị bằng AI (AI Assessment):** Đánh giá tình trạng thiết bị, đề xuất hai hướng xử lý (Sửa chữa / Bán lại) và ước lượng giá tham khảo.
3. **Dịch vụ Sửa chữa thiết bị (Repair Services):** Đặt lịch hẹn và theo dõi tiến độ sửa chữa từ các trạm dịch vụ ủy quyền.
4. **Dịch vụ Thu gom & Tái chế (Recycle Services):** Đăng ký thu gom rác thải điện tử tận nhà, chuyển giao xử lý an toàn và nhận GreenCoins.
5. **Chương trình Điểm thưởng Xu Xanh (GreenCoins Loyalty):** Tích lũy GreenCoins khi mua sắm đồ cũ, tái chế hoặc tham gia các hoạt động xanh; sử dụng để giảm giá đơn hàng.
6. **Quản lý Đơn hàng, Giỏ hàng & Hóa đơn điện tử:** Quy trình đặt hàng, xử lý phân tách gói hàng theo từng Người bán (Seller Package), trừ/cộng tồn kho và sinh hóa đơn điện tử tự động.
7. **Hội thoại & Thông báo theo thời gian thực:** Trao đổi trực tiếp giữa Người mua và Người bán; cập nhật thông báo biến động đơn hàng, dịch vụ và điểm thưởng.

---

## 2. Kiến trúc kỹ thuật

- **Frontend:** Angular 22 (TypeScript, HTML5, CSS3 / Tailwind CSS, Bootstrap Icons, Signals, Router, Module-based & Standalone Architecture).
- **Backend API:** Node.js, Express.js RESTful API, MongoDB Native Driver.
- **Database:** MongoDB Atlas Cloud / MongoDB Local (`EcoCycleDatabase`) cấu hình linh hoạt qua file `.env`.

---

## 3. Danh mục và Mô tả chi tiết 14 Collections trong MongoDB
 
Hệ thống quản lý dữ liệu tập trung qua **14 collections** trong cơ sở dữ liệu `EcoCycleDatabase`:
 
| STT | Tên Collection | Mô tả chức năng | Khóa chính / Định danh |
|:---:|---|---|---|
| 1 | `users` | Lưu trữ toàn bộ tài khoản người dùng (Khách hàng, Người bán, Kỹ thuật viên, Quản trị viên). | `userID` |
| 2 | `products` | Cây danh mục và thông tin chi tiết các sản phẩm/linh kiện đang được niêm yết. | `CateID`, `Products.id` |
| 3 | `sellOrders` | Quản lý các đơn hàng mua sắm thiết bị điện tử (Brandnew & Resell). | `orderID` |
| 4 | `productRequests` | Quản lý các yêu cầu đăng bán sản phâmt. | `requestId` |
| 5 | `repairOrders` | Quản lý các đơn yêu cầu dịch vụ sửa chữa thiết bị. | `repairOrderID` |
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
- **MongoDB**: Đã kết nối cơ sở dữ liệu MongoDB Atlas Cloud (hoặc chạy local cấu hình trong `.env`).
- **Angular CLI**: Cài đặt toàn cục (`npm install -g @angular/cli`).

---

### Bước 1: Khởi động Backend API Server (Port 3000)

Mở một cửa sổ Terminal, di chuyển vào thư mục backend và chạy lệnh:

```bash
cd database-mongodb
npm install
npm start
```

> **Ghi chú:** Lệnh `npm start` sẽ khởi chạy file `index.js`, tự động kết nối trực tiếp đến cơ sở dữ liệu `EcoCycleDatabase` trên MongoDB Atlas Cloud (cấu hình trong `.env`) và lắng nghe tại cổng `http://localhost:3000`.
>
> *Lưu ý cấu hình môi trường:* Đảm bảo file `database-mongodb/.env` đã có đầy đủ các biến cấu hình `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY` (tham khảo mẫu tại `.env.example`).

Có thể kiểm tra các luồng xác thực và API trên trình duyệt / Postman:

```text
http://localhost:3000/api/auth
http://localhost:3000/products
```

---

### Bước 2: Khởi động Ứng dụng Frontend Angular (Port 4200)

Mở một cửa sổ Terminal thứ hai, di chuyển vào thư mục frontend và chạy lệnh:

```bash
cd web2-final
ng serve -o
```

> **Ghi chú:** Lệnh `ng serve -o` sẽ biên dịch mã nguồn Angular và tự động mở trình duyệt mặc định truy cập vào địa chỉ: **`http://localhost:4200`**.

---

### Quy trình nghiệp vụ chính: Đánh giá sửa chữa & Đăng bán (AI Gemini)

Khi người dùng gửi thiết bị sửa chữa tại `/sua-chua`:
1. Gemini AI thẩm định tình trạng, đề xuất 2 phương án: **Sửa chữa** hoặc **Bán lại** cùng giá tham khảo.
2. Gemini lưu kết quả đánh giá vào collection `AI_assessments` và cập nhật trạng thái yêu cầu.
3. Quản trị viên/Kỹ thuật viên có thể theo dõi yêu cầu tại trang `/admin`.
