import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../services/product';
import { CartService } from '../../../order/services/cart';
import { Product } from '../../../../classes/product';
import { User } from '../../../../classes/user';
import { extractIdFromSlug, getIdentityType } from '../../../../classes/slug-helper';

@Component({
  selector: 'app-product-detail',
  standalone: false,
  styleUrl: './product-detail.css',
  templateUrl: './product-detail.html',
})
export class ProductDetail implements OnInit {
  readonly fallbackImage = '/assets/ecocycle-logo.svg';
  product: Product | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';

  sellerInfo: User | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const type = getIdentityType(idParam);
      let id = idParam;
      if (type === 'SLUG_WITH_ID') {
        id = extractIdFromSlug(idParam) || idParam;
      }
      this.loadProductDetail(id);
    } else {
      this.errorMessage = 'Không tìm thấy sản phẩm!';
      this.isLoading = false;
    }
  }

  loadProductDetail(id: string): void {
    this.isLoading = true;
    this.productService.getProductDetail(id).subscribe({
      next: (data) => {
        this.product = data;
        if (data && data.sellerInfo) {
          this.sellerInfo = data.sellerInfo;
        } else if (data) {
          this.generateFallbackSellerInfo(data.sellerid);
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = 'Lỗi tải chi tiết sản phẩm từ MongoDB!';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '01/01/2026';
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

  generateFallbackSellerInfo(sellerId: string): void {
    const defaultId = sellerId || 'SELLER_ECO';
    this.sellerInfo = {
      id: defaultId,
      name: `Cửa hàng Sinh viên ECO (${defaultId})`,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      address: 'Khu Đô thị Đại học Quốc gia TP.HCM',
      soldCount: 35,
      rating: 4.9,
      joinDate: '01/01/2026',
      phone: '0988 xxx 666',
      isVerified: true
    };
  }

  goBack(): void {
    this.router.navigate(['/mua-hang']);
  }

  addToCart(): void {
    if (this.product) {
      this.cartService.addToCart(this.product, 1);
    }
  }

  buyNow(): void {
    if (this.product) {
      const priceNum = parseInt((this.product.fromPrice || '0').replace(/[^0-9]/g, ''), 10) || 0;
      const singleCheckoutItem = [{
        id: this.product.id,
        title: this.product.title,
        img: this.product.img,
        fromPrice: this.product.fromPrice,
        price: priceNum,
        condition: this.product.condition || 'Đã qua sử dụng',
        quantity: 1,
        maxStock: this.product.quantity || 1,
        sellerid: this.product.sellerid || 'SELLER_ECO',
        sellerLocation: this.product.sellerLocation || 'TP.HCM',
        sellerInfo: this.sellerInfo || this.product.sellerInfo || null
      }];
      this.cartService.setSelectedCheckoutItems(singleCheckoutItem);
      this.router.navigate(['/thanh-toan']);
    }
  }

  requestRepair(): void {
    if (!this.product) return;
    this.router.navigate(['/sua-chua'], {
      queryParams: {
        productID: this.product.id,
        deviceName: this.product.title,
        deviceType: 'Điện thoại'
      }
    });
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.src.endsWith(this.fallbackImage)) return;
    image.src = this.fallbackImage;
  }
}
