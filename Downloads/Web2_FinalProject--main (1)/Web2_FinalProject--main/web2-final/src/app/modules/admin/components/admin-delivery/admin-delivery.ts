import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.services';
import type { AdminOrder } from '../../../../classes/admin';

@Component({
  selector: 'app-admin-delivery',
  standalone: false,
  styleUrl: './admin-delivery.css',
  templateUrl: './admin-delivery.html',
})
export class AdminDelivery implements OnInit {
  readonly statuses = [
    'Đã đặt hàng',
    'Đang giao hàng',
    'Đã giao hàng',
    'Trả hàng/Hoàn tiền',
    'Đã hủy'
  ];
  orders: AdminOrder[] = [];
  selectedOrder: AdminOrder | null = null;
  searchTerm = '';
  selectedStatus = '';
  loading = false;
  errorMessage = '';

  constructor(
    private readonly adminService: AdminService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  get filteredOrders(): AdminOrder[] {
    const keyword = this.searchTerm.trim().toLowerCase();
    return this.orders.filter(order => {
      const orderID = this.getOrderID(order).toLowerCase();
      const matchesSearch = !keyword || orderID.includes(keyword);
      const matchesStatus = !this.selectedStatus || this.getDisplayStatus(order.status) === this.selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.errorMessage = '';
    this.adminService.getOrders().subscribe({
      next: response => {
        this.orders = Array.isArray(response?.orders) ? response.orders : [];
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      },
      error: error => {
        console.error('Lỗi tải danh sách đơn hàng:', error);
        this.loading = false;
        this.errorMessage = error.error?.message || 'Không thể tải danh sách đơn hàng.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  openDetails(order: AdminOrder): void {
    this.selectedOrder = order;
  }

  closeDetails(): void {
    this.selectedOrder = null;
  }

  getOrderID(order: AdminOrder): string {
    return order.orderID || order.orderId || 'Chưa có mã đơn';
  }

  getDisplayStatus(status: string | undefined): string {
    const normalized = (status || '').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase();
    if (normalized.includes('huy')) return 'Đã hủy';
    if (normalized.includes('that bai')) return 'Giao hàng thất bại';
    if (normalized.includes('dang giao') || normalized.includes('dang van chuyen')) return 'Đang giao hàng';
    if (normalized.includes('da giao') || normalized.includes('hoan thanh')) return 'Đã giao hàng';
    if (normalized.includes('chua giao')) return 'Chưa giao hàng';
    if (normalized.includes('cho xac nhan') || normalized.includes('dat hang')) return 'Đã đặt hàng';
    return status || 'Chưa xác định';
  }

  getStatusClass(status: string | undefined): string {
    return {
      'Đã đặt hàng': 'ordered',
      'Chưa giao hàng': 'not-shipped',
      'Đang giao hàng': 'shipping',
      'Đã giao hàng': 'delivered',
      'Giao hàng thất bại': 'failed',
      'Đã hủy': 'cancelled'
    }[this.getDisplayStatus(status)] || 'unknown';
  }

  getProducts(order: AdminOrder): AdminOrder['products'] {
    return order.products || order.items || [];
  }

  formatDate(value: string | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
  }
}
