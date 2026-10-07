export interface OrderProductItem {
  productID: string;
  productId?: string;
  id?: string;
  title?: string;
  img?: string;
  price?: string | number;
  quantity: number;
  condition?: string;
}

export interface OrderSellerInfo {
  id: string;
  name: string;
  avatar?: string;
  address?: string;
  phone?: string;
}

export class Order {
  _id?: string;
  orderID!: string;
  orderId?: string;
  orderType: 'brandnew' | 'resell' | string = 'brandnew';
  customerID: string = 'CM000001';
  sellerID: string = 'SL000000';
  sellerInfo?: OrderSellerInfo;
  invoiceNumber?: string;
  orderDate?: string;
  createdAt?: string;
  shippingAddress?: string;
  products: OrderProductItem[] = [];
  items?: OrderProductItem[];
  subtotal?: string | number;
  shippingFee?: string | number;
  totalPrice?: string | number;
  totalAmount?: number;
  status: string = 'Chờ xác nhận';
  earnedCoins: number = 10000;
  shippingInfo?: any;
}
