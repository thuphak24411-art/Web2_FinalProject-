import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ProductService } from '../../services/product';
import { AuthService } from '../../../../services/auth.service';
import { ToastService } from '../../../../services/toast';
import { User } from '../../../../classes/user';

@Component({
  selector: 'app-product-post',
  standalone: false,
  styleUrl: './product-post.css',
  templateUrl: './product-post.html',
})
export class ProductPost implements OnInit {
  title: string = '';
  cateID: string = 'c1';
  fromPrice: string = '';
  condition: string = 'Mới 95%';
  img: string = '';
  description: string = '';

  isSubmitting: boolean = false;
  errorMessage: string = '';
  currentUser: User | null = null;

  constructor(
    private router: Router,
    private productService: ProductService,
    private authService: AuthService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'instant' });
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.cdr.detectChanges();
    });

    if (!this.authService.isLoggedIn) {
      this.toastService.showToast('Vui lòng đăng nhập để thực hiện đăng bán thiết bị!', 'warning', 'Cảnh báo');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/dang-ban' } });
    }
  }

  onSubmit(): void {
    if (!this.title.trim()) {
      this.errorMessage = 'Vui lòng nhập tên sản phẩm thiết bị!';
      return;
    }

    const priceNum = parseFloat(this.fromPrice.replace(/[^0-9]/g, ''));
    if (!priceNum || priceNum <= 0) {
      this.errorMessage = 'Vui lòng nhập giá mong muốn bán hợp lệ!';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload = {
      title: this.title.trim(),
      cateID: this.cateID,
      condition: this.condition,
      fromPrice: priceNum,
      img: this.img.trim() || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=150',
      description: this.description.trim()
    };

    this.productService.createProductRequest(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.toastService.showToast(res.message || 'Đã gửi yêu cầu đăng bán thành công!', 'success');
        this.router.navigate(['/mua-hang']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Có lỗi xảy ra khi gửi yêu cầu đăng bán. Vui lòng thử lại!';
        this.toastService.showToast(this.errorMessage, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/mua-hang']);
  }
}
