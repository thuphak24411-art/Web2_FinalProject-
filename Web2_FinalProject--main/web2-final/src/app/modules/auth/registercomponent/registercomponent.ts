import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  AuthService,
  RegisterRequest
} from '../../../services/auth.service';
import { ToastService } from '../../../services/toast';
@Component({
  selector: 'app-registercomponent',
  standalone: false,
  styleUrl: './registercomponent.css',
  templateUrl: './registercomponent.html',
})
export class Registercomponent {
   userName = '';
  fullName = '';
  email = '';
  phoneNumber = '';
  province = '';
  district = '';
  streetAddress = '';
  businessName = '';
  shopName = '';
  password = '';
  confirmPassword = '';
  showPassword = false;

  role: 'CUSTOMER' | 'SELLER' = 'CUSTOMER';

  loading = false;
  errorMessage = '';
  emailError = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
    private changeDetector: ChangeDetectorRef
  ) {}

  get isStrongPassword(): boolean {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/.test(this.password);
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.emailError = '';
    this.successMessage = '';

    if (this.loading) {
      return;
    }

    if (
      !this.userName.trim() ||
      !this.fullName.trim() ||
      !this.email.trim() ||
      !this.password ||
      !this.province.trim() ||
      !this.streetAddress.trim() ||
      (this.role === 'SELLER' && (!this.businessName.trim() || !this.shopName.trim()))
    ) {
      this.errorMessage =
        'Vui lòng nhập đầy đủ thông tin bắt buộc.';
      return;
    }

    const normalizedEmail = this.email.trim().toLowerCase();
    const normalizedPhone = this.phoneNumber.trim().replace(/[\s.-]/g, '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) {
      this.errorMessage = 'Email không hợp lệ. Ví dụ: ten@mien.com.';
      return;
    }

    if (!/^(?:0|\+84)(?:3|5|7|8|9)\d{8}$/.test(normalizedPhone)) {
      this.errorMessage = 'Số điện thoại phải là số di động hợp lệ, ví dụ 0912345678.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Mật khẩu xác nhận không khớp.';
      return;
    }

    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/
        .test(this.password);

    if (!strongPassword) {
      this.errorMessage =
        'Mật khẩu cần có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.';
      return;
    }

    const data: RegisterRequest = {
      userName: this.userName.trim(),
      fullName: this.fullName.trim(),
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
      province: this.province.trim(),
      district: this.district.trim(),
      streetAddress: this.streetAddress.trim(),
      password: this.password,
      role: this.role,
      ...(this.role === 'SELLER'
        ? {
            businessName: this.businessName.trim(),
            shopName: this.shopName.trim()
          }
        : {})
    };

    this.loading = true;

    this.authService.register(data).subscribe({
      next: response => {
        this.loading = false;
        this.successMessage =
          response.message +
          ' Bạn có thể đăng nhập ngay.';
        this.changeDetector.markForCheck();
        this.toastService.showToast(this.successMessage, 'success', 'Đăng ký thành công');

        this.password = '';
        this.confirmPassword = '';

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1000);
      },
      error: error => {
        this.loading = false;
        this.changeDetector.markForCheck();
        if (error.status === 0) {
          this.errorMessage =
            'Không kết nối được máy chủ. Hãy chạy backend tại cổng 3000 rồi thử lại.';
          this.toastService.showToast(this.errorMessage, 'error', 'Không thể kết nối');
          return;
        }

        if (
          error.status === 409 &&
          (error.error?.code === 'EMAIL_ALREADY_REGISTERED' ||
            String(error.error?.message || '').toLowerCase().includes('email'))
        ) {
          this.emailError = 'Email đã được đăng ký. Vui lòng nhập email mới.';
          this.errorMessage = '';
          this.toastService.showToast(this.emailError, 'error', 'Email đã tồn tại');
          setTimeout(() => {
            document.getElementById('email')?.focus();
            this.changeDetector.markForCheck();
          }, 0);
          return;
        }

        this.errorMessage = error.error?.message ||
          (error.status === 400
            ? 'Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại các trường đã nhập.'
            : 'Đăng ký thất bại. Vui lòng thử lại.');
        this.toastService.showToast(this.errorMessage, 'error', 'Đăng ký chưa thành công');
      }
    });
  }
}
