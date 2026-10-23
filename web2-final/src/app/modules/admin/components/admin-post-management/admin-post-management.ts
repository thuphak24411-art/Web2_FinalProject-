import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import type { AdminProductRequest } from '../../../../classes/admin';
import { AdminService } from '../../services/admin.services';

@Component({
  selector: 'app-admin-post-management',
  standalone: false,
  styleUrl: './admin-post-management.css',
  templateUrl: './admin-post-management.html',
})
export class AdminPostManagement implements OnInit {
  readonly statuses = ['Chờ duyệt', 'Đã duyệt', 'Từ chối'];
  readonly userRoles = ['SELLER', 'CUSTOMER'];
  requests: AdminProductRequest[] = [];
  searchTerm = '';
  selectedStatus = '';
  selectedRole = '';
  selectedRequest: AdminProductRequest | null = null;
  loading = false;
  updatingRequestId: string | null = null;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly adminService: AdminService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  get filteredRequests(): AdminProductRequest[] {
    const keyword = this.searchTerm.trim().toLowerCase();
    return this.requests.filter(request => {
      const requestId = this.getRequestId(request).toLowerCase();
      return (!keyword || requestId.includes(keyword)) &&
        (!this.selectedStatus || request.status === this.selectedStatus) &&
        (!this.selectedRole || request.userRole === this.selectedRole);
    });
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading = true;
    this.errorMessage = '';
    this.adminService.getProductRequests().subscribe({
      next: response => {
        this.requests = Array.isArray(response?.requests) ? response.requests : [];
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      },
      error: error => {
        console.error('Lỗi tải yêu cầu sản phẩm:', error);
        this.loading = false;
        this.errorMessage = error.error?.message || 'Không thể tải yêu cầu sản phẩm.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  getRequestId(request: AdminProductRequest): string {
    return request.requestId || request.requestID || '';
  }

  getUserId(request: AdminProductRequest): string {
    return request.userId || request.userID || '';
  }

  openDetails(request: AdminProductRequest): void {
    this.selectedRequest = request;
  }

  closeDetails(): void {
    this.selectedRequest = null;
  }

  updateStatus(request: AdminProductRequest, status: 'Đã duyệt' | 'Từ chối'): void {
    const requestId = this.getRequestId(request);
    if (!requestId || request.status !== 'Chờ duyệt' || this.updatingRequestId) return;
    this.updatingRequestId = requestId;
    this.errorMessage = '';
    this.successMessage = '';
    this.adminService.updateProductRequestStatus(requestId, status).subscribe({
      next: response => {
        request.status = response.request.status || status;
        this.successMessage = `Đã cập nhật ${requestId} thành ${status}.`;
        this.updatingRequestId = null;
        this.changeDetectorRef.detectChanges();
      },
      error: error => {
        console.error('Lỗi cập nhật trạng thái yêu cầu sản phẩm:', error);
        this.errorMessage = error.error?.message || 'Không thể cập nhật trạng thái yêu cầu.';
        this.updatingRequestId = null;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  formatDate(value: string | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
  }
}