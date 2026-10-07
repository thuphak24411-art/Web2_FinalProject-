import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { Product } from '../../../classes/product';
import { ToastService } from '../../../services/toast';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private _cartCountSource = new BehaviorSubject<number>(0);
  cartCount$ = this._cartCountSource.asObservable();

  private _currentUserId: string = 'CM000001';
  private _selectedCheckoutItems: any[] = [];

  constructor(
    private _http: HttpClient,
    private _toastService: ToastService
  ) {
    this.loadCartFromBackend();
  }

  getCurrentUserId(): string {
    return this._currentUserId;
  }

  setCurrentUserId(userId: string): void {
    this._currentUserId = userId;
    this.loadCartFromBackend();
  }

  getCartStorageKey(): string {
    return `ecocycle_cart_${this._currentUserId}`;
  }

  getCartItems(): any[] {
    const data = localStorage.getItem(this.getCartStorageKey());
    return data ? JSON.parse(data) : [];
  }

  private syncCartCount(): void {
    const cart = this.getCartItems();
    const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    this._cartCountSource.next(totalCount);
  }

  private saveCart(cart: any[]): void {
    localStorage.setItem(this.getCartStorageKey(), JSON.stringify(cart));
    this.syncCartCount();
    this._http.post(`http://localhost:3000/carts/${this._currentUserId}`, { items: cart }).subscribe({
      error: (err) => console.warn('Lỗi đồng bộ giỏ hàng tới MongoDB backend:', err)
    });
  }

  loadCartFromBackend(): void {
    this._http.get<any[]>(`http://localhost:3000/carts/${this._currentUserId}`).subscribe({
      next: (items) => {
        if (items) {
          localStorage.setItem(this.getCartStorageKey(), JSON.stringify(items));
          this.syncCartCount();
        }
      },
      error: () => this.syncCartCount()
    });
  }

  addToCart(product: Product, qty: number = 1): boolean {
    const cart = this.getCartItems();
    const existingIndex = cart.findIndex(item => item.id === product.id);
    const maxStock = product.quantity && product.quantity > 0 ? product.quantity : 1;

    let currentQtyInCart = 0;
    if (existingIndex > -1) {
      currentQtyInCart = cart[existingIndex].quantity || 1;
    }

    if (currentQtyInCart + qty > maxStock) {
      this._toastService.showToast(`Sản phẩm "${product.title}" chỉ còn sẵn ${maxStock} sản phẩm trong kho!`, 'error');
      return false;
    }

    if (existingIndex > -1) {
      cart[existingIndex].quantity = currentQtyInCart + qty;
    } else {
      const priceNum = parseInt((product.fromPrice || '0').replace(/[^0-9]/g, ''), 10) || 0;
      cart.push({
        id: product.id,
        title: product.title,
        img: product.img,
        fromPrice: product.fromPrice,
        price: priceNum,
        condition: product.condition || 'Đã qua sử dụng',
        maxStock: maxStock,
        quantity: qty,
        sellerid: product.sellerid || 'SELLER_ECO',
        sellerLocation: product.sellerLocation || 'TP.HCM',
        sellerInfo: product.sellerInfo || null
      });
    }

    this.saveCart(cart);
    this._toastService.showToast(`Đã thêm "${product.title}" vào giỏ hàng thành công!`, 'success');
    return true;
  }

  updateCartQuantity(productId: string, qty: number, maxStock: number = 999): boolean {
    let cart = this.getCartItems();
    if (qty <= 0) {
      cart = cart.filter(item => item.id !== productId);
    } else {
      const item = cart.find(i => i.id === productId);
      if (item) {
        const allowedMax = item.maxStock || maxStock;
        if (qty > allowedMax) {
          this._toastService.showToast(`Không thể vượt quá số lượng ${allowedMax} sản phẩm sẵn có!`, 'error');
          return false;
        }
        item.quantity = qty;
      }
    }
    this.saveCart(cart);
    return true;
  }

  removeFromCart(productId: string): void {
    const cart = this.getCartItems().filter(item => item.id !== productId);
    this.saveCart(cart);
    this._toastService.showToast('Đã xóa sản phẩm khỏi giỏ hàng.', 'info');
  }

  clearCart(): void {
    localStorage.removeItem(this.getCartStorageKey());
    this.syncCartCount();
    this._http.delete(`http://localhost:3000/carts/${this._currentUserId}`).subscribe();
  }

  setSelectedCheckoutItems(items: any[]): void {
    this._selectedCheckoutItems = items;
    sessionStorage.setItem(`ecocycle_checkout_items_${this._currentUserId}`, JSON.stringify(items));
  }

  getSelectedCheckoutItems(): any[] {
    const saved = sessionStorage.getItem(`ecocycle_checkout_items_${this._currentUserId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return this._selectedCheckoutItems;
      }
    }
    return this._selectedCheckoutItems;
  }

  removeOrderedItems(orderedItemIds: string[]): void {
    let cart = this.getCartItems();
    cart = cart.filter(item => !orderedItemIds.includes(item.id));
    this.saveCart(cart);
    sessionStorage.removeItem(`ecocycle_checkout_items_${this._currentUserId}`);
  }
}
