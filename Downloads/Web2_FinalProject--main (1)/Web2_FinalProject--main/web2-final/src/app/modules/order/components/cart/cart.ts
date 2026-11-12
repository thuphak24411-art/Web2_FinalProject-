import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart';
import { ToastService } from '../../../../services/toast';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-cart',
  standalone: false,
  styleUrl: './cart.css',
  templateUrl: './cart.html',
})
export class Cart implements OnInit {
  cartItems: any[] = [];
  selectedIds: string[] = [];

  constructor(
    private cartService: CartService,
    private toastService: ToastService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'instant' });
    this.loadCart();
  }

  loadCart(): void {
    this.cartItems = this.cartService.getCartItems();
   
    this.selectedIds = this.cartItems.map(item => item.id);
  }

  isAllSelected(): boolean {
    return this.cartItems.length > 0 && this.selectedIds.length === this.cartItems.length;
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedIds = [];
    } else {
      this.selectedIds = this.cartItems.map(item => item.id);
    }
  }

  toggleSelectItem(productId: string): void {
    const idx = this.selectedIds.indexOf(productId);
    if (idx > -1) {
      this.selectedIds.splice(idx, 1);
    } else {
      this.selectedIds.push(productId);
    }
  }

  isSelected(productId: string): boolean {
    return this.selectedIds.includes(productId);
  }

  updateQuantity(item: any, delta: number): void {
    const newQty = (item.quantity || 1) + delta;
    this.cartService.updateCartQuantity(item.id, newQty, item.maxStock);
    this.loadCart();
  }

  removeItem(productId: string): void {
    this.cartService.removeFromCart(productId);
    this.loadCart();
  }

  clearAll(): void {
    this.cartService.clearCart();
    this.loadCart();
  }

  getSelectedItems(): any[] {
    return this.cartItems.filter(item => this.selectedIds.includes(item.id));
  }

  getTotalQuantity(): number {
    return this.cartItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
  }

  getSelectedTotalQuantity(): number {
    return this.getSelectedItems().reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
  }

  getSubTotal(): number {
    return this.getSelectedItems().reduce((sum: number, item: any) => sum + (item.price * (item.quantity || 1)), 0);
  }

  formatPrice(val: any): string {
    if (val === undefined || val === null || val === '') return '0₫';
    if (typeof val === 'number') {
      return val.toLocaleString('vi-VN') + '₫';
    }
    const str = String(val).trim();
    const num = parseFloat(str.replace(/[^0-9]/g, ''));
    if (isNaN(num)) return str;
    return num.toLocaleString('vi-VN') + '₫';
  }

  proceedToCheckout(): void {
    if (!this.authService.isLoggedIn) {
      this.toastService.showToast('Vui lòng đăng nhập để tiến hành thanh toán!', 'warning', 'Cảnh báo');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/thanh-toan' } });
      return;
    }
    const selectedItems = this.getSelectedItems();
    if (selectedItems.length === 0) {
      this.toastService.showToast('Vui lòng chọn ít nhất 1 sản phẩm để tiến hành thanh toán!', 'error');
      return;
    }
    this.cartService.setSelectedCheckoutItems(selectedItems);
    this.router.navigate(['/thanh-toan']);
  }
}
