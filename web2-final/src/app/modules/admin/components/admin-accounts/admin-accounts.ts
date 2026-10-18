import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AdminService, AdminUser } from '../../services/admin.services';

@Component({
  selector: 'app-admin-accounts',
  standalone: false,
  styleUrl: './admin-accounts.css',
  templateUrl: './admin-accounts.html',
})
export class AdminAccounts implements OnInit {
  users: AdminUser[] = [];
  selectedUser: AdminUser | null = null;
  greenCoinUser: AdminUser | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';
  searchTerm = '';

  get filteredUsers(): AdminUser[] {
    const keyword = this.searchTerm.trim().toLowerCase();
    if (!keyword) return this.users;
    return this.users.filter(user =>
      (user.userName || '').toLowerCase().includes(keyword) ||
      (user.fullName || '').toLowerCase().includes(keyword)
    );
  }

  constructor(
    private readonly adminService: AdminService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';
    this.adminService.getUsers().subscribe({
      next: response => {
        this.users = Array.isArray(response?.users) ? response.users : [];
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      },
      error: error => {
        console.error('Lỗi tải danh sách tài khoản:', error);
        this.loading = false;
        this.errorMessage = error.error?.message || 'Không thể tải danh sách tài khoản.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  openDetails(user: AdminUser): void {
    this.selectedUser = user;
  }

  closeDetails(): void {
    this.selectedUser = null;
  }

  openGreenCoinForm(user: AdminUser): void {
    this.greenCoinUser = user;
  }

  closeGreenCoinForm(): void {
    this.greenCoinUser = null;
  }

  onGreenCoinsUpdated(response: { user: AdminUser; amount: number }): void {
    const updatedUser = this.users.find(item => item.userID === response.user.userID);
    if (updatedUser) {
      updatedUser.greenCoins = response.user.greenCoins;
      updatedUser.eWasteRecycledKg = response.user.eWasteRecycledKg;
    }
    const selectedUser = this.selectedUser;
    if (selectedUser && selectedUser.userID === response.user.userID) {
      selectedUser.greenCoins = response.user.greenCoins;
      selectedUser.eWasteRecycledKg = response.user.eWasteRecycledKg;
    }
    this.greenCoinUser = null;
    this.successMessage = `Đã thêm ${response.amount.toLocaleString('vi-VN')} GreenCoin cho ${this.getDisplayName(response.user)}.`;
    this.changeDetectorRef.detectChanges();
  }

  getDisplayName(user: AdminUser): string {
    return user.fullName || user.userName || user.email || user.userID || 'Tài khoản chưa đặt tên';
  }

  getInitials(user: AdminUser): string {
    return this.getDisplayName(user).trim().slice(0, 2).toUpperCase();
  }

  formatNumber(value: number | undefined): string {
    return (value || 0).toLocaleString('vi-VN');
  }

  formatDate(value: string | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
  }

  getAddress(user: AdminUser): string {
    const details = user.role === 'SELLER' ? user.sellerDetails : user.customerDetails;
    if (!details) return user.address || '—';

    return [
      details.streetAddress,
      details.district,
      details.province
    ].filter(Boolean).join(', ') || details.address || user.address || '—';
  }
}
