import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  AddGreenCoinsResponse,
  AdminOrder,
  AdminOrdersResponse,
  AdminProductRequest,
  AdminProductRequestsResponse,
  AdminReportsResponse,
  AdminUser,
  AdminUsersResponse
} from '../../../classes/admin';

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

  getProductRequests(): Observable<AdminProductRequestsResponse> {
    return this.http.get<AdminProductRequestsResponse>('http://localhost:3000/api/admin/product-requests');
  }

  updateProductRequestStatus(requestId: string, status: 'Đã duyệt' | 'Từ chối'): Observable<{ request: AdminProductRequest }> {
    return this.http.patch<{ request: AdminProductRequest }>(
      `http://localhost:3000/api/admin/product-requests/${encodeURIComponent(requestId)}/status`,
      { status }
    );
  }
}
