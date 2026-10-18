import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AdminService, AdminUser } from '../../services/admin.services';

@Component({
  selector: 'app-admin-greencoin-update',
  standalone: false,
  styleUrl: './admin-greencoin-update.css',
  templateUrl: './admin-greencoin-update.html',
})
export class AdminGreencoinUpdate {
  @Input({ required: true }) user!: AdminUser;
  @Output() readonly updated = new EventEmitter<{ user: AdminUser; amount: number }>();
  @Output() readonly cancelled = new EventEmitter<void>();

  recycledKg = 0;
  loading = false;
  errorMessage = '';

  constructor(private readonly adminService: AdminService) {}

  submit(): void {
    const recycledKg = Number(this.recycledKg);
    const amount = this.getCalculatedCoins();
    if (!this.user.userID || !Number.isFinite(recycledKg) || recycledKg <= 0 || !Number.isInteger(amount) || this.loading) return;

    this.loading = true;
    this.errorMessage = '';
    this.adminService.addGreenCoins(this.user.userID, recycledKg).subscribe({
      next: response => {
        this.loading = false;
        this.updated.emit(response);
      },
      error: error => {
        console.error('Lỗi thêm GreenCoin:', error);
        this.loading = false;
        this.errorMessage = error.error?.message || 'Không thể thêm GreenCoin.';
      }
    });
  }

  close(): void {
    if (!this.loading) this.cancelled.emit();
  }

  getDisplayName(): string {
    return this.user?.fullName || this.user?.userName || this.user?.email || this.user?.userID || 'tài khoản';
  }

  getCalculatedCoins(): number {
    const kg = Number(this.recycledKg);
    return Number.isFinite(kg) && kg > 0 ? kg * 1000 : 0;
  }
}
