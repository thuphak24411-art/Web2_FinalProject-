import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../services/auth.service';
import { RepairRequest, RepairService, SpecialistAssessmentInput } from '../../../repair/repair.service';

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
    'Chờ lựa chọn của người dùng',
    'Đang sửa chữa',
    'Đã hoàn thành',
    'Đã giao hàng'
  ];
  requests: RepairRequest[] = [];
  searchTerm = '';
  selectedStatus = '';
  excludedInvalidRequests = 0;
  loading = false;
  errorMessage = '';
  successMessage = '';
  selectedRequest: RepairRequest | null = null;
  pendingStatusChange: { request: RepairRequest; status: string } | null = null;
  updatingStatusID: string | null = null;
  submittingSpecialistAssessment = false;
  loadingSpecialistAssessmentID: string | null = null;
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
        this.requests = loadedRequests.filter(request => this.isValidRequest(request));
        this.excludedInvalidRequests = loadedRequests.length - this.requests.length;
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

  sendToSpecialist(request: RepairRequest): void {
    if (this.displayStatus(request.status) === 'Chờ xác nhận') this.openRequest(request);
  }

  confirmCompletion(request: RepairRequest, status: 'Đã hoàn thành' | 'Đã giao hàng'): void {
    this.requestStatusConfirmation(request, status);
  }

  openRequest(request: RepairRequest): void {
    this.selectedRequest = request;
    const repairOrderID = request.repairOrderID;
    if (!repairOrderID) return;
    this.loadingSpecialistAssessmentID = repairOrderID;
    this.errorMessage = '';
    this.repairService.getSpecialistAssessment(repairOrderID).subscribe({
      next: response => {
        if (this.selectedRequest?.repairOrderID === repairOrderID) {
          this.selectedRequest.specialistAssessment = response.specialistAssessment || undefined;
          this.selectedRequest.status = response.status;
          const listedRequest = this.requests.find(item => item.repairOrderID === repairOrderID);
          if (listedRequest) {
            listedRequest.specialistAssessment = response.specialistAssessment || undefined;
            listedRequest.status = response.status;
          }
        }
        if (this.loadingSpecialistAssessmentID === repairOrderID) {
          this.loadingSpecialistAssessmentID = null;
        }
        this.changeDetectorRef.detectChanges();
      },
      error: error => {
        if (this.loadingSpecialistAssessmentID === repairOrderID) {
          this.loadingSpecialistAssessmentID = null;
        }
        if (this.selectedRequest?.repairOrderID === repairOrderID) {
          this.errorMessage = error.error?.message || 'Không thể tải đánh giá chuyên gia.';
        }
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  private openRequestedRequest(): void {
    if (!this.requestedRepairOrderID) return;
    const request = this.requests.find(item => item.repairOrderID === this.requestedRepairOrderID);
    if (request) this.openRequest(request);
  }

  closeRequest(): void {
    this.selectedRequest = null;
  }

  submitSpecialistAssessment(request: RepairRequest, assessment: SpecialistAssessmentInput): void {
    if (!request.repairOrderID || this.submittingSpecialistAssessment) return;
    this.submittingSpecialistAssessment = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.repairService.submitSpecialistAssessment(request.repairOrderID, assessment).subscribe({
      next: response => {
        request.specialistAssessment = response.specialistAssessment;
        request.status = response.status;
        this.submittingSpecialistAssessment = false;
        this.successMessage = response.message;
        this.selectedRequest = null;
        this.changeDetectorRef.detectChanges();
      },
      error: error => {
        this.errorMessage = error.error?.message || 'Không thể lưu đánh giá chuyên gia.';
        this.submittingSpecialistAssessment = false;
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  displayStatus(status: string | undefined): string {
    const normalized = this.normalizeStatus(status);
    return this.statuses.find(item => this.normalizeStatus(item) === normalized) || '';
  }

  displayUserChoice(option: string): string {
    if (option === 'repair') return 'Sửa chữa';
    if (option === 'resell') return 'Bán lại';
    return 'Phương án cũ không còn hỗ trợ';
  }

  hasAiAssessment(request: RepairRequest): boolean {
    return !!request.aiAssessmentHistory?.some(assessment =>
      assessment.source === 'gemini' || assessment.source === 'cache'
    );
  }

  getAiAssessmentStatusLabel(request: RepairRequest): string {
    if (this.hasAiAssessment(request)) return 'Đã đánh giá Gemini';
    if (request.aiAssessmentStatus?.startsWith('Đang')) return request.aiAssessmentStatus;
    return request.aiAssessmentStatus ? 'Chưa có kết quả Gemini' : 'Chưa đánh giá Gemini';
  }

  getAiAssessments(request: RepairRequest): NonNullable<RepairRequest['aiAssessmentHistory']> {
    return (request.aiAssessmentHistory || []).filter(assessment =>
      assessment.source === 'gemini' || assessment.source === 'cache'
    );
  }

  private isValidRequest(request: RepairRequest): boolean {
    const hasOrderID = typeof request.repairOrderID === 'string' && request.repairOrderID.trim().length > 0;
    const hasCustomerID = typeof request.customerID === 'string' && request.customerID.trim().length > 0;
    const createdAt = request.createdAt || request.orderDate;
    const hasValidDate = typeof createdAt === 'string' && Number.isFinite(Date.parse(createdAt));
    return hasOrderID && hasCustomerID && hasValidDate;
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
