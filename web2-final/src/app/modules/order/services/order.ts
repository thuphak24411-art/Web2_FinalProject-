import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private _apiUrl = 'http://localhost:3000/orders';
  private _usersUrl = 'http://localhost:3000/users';
  private _currentUserId = '';

  constructor(
    private _http: HttpClient,
    private readonly authService: AuthService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this._currentUserId = user?.userID || '';
    });
  }

  getCurrentUserId(): string {
    return this._currentUserId;
  }

  setCurrentUserId(userId: string): void {
    this._currentUserId = userId;
  }

  getUserProfile(userId: string): Observable<any> {
    return this._http.get<any>(`${this._usersUrl}/${userId}`);
  }

  createOrder(orderData: any): Observable<any> {
    return this._http.post(this._apiUrl, orderData);
  }

  cancelOrder(orderId: string): Observable<any> {
    return this._http.put<any>(`${this._apiUrl}/cancel/${orderId}`, {});
  }

  getOrdersList(): Observable<any[]> {
    return this._http.get<any[]>(this._apiUrl);
  }

  getOrderDetail(orderId: string): Observable<any> {
    return this._http.get<any>(`${this._apiUrl}/detail/${orderId}`);
  }
}
