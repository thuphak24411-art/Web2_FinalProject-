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
8. **Đánh giá & Xếp hạng (Reviews):** Phản hồi chất lượng sản phẩm và dịch vụ sau khi hoàn tất giao dịch.

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

### Chi tiết cấu trúc dữ liệu từng Collection

#### 1. Collection `users`
Lưu trữ hồ sơ tài khoản, phân quyền, địa chỉ, tài khoản ngân hàng và điểm thưởng sinh thái.
- **Các trường chính:**
  - `userID` (string): Mã định danh người dùng (VD: `CM000001`, `SL000001`).
  - `userName` (string): Tên đăng nhập.
  - `fullName` (string): Họ và tên đầy đủ.
  - `email` (string): Địa chỉ email.
  - `phoneNumber` (string): Số điện thoại liên lạc.
  - `role` (string): Vai trò (`CUSTOMER`, `SELLER`, `TECHNICIAN`, `ADMIN`).
  - `status` (string): Trạng thái tài khoản (`ACTIVE`, `INACTIVE`).
  - `greenCoins` (number): Số dư điểm thưởng GreenCoins hiện tại.
  - `eWasteRecycledKg` (number): Khối lượng rác thải điện tử đã tái chế (kg).
  - `customerDetails` (object): Địa chỉ giao nhận, thông tin tài khoản ngân hàng.
  - `sellerDetails` (object): Địa chỉ cửa hàng, mã số thuế, chính sách bán hàng.

#### 2. Collection `products`
Tổ chức dữ liệu theo danh mục mẹ (`CateID`) chứa mảng các sản phẩm con (`Products`).
- **Các trường chính:**
  - `CateID` (string): Mã danh mục (VD: `CAT001`, `CAT002`).
  - `CateName` (string): Tên danh mục (Điện thoại, Laptop, Linh kiện, Phụ kiện...).
  - `Products` (array): Danh sách các sản phẩm:
    - `id` (string): Mã sản phẩm duy nhất (VD: `SP000001`).
    - `title` (string): Tên sản phẩm.
    - `Price` (number): Giá bán niêm yết (VNĐ).
    - `Image` / `images` (string / array): Đường dẫn hình ảnh minh họa.
    - `condition` (string): Tình trạng máy (Mới 100%, 99%, Cũ...).
    - `quantity` (number): Số lượng tồn kho còn lại.
    - `sellerid` (string): Mã người bán đăng tin (`sellerID`).
    - `Status` (string): Trạng thái sản phẩm (`Sẵn có`, `Đã bán`, `Hết hàng`).

#### 3. Collection `sellOrders`
Quản lý các đơn hàng thương mại điện tử do khách hàng đặt mua.
- **Các trường chính:**
  - `orderID` (string): Mã đơn hàng (VD: `OD000001`, `OD654321`).
  - `orderType` (string): Phân loại đơn (`brandnew` hoặc `resell`).
  - `customerID` (string): Mã khách hàng đặt hàng (`userID`).
  - `sellerID` (string): Mã người bán chịu trách nhiệm đơn.
  - `sellerInfo` (object): Thông tin tóm tắt của người bán (Tên, địa chỉ, ảnh đại diện).
  - `invoiceNumber` (string): Số hóa đơn liên kết (`invoices.invoiceNumber`).
  - `orderDate` (string): Ngày tạo đơn hàng.
  - `shippingAddress` (string): Địa chỉ nhận hàng chi tiết.
  - `products` (array): Danh sách mặt hàng mua (Mã, tên, hình ảnh, số lượng, đơn giá).
  - `subtotal` (string / number): Tổng tiền hàng.
  - `shippingFee` (string / number): Phí vận chuyển.
  - `totalPrice` (string / number): Tổng tiền thanh toán.
  - `earnedCoins` (number): Số GreenCoins thưởng khi đơn hoàn tất (10.000 xu).
  - `status` (string): Trạng thái (`Chờ xác nhận`, `Đang chuẩn bị hàng`, `Đang vận chuyển`, `Đã giao`, `Đã hủy`).

#### 4. Collection `repairOrders`
Lưu trữ đơn dịch vụ sửa chữa thiết bị điện tử.
- **Các trường chính:**
  - `repairOrderID` (string): Mã đơn sửa chữa (VD: `RP000001`).
  - `requestID` (string): Mã yêu cầu thẩm định AI liên kết (`AI_assessments.requestID`).
  - `customerID` (string): Mã khách hàng.
  - `storeID` (string): Mã trạm/trung tâm sửa chữa tiếp nhận.
  - `orderDate` (string): Ngày tạo phiếu sửa chữa.
  - `pickupDate` (string): Ngày hẹn nhận/giao máy.
  - `shippingAddress` (string): Địa chỉ nhận máy hoặc sửa tại nhà.
  - `finalCost` (number): Chi phí sửa chữa cuối cùng.
  - `status` (string): Trạng thái (`Chờ tiếp nhận`, `Đang kiểm tra`, `Đang sửa chữa`, `Hoàn thành`, `Đã hủy`).

#### 5. Collection `recycleOrders`
Lưu trữ đơn thu gom rác thải điện tử và tái chế.
- **Các trường chính:**
  - `recycleOrderID` (string): Mã đơn thu gom tái chế (VD: `RC000001`).
  - `requestID` (string): Mã yêu cầu thẩm định AI ban đầu.
  - `customerID` (string): Mã khách hàng bàn giao rác thải.
  - `connectedUnit` (string): Đơn vị môi trường / nhà máy xử lý liên kết tiếp nhận.
  - `orderDate` (string): Ngày gửi yêu cầu.
  - `pickupDate` (string): Ngày nhân viên đến thu gom.
  - `shippingAddress` (string): Địa chỉ điểm thu gom.
  - `co2ReducedKg` (number): Ước tính lượng khí thải CO₂ giảm được (kg).
  - `greenCoinsEarned` (number): Số lượng GreenCoins thưởng cho khách hàng.
  - `status` (string): Trạng thái (`Chờ xác nhận`, `Đang thu gom`, `Đã tái chế`, `Đã hủy`).

#### 6. Collection `invoices`
Hóa đơn tài chính điện tử cho các giao dịch trong hệ thống.
- **Các trường chính:**
  - `invoiceID` (string): Mã bản ghi hóa đơn (VD: `IV000001`).
  - `invoiceNumber` (string): Số hiệu hóa đơn (VD: `HD20261001`).
  - `orderID` (string): Mã đơn hàng liên kết (`sellOrders.orderID`).
  - `orderType` (string): Phân loại đơn hàng.
  - `customerID` (string): Mã khách hàng.
  - `sellerID` (string): Mã người bán.
  - `subtotal` (number): Tổng tiền sản phẩm trước giảm trừ.
  - `shippingFee` (number): Cước phí vận chuyển.
  - `discount` (number): Giảm giá khuyến mãi / voucher.
  - `greenCoinsDiscount` (number): Số tiền được khấu trừ từ việc tiêu dùng GreenCoins.
  - `totalPrice` (number): Số tiền thực thu cuối cùng.
  - `paymentMethod` (string): Phương thức thanh toán (COD, Chuyển khoản, Thẻ).
  - `paymentStatus` (string): Tình trạng (`Chưa thanh toán`, `Đã thanh toán`, `Hoàn tiền`).
  - `issuedDate` (string): Ngày phát hành hóa đơn.

#### 7. Collection `greencoins`
Sổ cái giao dịch điểm thưởng sinh thái GreenCoins.
- **Các trường chính:**
  - `transactionID` (string): Mã giao dịch GreenCoins (VD: `TS000001`).
  - `orderID` (string): Mã đơn hàng liên quan (`OD...`, `RP...`, `RC...`).
  - `orderType` (string): Loại đơn (`sell_order`, `repair_order`, `recycle_order`).
  - `userInfo` (object): Mã người dùng và tên người nhận/tiêu dùng xu.
  - `productName` (string): Tên thiết bị hoặc hoạt động phát sinh xu.
  - `action` (string): Hoạt động (`Mua hàng`, `Sửa chữa`, `Tái chế rác thải`, `Đổi quà`).
  - `greenCoins` (number): Số điểm biến động (VD: `+10000`, `-5000`).
  - `transactionDate` (string): Thời điểm ghi nhận giao dịch.

#### 8. Collection `carts`
Lưu trữ trạng thái giỏ hàng của từng tài khoản, phục vụ đồng bộ đa thiết bị.
- **Các trường chính:**
  - `cartID` (string): Mã giỏ hàng (VD: `CART_CM000001`).
  - `userID` (string): Mã người dùng sở hữu giỏ hàng.
  - `items` (array): Danh sách sản phẩm trong giỏ:
    - `productId` (string): Mã sản phẩm (`SP000001`).
    - `title` (string): Tên sản phẩm.
    - `price` (number): Đơn giá.
    - `quantity` (number): Số lượng chọn mua.
    - `img` (string): Hình ảnh sản phẩm.
    - `sellerId` (string): Người bán sản phẩm.
    - `condition` (string): Tình trạng mặt hàng.
  - `updatedAt` (string): Thời gian cập nhật gần nhất.

#### 9. Collection `notifications`
Trung tâm thông báo tài khoản người dùng theo thời gian thực.
- **Các trường chính:**
  - `notificationID` (string): Mã thông báo (VD: `NT000001`).
  - `userID` (string): Mã người nhận thông báo (`CM000001`).
  - `type` (string): Phân loại (`order`, `green_coin`, `repair`, `recycle`, `seller`).
  - `title` (string): Tiêu đề thông báo tóm tắt.
  - `content` (string): Nội dung chi tiết thông báo.
  - `targetID` (string): Mã đối tượng liên quan để điều hướng (`OD000001`, `TS000001`...).
  - `isRead` (boolean): Trạng thái đã đọc (`true` / `false`).
  - `createdAt` (string): Thời điểm gửi thông báo.

#### 10. Collection `AI_assessments`
Lưu trữ báo cáo chẩn đoán và định giá thiết bị tự động từ AI.
- **Các trường chính:**
  - `assessmentID` (string): Mã bản ghi thẩm định (VD: `ASM000001`).
  - `requestID` (string): Mã yêu cầu thẩm định từ người dùng (VD: `REQ000001`).
  - `productInfo` (object): Tên thiết bị, hình ảnh chụp, tình trạng hư hại thực tế.
  - `recommendedAction` (string): Hành động AI đề xuất (`Sửa chữa`, `Bán lại`, `Tái chế`).
  - `estimatedRepairCost` (number): Chi phí sửa chữa dự kiến.
  - `estimatedResalePrice` (number): Giá bán lại thị trường dự kiến.
  - `estimatedRecycleCost` (number): Phí xử lý hoặc giá thu mua tái chế.
  - `co2Reduced` (number): Ước tính số kg khí CO₂ giảm thiểu được cho môi trường.
  - `greenCoinOptions` (object): Quyền lợi nhận thưởng GreenCoins theo từng lựa chọn.

#### 11. Collection `reviews`
Đánh giá và phản hồi của người mua về sản phẩm và nhà bán hàng.
- **Các trường chính:**
  - `reviewID` (string): Mã đánh giá (VD: `RV000001`).
  - `orderID` (string): Mã đơn hàng hoàn thành được đánh giá.
  - `productID` (string): Mã sản phẩm được đánh giá.
  - `userID` (string): Mã người dùng viết đánh giá.
  - `rating` (number): Điểm đánh giá số sao (Từ 1 đến 5).
  - `comment` (string): Nội dung nhận xét chi tiết.
  - `reviewDate` (string): Ngày đăng bài đánh giá.

#### 12. Collection `chats`
Quản lý các phòng hội thoại kết nối giữa người mua và người bán.
- **Các trường chính:**
  - `chatID` (string): Mã cuộc hội thoại (VD: `CHAT000001`).
  - `participants` (array): Danh sách các mã người dùng tham gia phòng chat.
  - `lastMessage` (string): Nội dung tin nhắn gửi gần nhất.
  - `lastMessageTime` (string): Thời điểm tin nhắn cuối cùng được gửi.
  - `unreadCount` (number): Số tin nhắn chưa đọc trong phòng chat.

#### 13. Collection `messages`
Lưu trữ toàn bộ nội dung từng tin nhắn trong mỗi phòng chat.
- **Các trường chính:**
  - `messageID` (string): Mã tin nhắn duy nhất (VD: `MSG000001`).
  - `chatID` (string): Mã phòng hội thoại trực thuộc (`chats.chatID`).
  - `senderID` (string): Mã người gửi tin nhắn (`userID`).
  - `content` (string): Nội dung văn bản tin nhắn.
  - `timestamp` (string): Thời gian gửi tin nhắn.
  - `isRead` (boolean): Trạng thái người nhận đã xem tin nhắn.

---

## 4. Hướng dẫn Cài đặt & Khởi chạy Dự án

### Yêu cầu môi trường:
- **Node.js**: Phiên bản 18.x trở lên.
- **MongoDB**: Đang chạy cục bộ tại `mongodb://127.0.0.1:27017`.

### Bước 1: Khởi động Cơ sở dữ liệu MongoDB
Đảm bảo dịch vụ MongoDB (mongod) đã được bật trên máy tại cổng mặc định `27017`.

### Bước 2: Nạp toàn bộ 13 Collections vào MongoDB
Vào thư mục backend và chạy script nạp dữ liệu một chạm:
```bash
cd final/Web2_FinalProject-/database-mongodb
node import_data.js
```
*(Script sẽ tự động khởi tạo cơ sở dữ liệu `EcoCycleDatabase` và nạp toàn bộ 13 collections từ thư mục datasets)*

### Bước 3: Khởi động Backend RESTful API Server (Port 3000)
Tại thư mục `database-mongodb`, chạy server Express:
```bash
node index.js
```
Server chạy tại: `http://localhost:3000`.

### Bước 4: Khởi động Ứng dụng Frontend Angular (Port 4200)
Mở một terminal mới, chuyển vào thư mục frontend:
```bash
cd final/Web2_FinalProject-/web2-final
npm install
npm start
```
Mở trình duyệt truy cập: `http://localhost:4200`.

- **Tài khoản mặc định thử nghiệm:** `CM000001` (Lê Quốc Khoa)

