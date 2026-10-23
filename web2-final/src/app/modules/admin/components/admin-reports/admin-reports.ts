import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.services';
import type { AdminReportChartPoint, AdminReportsResponse } from '../../../../classes/admin';

type ReportChartMetric = 'revenue' | 'returnRate' | 'cancelledOrderRate';

@Component({
  selector: 'app-admin-reports',
  standalone: false,
  styleUrl: './admin-reports.css',
  templateUrl: './admin-reports.html',
})
export class AdminReports implements OnInit {
  readonly charts: Array<{ title: string; metric: ReportChartMetric; color: string; unit: string }> = [
    { title: 'Tổng doanh thu', metric: 'revenue', color: '#2563a6', unit: 'VNĐ' },
    { title: 'Tỷ lệ hoàn trả hàng', metric: 'returnRate', color: '#168477', unit: '%' },
    { title: 'Tỷ lệ đơn hàng hủy', metric: 'cancelledOrderRate', color: '#b64040', unit: '%' }
  ];
  readonly chartPeriods = [
    { value: 'month', label: 'Theo tháng' },
    { value: 'quarter', label: 'Theo quý' },
    { value: 'year', label: 'Theo năm' }
  ] as const;
  selectedChartPeriod: 'month' | 'quarter' | 'year' = 'month';
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

  get chartPoints(): AdminReportChartPoint[] {
    return this.reports?.chartSeries?.[this.selectedChartPeriod] || [];
  }

  chartValue(point: AdminReportChartPoint, metric: ReportChartMetric): number {
    return point[metric] || 0;
  }

  chartMax(metric: ReportChartMetric): number {
    const max = Math.max(...this.chartPoints.map(point => this.chartValue(point, metric)), 0);
    return max || 1;
  }

  chartX(index: number): number {
    const width = 720;
    return this.chartPoints.length <= 1 ? width / 2 : (index / (this.chartPoints.length - 1)) * width;
  }

  chartY(point: AdminReportChartPoint, metric: ReportChartMetric): number {
    const height = 220;
    return height - (this.chartValue(point, metric) / this.chartMax(metric)) * height;
  }

  linePoints(metric: ReportChartMetric): string {
    return this.chartPoints
      .map((point, index) => `${this.chartX(index)},${this.chartY(point, metric)}`)
      .join(' ');
  }
}
