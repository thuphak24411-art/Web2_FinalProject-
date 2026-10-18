import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart';
import { ToastService } from '../../../../services/toast';

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

  formatPrice(num: number): string {
    return (num || 0).toLocaleString('vi-VN') + '₫';
  }

  proceedToCheckout(): void {
    const selectedItems = this.getSelectedItems();
    if (selectedItems.length === 0) {
      this.toastService.showToast('Vui lòng chọn ít nhất 1 sản phẩm để tiến hành thanh toán!', 'error');
      return;
    }
    this.cartService.setSelectedCheckoutItems(selectedItems);
    this.router.navigate(['/thanh-toan']);
  }
}
