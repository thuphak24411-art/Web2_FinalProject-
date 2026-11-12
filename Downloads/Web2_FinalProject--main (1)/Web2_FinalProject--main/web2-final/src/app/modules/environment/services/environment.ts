import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Cấu trúc dữ liệu thống kê môi trường
export interface EnvironmentStats {
  devicesListed: number;
  devicesPurchased: number;
  reusedDevicesPurchased: number;
  eWasteProcessedKg: number;
  co2eReferenceKg: number;
  co2eCountedDevices: number;
  co2eUncountedDevices: number;
  co2eNote: string;
}

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {

  private readonly apiUrl = 'http://localhost:3000/api/environment';

  constructor(private http: HttpClient) {}

  // Thống kê môi trường toàn hệ thống
  getCommunityStats(): Observable<EnvironmentStats> {
    return this.http.get<EnvironmentStats>(
      `${this.apiUrl}/dashboard`
    );
  }

  // Thống kê môi trường của người dùng đang đăng nhập
  getPersonalStats(): Observable<EnvironmentStats> {
    return this.http.get<EnvironmentStats>(
      `${this.apiUrl}/me`
    );
  }
}