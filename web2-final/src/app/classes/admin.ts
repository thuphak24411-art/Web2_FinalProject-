import type { User } from './user';

export interface BankInfo {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
}

export interface CustomerDetails {
  address?: string;
  province?: string;
  district?: string;
  streetAddress?: string;
  bankInfo?: BankInfo;
}

export interface SellerDetails {
  address?: string;
  province?: string;
  district?: string;
  streetAddress?: string;
  businessName?: string;
  shopName?: string;
  taxCode?: string;
  bankInfo?: BankInfo;
}

export interface FooterColumn {
  title: string;
  links: Array<{ label: string; href: string }>;
}

export interface FooterData {
  columns: FooterColumn[];
  copyright: string;
}

export interface NavItem {
  id?: string;
  label: string;
  href: string;
  icon?: string;
  active?: boolean;
}

export interface RepairRequest {
  repairOrderID?: string;
  productID?: string;
  deviceName: string;
  deviceType: string;
  issueDescription: string;
  contactPhone: string;
  userEstimatedPriceVnd?: number | null;
  assessment?: DeviceAssessment;
  status?: string;
  aiAssessmentStatus?: string;
  createdAt?: string;
  orderDate?: string;
  pickupDate?: string;
  shippingAddress?: string;
  finalCost?: number | string | null;
  aiAssessmentHistory?: AiAssessment[];
  customerID?: string;
  customer?: RepairCustomer;
  saleListingID?: string;
}

export interface RepairCustomer {
  userID: string;
  userName?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
}

export interface AiRecommendation {
  title: string;
  recommendation: string;
  nextStep: string;
  confidence: string;
}

export interface AiAssessment {
  assessmentID: string;
  repairOrderID: string;
  customerID?: string;
  deviceType: string;
  source: 'gemini' | 'cache' | 'fallback';
  fingerprint?: string;
  recommendation: string;
  recommendations: {
    repair: AiRecommendation;
    resell: AiRecommendation;
  };
  summary: string;
  estimatedPrice: string;
  productInfo?: {
    productName?: string;
    condition?: string;
  };
  estimatedPriceDetails?: {
    amountVnd: number | null;
    currency: string;
    display: string;
    rationale: string;
  };
  estimatedPrices?: {
    repair: PriceEstimate;
    resell: PriceEstimate;
  };
  status: string;
  error?: string | null;
  createdAt: string;
}

export interface PriceEstimate {
  amountVnd: number | null;
  currency: string;
  display: string;
  rationale: string;
}

export interface DeviceAssessment {
  brand: string;
  usagePeriod: string;
  appearance: {
    overall: string;
    screen: string;
    casing: string;
    waterDamage: string;
    damageDescription?: string;
  };
  functionality: {
    startup: string;
    mainFunction: string;
    ports: string;
    deviceChecks: Record<string, string>;
    issues: string[];
    otherIssue?: string;
  };
  battery: {
    condition: string;
    maximumCapacity?: number;
    repairHistory: string;
    replacedParts: string[];
    repairDescription?: string;
    needsTechnicalInspection: boolean;
  };
  images: Array<{ area: string; name: string; type: string; size: number; preview: string }>;
  additionalDescription?: string;
}

export interface CartItem {
  id: string;
  title: string;
  img: string;
  price: number;
  quantity: number;
  condition?: string;
  sellerid?: string;
  sellerLocation?: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  img: string;
  price: number;
  quantity: number;
  condition?: string;
  sellerId?: string;
}

export interface OrderSellerInfo {
  id: string;
  name: string;
  avatar?: string;
  address?: string;
  phone?: string;
}

export interface OrderShippingInfo {
  fullName: string;
  phoneNumber: string;
  province: string;
  district: string;
  addressDetail: string;
  note?: string;
  paymentMethod: string;
}

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
}

export interface RegisterRequest {
  userName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  province: string;
  district?: string;
  streetAddress: string;
  password: string;
  role: 'CUSTOMER' | 'SELLER';
  businessName?: string;
  shopName?: string;
}

export interface ProfileUpdateRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  province: string;
  district?: string;
  streetAddress: string;
  businessName?: string;
  shopName?: string;
}

export interface SellerPackage {
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  sellerAddress: string;
  items: any[];
  shippingMethod: 'tieuchuan' | 'hoatoc';
}

export interface OrderTab {
  id: string;
  label: string;
  icon: string;
}

export interface AdminUser extends Omit<User, 'password'> {
  _id?: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
}

export interface AddGreenCoinsResponse {
  user: AdminUser;
  amount: number;
}

export interface AdminOrderProduct {
  productID?: string;
  title?: string;
  img?: string;
  quantity?: number;
  price?: string | number;
}

export interface AdminOrder {
  _id?: string;
  orderID?: string;
  orderId?: string;
  customerID?: string;
  sellerID?: string;
  invoiceNumber?: string;
  orderDate?: string;
  createdAt?: string;
  status?: string;
  shippingAddress?: string;
  shippingInfo?: {
    addressDetail?: string;
    district?: string;
    province?: string;
    phone?: string;
    recipientName?: string;
  };
  products?: AdminOrderProduct[];
  items?: AdminOrderProduct[];
  subtotal?: string | number;
  shippingFee?: string | number;
  totalPrice?: string | number;
  sellerInfo?: {
    name?: string;
    id?: string;
  };
}

export interface AdminOrdersResponse {
  orders: AdminOrder[];
}

export interface AdminReportsResponse {
  totalRevenue: number;
  totalOrdersSold: number;
  totalProductsSold: number;
  totalGreenCoins: number;
  totalEWasteRecycledKg: number;
  totalCo2Reduced: number;
  returnRate: number;
  cancelledOrderRate: number;
  averageOrderValue: number;
  chartSeries: {
    month: AdminReportChartPoint[];
    quarter: AdminReportChartPoint[];
    year: AdminReportChartPoint[];
  };
}

export interface AdminReportChartPoint {
  label: string;
  revenue: number;
  returnRate: number;
  cancelledOrderRate: number;
}

export interface AdminProductRequest {
  _id?: string;
  requestId?: string;
  requestID?: string;
  userId?: string;
  userID?: string;
  userName?: string;
  userPhone?: string;
  userRole?: 'SELLER' | 'CUSTOMER' | string;
  status?: 'Chờ duyệt' | 'Đã duyệt' | 'Từ chối' | string;
  productID?: string;
  productId?: string;
  productName?: string;
  title?: string;
  condition?: string;
  cateID?: string;
  description?: string;
  price?: number | string;
  img?: string;
  greenCoins?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminProductRequestsResponse {
  requests: AdminProductRequest[];
}
