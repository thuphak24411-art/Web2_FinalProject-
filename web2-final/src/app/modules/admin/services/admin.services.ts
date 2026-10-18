import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../../classes/user';

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
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly adminUsersUrl = 'http://localhost:3000/api/admin/users';
  private readonly adminOrdersUrl = 'http://localhost:3000/api/admin/orders';

  constructor(private readonly http: HttpClient) {}

  getUsers(): Observable<AdminUsersResponse> {
    return this.http.get<AdminUsersResponse>(this.adminUsersUrl);
  }

  addGreenCoins(userID: string, recycledKg: number): Observable<AddGreenCoinsResponse> {
    return this.http.patch<AddGreenCoinsResponse>(
      `${this.adminUsersUrl}/${encodeURIComponent(userID)}/green-coins`,
      { recycledKg }
    );
  }

  getOrders(): Observable<AdminOrdersResponse> {
    return this.http.get<AdminOrdersResponse>(this.adminOrdersUrl);
  }

  getReports(): Observable<AdminReportsResponse> {
    return this.http.get<AdminReportsResponse>('http://localhost:3000/api/admin/reports');
  }
}
