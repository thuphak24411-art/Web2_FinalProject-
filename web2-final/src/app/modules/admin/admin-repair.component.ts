import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { RepairRequest, RepairService, SpecialistAssessmentInput } from '../repair/repair.service';

@Component({
  selector: 'app-admin-repair',
  standalone: false,
  templateUrl: './admin-repair.component.html',
  styleUrl: './admin-repair.component.css'
})
export class AdminRepairComponent implements OnInit, OnDestroy {
  readonly statuses = [
    'Chưa sửa chữa',
    'Chờ admin cập nhật trạng thái',
    'Chờ chuyên gia đánh giá',
    'Chờ lựa chọn của người dùng',
    'Đã chọn phương án',
    'Đang sửa chữa',
    'Đã sửa chữa'
  ];
  requests: RepairRequest[] = [];
  excludedInvalidRequests = 0;
  loading = false;
  errorMessage = '';
  successMessage = '';
  report = {
    total: 0,
    pending: 0,
    waitingExpert: 0,
    inProgress: 0,
    completed: 0,
    assessed: 0
  };
  selectedRequest: RepairRequest | null = null;
  pendingStatusChange: { request: RepairRequest; status: string } | null = null;
  updatingStatusID: string | null = null;
  requestToDelete: RepairRequest | null = null;
  deleteReason = '';
  deletingRequestID: string | null = null;
  submittingSpecialistAssessment = false;
  loadingSpecialistAssessmentID: string | null = null;
  private requestedRepairOrderID: string | null = null;
  private routeQuerySubscription?: Subscription;

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
        try {
          this.buildReport();
        } catch (error) {
          console.error('Không thể dựng báo cáo repair:', error);
          this.errorMessage = 'Dữ liệu báo cáo sửa chữa không hợp lệ.';
        }
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

  updateStatus(request: RepairRequest, status: string, control?: HTMLSelectElement): void {
    if (!request.repairOrderID || this.displayStatus(request.status) === status || this.updatingStatusID) return;
    if (control) control.value = this.displayStatus(request.status);
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
        if (response.status === 'Chờ chuyên gia đánh giá') {
          this.openRequest(change.request);
        }
        this.buildReport();
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
    if (this.displayStatus(request.status) === 'Chờ chuyên gia đánh giá') {
      this.openRequest(request);
      return;
    }
    this.updateStatus(request, 'Chờ chuyên gia đánh giá');
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

  confirmDelete(request: RepairRequest): void {
    this.requestToDelete = request;
    this.deleteReason = '';
  }

  cancelDelete(): void {
    if (!this.deletingRequestID) {
      this.requestToDelete = null;
      this.deleteReason = '';
    }
  }

  deleteRequest(): void {
    const request = this.requestToDelete;
    if (!request?.repairOrderID || this.deletingRequestID || this.deleteReason.trim().length < 5) return;
    this.deletingRequestID = request.repairOrderID;
    this.errorMessage = '';
    this.repairService.deleteAdminRequest(request.repairOrderID, this.deleteReason.trim()).subscribe({
      next: () => {
        this.requests = this.requests.filter(item => item.repairOrderID !== request.repairOrderID);
        if (this.selectedRequest?.repairOrderID === request.repairOrderID) this.selectedRequest = null;
        this.requestToDelete = null;
        this.deleteReason = '';
        this.deletingRequestID = null;
        this.buildReport();
        this.changeDetectorRef.detectChanges();
      },
      error: error => {
        console.error('Lỗi xóa yêu cầu sửa chữa:', error);
        this.errorMessage = error.error?.message || 'Không thể xóa yêu cầu sửa chữa.';
        this.deletingRequestID = null;
        this.changeDetectorRef.detectChanges();
      }
    });
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
        this.buildReport();
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

  private buildReport(): void {
    this.report = {
      total: this.requests.length,
      pending: this.requests.filter(item =>
        ['chua sua chua', 'cho admin cap nhat trang thai'].includes(this.normalizeStatus(item.status))
      ).length,
      waitingExpert: this.requests.filter(item => this.normalizeStatus(item.status) === 'cho chuyen gia danh gia').length,
      inProgress: this.requests.filter(item => this.normalizeStatus(item.status) === 'dang sua chua').length,
      completed: this.requests.filter(item => this.normalizeStatus(item.status) === 'da sua chua').length,
      assessed: this.requests.filter(item => this.hasAiAssessment(item)).length
    };
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
    if (value.startsWith('da sua') || value.includes('hoan thanh')) return 'da sua chua';
    if (value.includes('chuyen gia')) return 'cho chuyen gia danh gia';
    if (value.includes('cho admin cap nhat trang thai')) return 'cho admin cap nhat trang thai';
    if (value.includes('lua chon cua nguoi dung')) return 'cho lua chon cua nguoi dung';
    if (value.includes('da chon phuong an')) return 'da chon phuong an';
    if (value.startsWith('dang sua')) return 'dang sua chua';
    if (value.includes('cho xu ly') || value.startsWith('chua sua')) return 'chua sua chua';
    return value;
  }
}
