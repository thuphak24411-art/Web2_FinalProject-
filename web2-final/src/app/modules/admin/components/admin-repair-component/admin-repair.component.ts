import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../services/auth.service';
import { RepairService } from '../../../repair/repair.service';
import type { RepairRequest } from '../../../../classes/admin';

@Component({
  selector: 'app-admin-repair',
  standalone: false,
  templateUrl: './admin-repair.component.html',
  styleUrl: './admin-repair.component.css'
})
export class AdminRepairComponent implements OnInit, OnDestroy {
  readonly statuses = [
    'Chờ xác nhận',
    'Đã hủy',
    'Đang sửa chữa',
    'Đã hoàn thành',
    'Đã giao hàng'
  ];
  requests: RepairRequest[] = [];
  searchTerm = '';
  selectedStatus = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  selectedRequest: RepairRequest | null = null;
  pendingStatusChange: { request: RepairRequest; status: string } | null = null;
  updatingStatusID: string | null = null;
  private requestedRepairOrderID: string | null = null;
  private routeQuerySubscription?: Subscription;

  get filteredRequests(): RepairRequest[] {
    const search = this.searchTerm.trim().toLowerCase();
    return this.requests.filter(request => {
      const matchesSearch = !search || (request.repairOrderID || '').toLowerCase().includes(search);
      const matchesStatus = !this.selectedStatus || this.displayStatus(request.status) === this.selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }

  constructor(
    private readonly authService: AuthService,
    private readonly repairService: RepairService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.hasRole('ADMIN', 'TECHNICIAN')) {
      this.router.navigate(['/']);
      return;
    }
    this.routeQuerySubscription = this.route.queryParamMap.subscribe(params => {
      this.requestedRepairOrderID = params.get('repairOrderID');
      if (this.requests.length && this.requestedRepairOrderID) this.loadRequests();
    });
    this.loadRequests();
  }

  ngOnDestroy(): void {
    this.routeQuerySubscription?.unsubscribe();
  }

  loadRequests(): void {
    this.loading = true;
    this.errorMessage = '';
    this.repairService.getAdminRequests().subscribe({
      next: response => {
        const loadedRequests = Array.isArray(response?.requests) ? response.requests : [];
        this.requests = loadedRequests;
        this.openRequestedRequest();
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      },
      error: error => {
        console.error('Lỗi tải repair admin:', error);
        this.loading = false;
        this.errorMessage = error.error?.message || 'Không thể tải yêu cầu sửa chữa.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  requestStatusConfirmation(request: RepairRequest, status: string): void {
    if (!request.repairOrderID || this.displayStatus(request.status) === status || this.updatingStatusID) return;
    this.pendingStatusChange = { request, status };
    this.changeDetectorRef.detectChanges();
  }

  confirmStatusChange(): void {
    const change = this.pendingStatusChange;
    if (!change?.request.repairOrderID || this.updatingStatusID) return;
    this.updatingStatusID = change.request.repairOrderID;
    this.errorMessage = '';
    this.repairService.updateStatus(change.request.repairOrderID, change.status).subscribe({
      next: response => {
        change.request.status = response.status;
        this.pendingStatusChange = null;
        this.updatingStatusID = null;
        this.changeDetectorRef.detectChanges();
      },
      error: error => {
        this.errorMessage = error.error?.message || 'Không thể cập nhật trạng thái.';
        this.pendingStatusChange = null;
        this.updatingStatusID = null;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  cancelStatusChange(): void {
    if (this.updatingStatusID) return;
    this.pendingStatusChange = null;
    this.changeDetectorRef.detectChanges();
  }

  confirmCompletion(request: RepairRequest, status: 'Đã hoàn thành' | 'Đã giao hàng'): void {
    this.requestStatusConfirmation(request, status);
  }

  openRequest(request: RepairRequest): void {
    this.selectedRequest = request;
    this.errorMessage = '';
    this.changeDetectorRef.detectChanges();
  }

  private openRequestedRequest(): void {
    if (!this.requestedRepairOrderID) return;
    const request = this.requests.find(item => item.repairOrderID === this.requestedRepairOrderID);
    if (request) this.openRequest(request);
  }

  closeRequest(): void {
    this.selectedRequest = null;
  }

  displayStatus(status: string | undefined): string {
    const normalized = this.normalizeStatus(status);
    return this.statuses.find(item => this.normalizeStatus(item) === normalized) || '';
  }

  getStatusClass(status: string | undefined): string {
    return {
      'Chờ xác nhận': 'status-pending',
      'Đã hủy': 'status-cancelled',
      'Chờ lựa chọn của người dùng': 'status-waiting',
      'Đang sửa chữa': 'status-progress',
      'Đã hoàn thành': 'status-completed',
      'Đã giao hàng': 'status-delivered'
    }[this.displayStatus(status)] || 'status-unknown';
  }

  displayUserChoice(option: string): string {
    if (option === 'repair') return 'Sửa chữa';
    if (option === 'resell') return 'Bán lại';
    return 'Phương án cũ không còn hỗ trợ';
  }

  getLatestProductInfo(request: RepairRequest): NonNullable<RepairRequest['aiAssessmentHistory']>[number]['productInfo'] | undefined {
    return request.aiAssessmentHistory?.[0]?.productInfo;
  }

  private normalizeStatus(status: string | undefined): string {
    const value = (status || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase();
    if (value.includes('xac nhan')) return 'cho xac nhan';
    if (value.includes('huy')) return 'da huy';
    if (value.includes('giao hang')) return 'da giao hang';
    if (value.includes('hoan thanh') || value.startsWith('da sua')) return 'da hoan thanh';
    if (value.includes('lua chon cua nguoi dung')) return 'cho lua chon cua nguoi dung';
    if (value.startsWith('dang sua')) return 'dang sua chua';
    return value;
  }
}
