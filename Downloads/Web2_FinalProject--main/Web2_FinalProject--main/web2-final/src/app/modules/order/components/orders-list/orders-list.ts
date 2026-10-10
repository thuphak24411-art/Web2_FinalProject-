import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { OrderService } from '../../services/order';
import { ToastService } from '../../../../services/toast';

export interface OrderTab {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-orders-list',
  standalone: false,
  styleUrl: './orders-list.css',
  templateUrl: './orders-list.html',
})
export class OrdersList implements OnInit {
  allOrders: any[] = [];
  filteredOrders: any[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  tabs: OrderTab[] = [
    { id: 'ALL', label: 'Tất cả', icon: 'bi-grid-fill' },
    { id: 'CHO_XAC_NHAN', label: 'Chờ xác nhận', icon: 'bi-hourglass-split' },
    { id: 'DANG_GIAO', label: 'Đang giao hàng', icon: 'bi-truck' },
    { id: 'DA_GIAO', label: 'Đã giao', icon: 'bi-check-circle-fill' },
    { id: 'DA_HUY', label: 'Đã hủy', icon: 'bi-x-circle-fill' },
    { id: 'TRA_HANG', label: 'Trả hàng/Hoàn tiền', icon: 'bi-arrow-counterclockwise' }
  ];

  activeTab: string = 'ALL';

  showCancelModal: boolean = false;
  selectedOrderIdToCancel: string | null = null;
  isCanceling: boolean = false;

  constructor(
    private orderService: OrderService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'instant' });
    this.fetchOrders();
  }

  fetchOrders(): void {
    this.isLoading = true;
    this.orderService.getOrdersList().subscribe({
      next: (data) => {
        this.allOrders = data || [];
        this.filterOrdersByTab();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = 'Lỗi tải danh sách đơn hàng đã đặt!';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectTab(tabId: string): void {
    this.activeTab = tabId;
    this.filterOrdersByTab();
    this.cdr.detectChanges();
  }

  filterOrdersByTab(): void {
    if (this.activeTab === 'ALL') {
      this.filteredOrders = [...this.allOrders];
      return;
    }

    this.filteredOrders = this.allOrders.filter(ord => {
      const st = (ord.status || '').toLowerCase().trim();
      switch (this.activeTab) {
        case 'CHO_XAC_NHAN':
          return st === 'chờ xác nhận' || st === 'đã đặt hàng';
        case 'DANG_GIAO':
          return st === 'đang giao hàng' || st === 'đang vận chuyển';
        case 'DA_GIAO':
          return st === 'đã giao hàng' || st === 'đã giao' || st === 'hoàn thành';
        case 'DA_HUY':
          return st === 'đã hủy' || st === 'đã huỷ';
        case 'TRA_HANG':
          return st === 'trả hàng/hoàn tiền' || st === 'hoàn tiền';
        default:
          return true;
      }
    });
  }

  getOrderCountByTab(tabId: string): number {
    if (tabId === 'ALL') return this.allOrders.length;
    return this.allOrders.filter(ord => {
      const st = (ord.status || '').toLowerCase().trim();
      switch (tabId) {
        case 'CHO_XAC_NHAN':
          return st === 'chờ xác nhận' || st === 'đã đặt hàng';
        case 'DANG_GIAO':
          return st === 'đang giao hàng' || st === 'đang vận chuyển';
        case 'DA_GIAO':
          return st === 'đã giao hàng' || st === 'đã giao' || st === 'hoàn thành';
        case 'DA_HUY':
          return st === 'đã hủy' || st === 'đã huỷ';
        case 'TRA_HANG':
          return st === 'trả hàng/hoàn tiền' || st === 'hoàn tiền';
        default:
          return false;
      }
    }).length;
  }

  onCancelOrder(orderId: string): void {
    this.selectedOrderIdToCancel = orderId;
    this.showCancelModal = true;
    this.cdr.detectChanges();
  }

  closeCancelModal(): void {
    if (this.isCanceling) return;
    this.showCancelModal = false;
    this.selectedOrderIdToCancel = null;
    this.cdr.detectChanges();
  }

  confirmCancelOrder(): void {
    if (!this.selectedOrderIdToCancel || this.isCanceling) return;

    this.isCanceling = true;
    const targetId = this.selectedOrderIdToCancel;

    this.orderService.cancelOrder(targetId).subscribe({
      next: (res) => {
        this.isCanceling = false;
        this.showCancelModal = false;
        this.selectedOrderIdToCancel = null;
        this.toastService.showToast('Hủy đơn thành công.', 'success');
        this.fetchOrders();
      },
      error: (err) => {
        this.isCanceling = false;
        this.toastService.showToast('Không thể hủy đơn hàng. Vui lòng thử lại!', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  formatPrice(num: number): string {
    return (num || 0).toLocaleString('vi-VN') + '₫';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      return dateStr.split(' ')[0];
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
      return dateStr;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
