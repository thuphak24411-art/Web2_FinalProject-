import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../classes/user';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  user: User | null;
  fullName = '';
  email = '';
  phoneNumber = '';
  province = '';
  district = '';
  streetAddress = '';
  businessName = '';
  shopName = '';
  saving = false;
  message = '';
  errorMessage = '';
  private userSubscription?: Subscription;

  constructor(private authService: AuthService, private router: Router) {
    this.user = authService.currentUser;
  }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }
      this.fullName = user.fullName || '';
      this.email = user.email || '';
      this.phoneNumber = user.phoneNumber || '';
      const details = user.role === 'SELLER' ? user.sellerDetails : user.customerDetails;
      this.province = details?.province || '';
      this.district = details?.district || '';
      this.streetAddress = details?.streetAddress || details?.address || '';
      if (!details?.province && details?.address) {
        const addressParts = details.address.split(',').map(part => part.trim()).filter(Boolean);
        if (addressParts.length >= 3) {
          this.streetAddress = addressParts.slice(0, -2).join(', ');
          this.district = addressParts[addressParts.length - 2];
          this.province = addressParts[addressParts.length - 1];
        } else if (addressParts.length === 2) {
          this.streetAddress = addressParts[0];
          this.district = addressParts[1];
        }
      }
      this.businessName = user.sellerDetails?.businessName || '';
      this.shopName = user.sellerDetails?.shopName || '';
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  logout(): void {
    if (!window.confirm('Bạn có chắc muốn đăng xuất khỏi tài khoản không?')) {
      return;
    }
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  save(): void {
    this.saving = true;
    this.message = '';
    this.errorMessage = '';
    this.authService.updateProfile({
      fullName: this.fullName,
      email: this.email,
      phoneNumber: this.phoneNumber,
      province: this.province,
      district: this.district,
      streetAddress: this.streetAddress,
      ...(this.user?.role === 'SELLER'
        ? { businessName: this.businessName, shopName: this.shopName }
        : {})
    }).subscribe({
      next: response => {
        this.saving = false;
        this.user = this.authService.currentUser;
        this.message = response.message;
      },
      error: error => {
        this.saving = false;
        this.errorMessage = error.error?.message || 'Không thể cập nhật hồ sơ.';
      }
    });
  }
}
