
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-logincomponent',
  standalone: false,
  styleUrl: './logincomponent.css',
  templateUrl: './logincomponent.html',
})
export class Logincomponent {
  identifier = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.errorMessage = '';

    if (this.loading) {
      return;
    }

    if (!this.identifier.trim() || !this.password) {
      this.errorMessage =
        'Vui lòng nhập tài khoản và mật khẩu.';
      return;
    }

    this.loading = true;

    this.authService
      .login(this.identifier.trim(), this.password)
      .subscribe({
        next: (response) => {
          this.loading = false;

          const user = response.user;

          switch (user.role) {
            case 'ADMIN':
              this.router.navigate(['/admin']);
              break;

            case 'SELLER':
              this.router.navigate(['/seller']);
              break;

            case 'TECHNICIAN':
              this.router.navigate(['/technician']);
              break;

            default:
              this.router.navigate(['/']);
              break;
          }
        },

        error: (error) => {
          this.loading = false;

          console.error('Login error:', error);

          if (error.status === 0) {
            this.errorMessage =
              'Không kết nối được máy chủ. Hãy kiểm tra backend tại cổng 3000.';
          } else if (error.status === 401) {
            this.errorMessage =
              error.error?.message ||
              'Tài khoản hoặc mật khẩu không chính xác.';
          } else {
            this.errorMessage =
              error.error?.message ||
              'Không thể đăng nhập. Vui lòng thử lại.';
          }
        },
      });
  }
}
