import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart';
import { OrderService } from '../../services/order';
import { ToastService } from '../../../../services/toast';

export interface SellerPackage {
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  sellerAddress: string;
  items: any[];
  shippingMethod: 'tieuchuan' | 'hoatoc';
}

@Component({
  selector: 'app-checkout',
  standalone: false,
  styleUrl: './checkout.css',
  templateUrl: './checkout.html',
})
export class Checkout implements OnInit {
  cartItems: any[] = [];
  sellerPackages: SellerPackage[] = [];

  fullName: string = '';
  phoneNumber: string = '';
  province: string = 'TP.HCM';
  district: string = '';
  addressDetail: string = '';
  note: string = '';

  availableProvinces: string[] = [
    'TP.HCM', 'Đà Nẵng', 'Hà Nội', 'Bình Dương', 'Cần Thơ', 'Đồng Nai', 'Hải Phòng'
  ];

  shippingFees = {
    tieuchuan: 20000,
    hoatoc: 35000
  };

  paymentMethod: 'cod' | 'banking' | 'momo' = 'cod';

  isSubmitting: boolean = false;
  errorMessage: string = '';

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    this.cartItems = this.cartService.getSelectedCheckoutItems();
    if (this.cartItems.length === 0) {
      this.cartItems = this.cartService.getCartItems();
    }
    if (this.cartItems.length === 0) {
      this.router.navigate(['/mua-hang']);
      return;
    }
    
    this.loadCustomerProfile();
    this.groupItemsBySeller();
  }

  loadCustomerProfile(): void {
    const currentUserId = this.orderService.getCurrentUserId() || 'CM000001';
    this.orderService.getUserProfile(currentUserId).subscribe({
      next: (user: any) => {
        if (user) {
          this.fullName = user.fullName || '';
          this.phoneNumber = user.phoneNumber || '';
          const fullAddr = (user.customerDetails && user.customerDetails.address) ? user.customerDetails.address : '';
          
          if (fullAddr) {
            const parts = fullAddr.split(',').map((s: string) => s.trim());
            if (parts.length >= 3) {
              this.addressDetail = parts.slice(0, parts.length - 2).join(', ');
              this.district = parts[parts.length - 2];
              this.province = parts[parts.length - 1];
            } else if (parts.length === 2) {
              this.addressDetail = parts[0];
              this.district = parts[1];
            } else {
              this.addressDetail = fullAddr;
            }
          }
        }
       
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.warn('Dùng mặc định nếu lỗi tải thông tin user:', err);
        this.fullName = 'Lê Quốc Khoa';
        this.phoneNumber = '0912384756';
        this.addressDetail = 'Số 142 Đường 12';
        this.district = 'Quận Bình Thạnh';
        this.province = 'TP.HCM';
        this.cdr.detectChanges();
      }
    });
  }

  groupItemsBySeller(): void {
    const groups: { [sellerId: string]: any[] } = {};
    
    this.cartItems.forEach(item => {
      const sId = item.sellerid || item.sellerId || 'SELLER_ECO';
      if (!groups[sId]) {
        groups[sId] = [];
      }
      groups[sId].push(item);
    });

    this.sellerPackages = Object.keys(groups).map(sId => {
      const itemsInGroup = groups[sId];
      const firstItem = itemsInGroup[0];
      const sellerInfo = firstItem.sellerInfo || {};
      const displayName = sellerInfo.name || (sId.startsWith('usr') ? `Thành viên ${sId}` : `Người bán ${sId}`);
      
      return {
        sellerId: sId,
        sellerName: displayName,
        sellerAvatar: sellerInfo.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        sellerAddress: sellerInfo.address || firstItem.sellerLocation || '',
        items: itemsInGroup,
        shippingMethod: 'tieuchuan'
      };
    });
  }

  setSellerShippingMethod(pkg: SellerPackage, method: 'tieuchuan' | 'hoatoc'): void {
    pkg.shippingMethod = method;
  }

  getSubTotal(): number {
    return this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  getTotalShippingFee(): number {
    return this.sellerPackages.reduce((total, pkg) => total + this.shippingFees[pkg.shippingMethod], 0);
  }

  getTotalAmount(): number {
    return this.getSubTotal() + this.getTotalShippingFee();
  }

  onSubmitOrder(): void {
    if (!this.fullName.trim() || !this.phoneNumber.trim() || !this.addressDetail.trim()) {
      this.errorMessage = 'Vui lòng điền đầy đủ Thông tin người nhận và Địa chỉ giao hàng!';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const orderData = {
      customerID: this.orderService.getCurrentUserId() || 'CM000001',
      items: this.cartItems.map(item => ({
        productId: item.id,
        title: item.title,
        img: item.img,
        price: item.price,
        quantity: item.quantity,
        condition: item.condition,
        sellerId: item.sellerid || item.sellerId || 'SELLER_ECO'
      })),
      sellerPackages: this.sellerPackages.map(pkg => ({
        sellerId: pkg.sellerId,
        sellerName: pkg.sellerName,
        shippingMethod: pkg.shippingMethod,
        shippingFee: this.shippingFees[pkg.shippingMethod],
        itemIds: pkg.items.map(i => i.id)
      })),
      shippingInfo: {
        fullName: this.fullName,
        phoneNumber: this.phoneNumber,
        province: this.province,
        district: this.district,
        addressDetail: this.addressDetail,
        note: this.note,
        paymentMethod: this.paymentMethod
      },
      subTotal: this.getSubTotal(),
      shippingFee: this.getTotalShippingFee(),
      totalAmount: this.getTotalAmount()
    };

    this.orderService.createOrder(orderData).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        const orderedIds = this.cartItems.map(item => item.id);
        this.cartService.removeOrderedItems(orderedIds);
        this.toastService.showToast(`🎉 Đặt hàng thành công! Mã đơn hàng: ${res.order.orderId}`, 'success');
        this.router.navigate(['/don-hang-da-dat']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại!';
      }
    });
  }

  formatPrice(num: number): string {
    return num.toLocaleString('vi-VN') + '₫';
  }
}
