const demoSeller = {
  userID: 'SL000001',
  userName: 'ecocycle_store',
  fullName: 'ECOCycle Store',
  email: 'seller@ecocycle.local',
  phoneNumber: '0901234567',
  password: '$2b$12$.c7lkjeWwq4fIuv7kngxNeCZQlPeJVRAclLvLC/WQKHOa.wN3KeEu',
  role: 'SELLER',
  status: 'ACTIVE',
  greenCoins: 5000,
  joinDate: '2026-01-01',
  sellerDetails: {
    address: '12 Nguyen Hue, Quan 1, TP.HCM',
    taxCode: '0312345678'
  },
  avatar: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=150'
};

const demoCustomer = {
  userID: 'CM000001',
  userName: 'lequockhoa',
  fullName: 'Le Quoc Khoa',
  email: 'customer@ecocycle.local',
  phoneNumber: '0912345678',
  password: '$2b$12$EeuWjLBlIb00pP8RM5KNtOeEwVXp7CW3BR4ILdu1RHGAMK5a9GP9K',
  role: 'CUSTOMER',
  status: 'ACTIVE',
  greenCoins: 3420,
  joinDate: '2026-01-01',
  customerDetails: {
    address: '01 Vo Van Ngan, Thu Duc, TP.HCM'
  },
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
};

const demoAdmin = {
  userID: 'AD002',
  userName: 'admin',
  fullName: 'ECOCycle Administrator',
  email: 'admin@ecocycle.local',
  phoneNumber: '0987654321',
  password: '$2b$12$2rIs9mBIg52gI20HBos6zObzXzUidbnhg8TNjCB7a3m7JrDRs8pc6',
  role: 'ADMIN',
  status: 'ACTIVE',
  joinDate: '2026-01-01',
  avatar: ''
};

const products = [
  {
    CateID: 'CAT001',
    CateName: 'Dien thoai',
    Products: [
      {
        id: 'SP001',
        img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600',
        title: 'iPhone 13 128GB da qua su dung',
        quantity: 5,
        fromPrice: '12000000',
        newPrice: '12000000',
        saving: '0',
        discount: '0%',
        sellerid: 'SL000001',
        condition: 'Da qua su dung',
        Status: 'San co',
        Description: 'May hoat dong tot, pin tren 85%, bao hanh 3 thang.'
      },
      {
        id: 'SP002',
        img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600',
        title: 'Samsung Galaxy S22',
        quantity: 3,
        fromPrice: '8500000',
        newPrice: '8500000',
        saving: '0',
        discount: '0%',
        sellerid: 'SL000001',
        condition: 'Da qua su dung',
        Status: 'San co',
        Description: 'Ngoai hinh dep, day du phu kien.'
      }
    ]
  },
  {
    CateID: 'CAT002',
    CateName: 'Laptop',
    Products: [
      {
        id: 'SP003',
        img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600',
        title: 'Laptop Dell Latitude 5420',
        quantity: 2,
        fromPrice: '9800000',
        newPrice: '9800000',
        saving: '0',
        discount: '0%',
        sellerid: 'SL000001',
        condition: 'Da qua su dung',
        Status: 'San co',
        Description: 'Core i5, RAM 16GB, SSD 512GB.'
      }
    ]
  }
];

const demoOrder = {
  orderID: 'OD100001',
  orderType: 'resell',
  customerID: 'CM000001',
  sellerID: 'SL000001',
  sellerInfo: {
    id: 'SL000001',
    name: 'ECOCycle Store',
    avatar: demoSeller.avatar
  },
  invoiceNumber: 'HD20260001',
  orderDate: '01/10/2026',
  shippingAddress: '01 Vo Van Ngan, Thu Duc, TP.HCM',
  products: [
    {
      productID: 'SP001',
      title: 'iPhone 13 128GB da qua su dung',
      img: products[0].Products[0].img,
      quantity: 1,
      price: '12.000.000d'
    }
  ],
  subtotal: '12.000.000d',
  shippingFee: '20.000d',
  totalPrice: '12.020.000d',
  earnedCoins: 10000,
  status: 'Da giao',
  shippingInfo: {
    addressDetail: '01 Vo Van Ngan',
    district: 'Thu Duc',
    province: 'TP.HCM'
  },
  createdAt: '2026-10-01T08:00:00.000Z'
};

module.exports = {
  users: [demoCustomer, demoSeller, demoAdmin],
  products,
  sellOrders: [demoOrder],
  repairOrders: [
    {
      repairOrderID: 'RP100001',
      customerID: 'CM000001',
      deviceName: 'iPhone 13',
      deviceType: 'Dien thoai',
      issueDescription: 'Khong nhan sac',
      contactPhone: '0912345678',
      assessment: { images: [] },
      status: 'Da sua chua',
      aiAssessmentStatus: 'Da danh gia bang Gemini',
      aiAssessmentHistory: [{ assessmentID: 'AI100001', createdAt: '2026-09-20T08:05:00.000Z' }],
      createdAt: '2026-09-20T08:00:00.000Z'
    }
  ],
  recycleOrders: [
    { recycleOrderID: 'RC100001', customerID: 'CM000001', status: 'Da tiep nhan', createdAt: '2026-09-22T08:00:00.000Z' }
  ],
  invoices: [
    { invoiceID: 'HD20260001', orderID: 'OD100001', customerID: 'CM000001', total: 12020000, status: 'Da thanh toan' }
  ],
  greencoins: [
    { transactionID: 'GC100001', userID: 'CM000001', amount: 3420, type: 'balance', createdAt: '2026-01-01T08:00:00.000Z' }
  ],
  carts: [
    { userId: 'CM000001', items: [], updatedAt: '2026-10-01T08:00:00.000Z' }
  ],
  notifications: [
    {
      notificationID: 'NT100001',
      userID: 'CM000001',
      type: 'order',
      title: 'Don hang da giao',
      content: 'Don hang OD100001 da duoc giao thanh cong.',
      targetID: 'OD100001',
      isRead: false,
      createdAt: '2026-10-01T10:00:00.000Z'
    }
  ],
  AI_assessments: [
    {
      assessmentID: 'AI100001',
      repairOrderID: 'RP100001',
      userID: 'CM000001',
      deviceType: 'Dien thoai',
      source: 'fallback',
      recommendation: 'Can ky thuat vien kiem tra.',
      recommendations: {
        repair: { title: 'Sua chua', recommendation: 'Kiem tra cong sac.', nextStep: 'Dat lich kiem tra.', confidence: 'thap' },
        resell: { title: 'Ban lai', recommendation: 'Chi ban sau khi sua.', nextStep: 'Cong khai tinh trang.', confidence: 'thap' }
      },
      summary: 'Can ky thuat vien kiem tra.',
      estimatedPrice: 'Chua co du lieu dinh gia',
      estimatedPriceDetails: { amountVnd: null, currency: 'VND', display: 'Chua co du lieu dinh gia', rationale: 'Can kiem tra ky thuat.' },
      estimatedPrices: {},
      status: 'Fallback',
      createdAt: '2026-09-20T08:05:00.000Z'
    }
  ],
  reviews: [
    { reviewID: 'RV100001', productID: 'SP001', userID: 'CM000001', rating: 5, comment: 'San pham dung mo ta.' }
  ],
  chats: [
    { chatID: 'CH100001', buyerID: 'CM000001', sellerID: 'SL000001', updatedAt: '2026-10-01T08:00:00.000Z' }
  ],
  messages: [
    { messageID: 'MS100001', chatID: 'CH100001', senderID: 'SL000001', content: 'Xin chao, ECOCycle co the ho tro ban.', createdAt: '2026-10-01T08:00:00.000Z' }
  ]
};
