import type { OrderItem, OrderSellerInfo, OrderShippingInfo } from './admin';

export class Order {
  _id?: string;
  orderId!: string;
  orderType: 'brandnew' | 'resell' = 'brandnew';
  customerId!: string;
  sellerId!: string;
  sellerInfo?: OrderSellerInfo;
  invoiceNumber?: string;
  orderDate?: string;
  createdAt!: string;
  shippingAddress?: string;
  shippingInfo?: OrderShippingInfo;
  items: OrderItem[] = [];
  subtotal: number = 0;
  shippingFee: number = 0;
  totalPrice: number = 0;
  earnedCoins: number = 10000;
  status: string = 'Chờ xác nhận';
}
