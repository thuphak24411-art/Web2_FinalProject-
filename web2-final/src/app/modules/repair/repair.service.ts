import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  AiAssessment,
  DeviceAssessment,
  PriceEstimate,
  RepairCustomer,
  RepairRequest
} from '../../classes/admin';

@Injectable({ providedIn: 'root' })
export class RepairService {
  private readonly apiBaseUrl = 'http://localhost:3000/api';
  private readonly apiUrl = `${this.apiBaseUrl}/repair-requests`;

  constructor(private http: HttpClient) {}

  createRequest(request: RepairRequest): Observable<{ message: string; repairOrder: RepairRequest }> {
    return this.http.post<{ message: string; repairOrder: RepairRequest }>(this.apiUrl, request);
  }

  getMyRequests(): Observable<{ requests: RepairRequest[] }> {
    return this.http.get<{ requests: RepairRequest[] }>(this.apiUrl);
  }

  requestAiAssessment(repairOrderID: string): Observable<{ message: string; status?: string; assessment?: AiAssessment }> {
    return this.http.post<{ message: string; status?: string; assessment?: AiAssessment }>(
      `${this.apiUrl}/${repairOrderID}/ai-assessment`,
      {}
    );
  }

  getAdminRequests(): Observable<{ requests: RepairRequest[] }> {
    return this.http.get<{ requests: RepairRequest[] }>(
      `${this.apiBaseUrl}/admin/repair-requests`
    );
  }

  updateStatus(
    repairOrderID: string,
    status: string
  ): Observable<{ message: string; status: string }> {
    return this.http.put<{ message: string; status: string }>(
      `${this.apiUrl}/${encodeURIComponent(repairOrderID)}/status`,
      { status }
    );
  }

  deleteAdminRequest(repairOrderID: string, reason: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiBaseUrl}/repair-requests/${encodeURIComponent(repairOrderID)}`,
      { body: { reason } }
    );
  }

}
