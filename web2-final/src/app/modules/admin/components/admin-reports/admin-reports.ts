import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AdminReportsResponse, AdminService } from '../../services/admin.services';

@Component({
  selector: 'app-admin-reports',
  standalone: false,
  styleUrl: './admin-reports.css',
  templateUrl: './admin-reports.html',
})
export class AdminReports implements OnInit {
  reports: AdminReportsResponse | null = null;
  loading = false;
  errorMessage = '';

  constructor(
    private readonly adminService: AdminService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.loading = true;
    this.errorMessage = '';
    this.adminService.getReports().subscribe({
      next: response => {
        this.reports = response;
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      },
      error: error => {
        console.error('Lỗi tải báo cáo admin:', error);
        this.loading = false;
        this.errorMessage = error.error?.message || 'Không thể tải báo cáo tổng quan.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  formatNumber(value: number | undefined, maximumFractionDigits = 0): string {
    return (value || 0).toLocaleString('vi-VN', { maximumFractionDigits });
  }
}
