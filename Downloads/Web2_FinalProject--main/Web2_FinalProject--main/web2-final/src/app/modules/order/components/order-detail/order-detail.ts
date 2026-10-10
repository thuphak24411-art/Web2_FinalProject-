import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order';
import { ToastService } from '../../../../services/toast';

@Component({
  selector: 'app-order-detail',
  standalone: false,
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css'
})
export class OrderDetail implements OnInit {
  orderId: string = '';
  order: any = null;
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.orderId = id;
      this.fetchOrderDetail(id);
    } else {
      this.errorMessage = 'Không tìm thấy thông tin đơn hàng!';
      this.isLoading = false;
    }
  }

  fetchOrderDetail(id: string): void {
    this.isLoading = true;
    this.orderService.getOrderDetail(id).subscribe({
      next: (data) => {
        this.order = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = 'Lỗi tải chi tiết đơn hàng từ hệ thống!';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/don-hang-da-dat']);
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
