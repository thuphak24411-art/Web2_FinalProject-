import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { Subscription } from 'rxjs';

import {
  EnvironmentService,
  EnvironmentStats
} from '../../services/environment';

import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-environment-dashboard',
  standalone: false,
  templateUrl: './environment-dashboard.html',
  styleUrl: './environment-dashboard.css'
})
export class EnvironmentDashboard implements OnInit, OnDestroy {

  community: EnvironmentStats | null = null;
  personal: EnvironmentStats | null = null;

  loadingCommunity = true;
  loadingPersonal = false;

  communityError = '';
  personalError = '';

  isLoggedIn = false;
  selectedPersonalStat:
    'listed' | 'purchased' | 'reused' | 'recycled' | null = null;

  selectPersonalStat(
    stat: 'listed' | 'purchased' | 'reused' | 'recycled'
  ): void {
    this.selectedPersonalStat =
      this.selectedPersonalStat === stat ? null : stat;
  }
  selectedAchievement: 'starter' | 'buyer' | 'recycler' | null = null;
  toggleAchievement(
    achievement: 'starter' | 'buyer' | 'recycler'
  ): void {
    this.selectedAchievement =
      this.selectedAchievement === achievement ? null : achievement;
  }

  getAchievementProgress(value: number, target: number): number {
    if (target <= 0) return 100;

    return Math.min(100, Math.max(0, (value / target) * 100));
  }

  getAchievementRemaining(value: number, target: number): number {
    return Math.max(0, target - value);
  }

  private authSubscription?: Subscription;
  private communityRequest?: Subscription;
  private personalRequest?: Subscription;

  constructor(
    private environmentService: EnvironmentService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCommunity();

    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user && this.authService.isLoggedIn;

      this.personalRequest?.unsubscribe();
      this.personal = null;
      this.personalError = '';

      if (this.isLoggedIn) {
        this.loadPersonal();
      } else {
        this.loadingPersonal = false;
      }

      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    this.communityRequest?.unsubscribe();
    this.personalRequest?.unsubscribe();
  }

  loadCommunity(): void {
    this.loadingCommunity = true;
    this.communityError = '';

    this.communityRequest?.unsubscribe();

    this.communityRequest = this.environmentService
      .getCommunityStats()
      .subscribe({
        next: (data: EnvironmentStats) => {
          this.community = data;
          this.loadingCommunity = false;

          // Cập nhật giao diện sau khi API trả dữ liệu
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Environment dashboard API error:', error);

          this.communityError = 'Không thể tải dữ liệu môi trường.';
          this.loadingCommunity = false;

          this.cdr.detectChanges();
        }
      });
  }

  loadPersonal(): void {
    this.loadingPersonal = true;
    this.personalError = '';

    this.personalRequest?.unsubscribe();

    this.personalRequest = this.environmentService
      .getPersonalStats()
      .subscribe({
        next: (data: EnvironmentStats) => {
          this.personal = data;
          this.loadingPersonal = false;

          // Cập nhật giao diện cá nhân
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Environment personal API error:', error);

          this.personalError = 'Không thể tải dữ liệu cá nhân.';
          this.loadingPersonal = false;

          this.cdr.detectChanges();
        }
      });
  }

  get reusePercent(): number {
    if (!this.community?.devicesPurchased) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        this.community.reusedDevicesPurchased /
        this.community.devicesPurchased * 100
      )
    );
  }

  get personalReusePercent(): number {
    if (!this.personal?.devicesPurchased) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        this.personal.reusedDevicesPurchased /
        this.personal.devicesPurchased * 100
      )
    );
  }

  selectedReuseSegment: 'reused' | 'other' = 'reused';
  showCo2Details = false;

  selectReuseSegment(segment: 'reused' | 'other'): void {
    this.selectedReuseSegment = segment;
  }

  toggleCo2Details(): void {
    this.showCo2Details = !this.showCo2Details;
  }

  get selectedReusePercent(): number {
    return this.selectedReuseSegment === 'reused'
      ? this.reusePercent
      : 100 - this.reusePercent;
  }

  formatNumber(value: number): string {
    return value.toLocaleString('vi-VN', {
      maximumFractionDigits: 2
    });
  }
}