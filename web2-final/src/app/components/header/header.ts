import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ProductService } from '../../modules/marketplace/services/product';
import { CartService } from '../../modules/order/services/cart';
import { NotificationItem } from '../../classes/notification';
import { AuthService } from '../../services/auth.service';
import { User } from '../../classes/user';

export interface NavItem {
  id?: string;
  label: string;
  href: string;
  icon?: string;
  active?: boolean;
}

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent implements OnInit {
  navItems = signal<NavItem[]>([
    { id: 'sua-chua', label: 'Sửa chữa', href: '/sua-chua' },
    { id: 'tai-che', label: 'Sản phẩm', href: '/tai-che' },
    { id: 've-chung-toi', label: 'Về chúng tôi', href: '/ve-chung-toi' }
  ]);

  searchTerm = signal<string>('');
  cartCount = signal<number>(3);
  userCoins = signal<number>(0);
  notifications = signal<NotificationItem[]>([]);
  unreadNotificationCount = signal<number>(0);
  hasNotification = signal<boolean>(false);
  isMenuOpen = signal<boolean>(false);
  isUserDropdownOpen = signal<boolean>(false);
  isNotificationDropdownOpen = signal<boolean>(false);
  currentUser = signal<User | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser.set(this.authService.currentUser);
    this.authService.currentUser$.subscribe(user => {
      this.currentUser.set(user);
      if (user?.userID) {
        this.loadUserProfile(user.userID);
        this.loadNotifications();
      } else {
        this.userCoins.set(0);
        this.notifications.set([]);
        this.unreadNotificationCount.set(0);
        this.hasNotification.set(false);
      }
    });
    this.cartService.cartCount$.subscribe({
      next: (count) => this.cartCount.set(count)
    });
  }

  loadUserProfile(userID: string): void {
    this.http.get<User>(`http://localhost:3000/users/${encodeURIComponent(userID)}`).subscribe({
      next: (user) => {
        if (user && user.greenCoins !== undefined) {
          this.userCoins.set(user.greenCoins);
        }
      },
      error: () => {}
    });
  }

  loadNotifications(): void {
    const userID = this.currentUser()?.userID;
    if (!userID) {
      this.notifications.set([]);
      return;
    }
    this.http.get<NotificationItem[]>('http://localhost:3000/notifications').subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.notifications.set(data);
          const unread = data.filter(n => !n.isRead).length;
          this.unreadNotificationCount.set(unread);
          this.hasNotification.set(unread > 0);
        }
      },
      error: () => {}
    });
  }

  toggleMenu(): void {
    this.isMenuOpen.update(v => !v);
  }

  toggleNotificationDropdown(): void {
    if (!this.currentUser()) return;
    this.isNotificationDropdownOpen.update(v => !v);
    if (this.isNotificationDropdownOpen()) {
      this.isUserDropdownOpen.set(false);
      this.loadNotifications();
    }
  }

  closeNotificationDropdown(): void {
    this.isNotificationDropdownOpen.set(false);
  }

  toggleUserDropdown(): void {
    this.isUserDropdownOpen.update(v => !v);
    if (this.isUserDropdownOpen()) {
      this.isNotificationDropdownOpen.set(false);
    }
  }

  closeUserDropdown(): void {
    this.isUserDropdownOpen.set(false);
  }

  isAdmin(): boolean {
    return this.authService.hasRole('ADMIN');
  }

  openNotificationsFromDropdown(): void {
    if (!this.currentUser()) return;
    this.isUserDropdownOpen.set(false);
    this.isNotificationDropdownOpen.set(true);
    this.loadNotifications();
  }

  onNotificationClick(item: NotificationItem): void {
    if (!item.isRead && item.notificationID) {
      item.isRead = true;
      this.http.put(
        `http://localhost:3000/notifications/${item.notificationID}/read`,
        {}
      ).subscribe({
        next: () => {
          const unread = this.notifications().filter(n => !n.isRead).length;
          this.unreadNotificationCount.set(unread);
          this.hasNotification.set(unread > 0);
        }
      });
    }

    this.closeNotificationDropdown();

    if (item.targetID && item.targetID.startsWith('OD')) {
      this.router.navigate(['/don-hang-da-dat']);
    } else if (item.targetID && item.targetID.startsWith('RP') && item.type === 'repair_admin') {
      this.router.navigate(['/admin'], {
        queryParams: { repairOrderID: item.targetID }
      });
    } else if (item.targetID && item.targetID.startsWith('RP')) {
      this.router.navigate(['/sua-chua'], {
        queryParams: { repairOrderID: item.targetID }
      });
    } else if (item.targetID && item.targetID.startsWith('RS')) {
      this.router.navigate(['/san-pham', item.targetID]);
    }
  }

  markAllAsRead(): void {
    const userID = this.currentUser()?.userID;
    if (!userID) return;

    this.http.put('http://localhost:3000/notifications/read-all', {}).subscribe({
      next: () => {
        const updated = this.notifications().map(n => ({ ...n, isRead: true }));
        this.notifications.set(updated);
        this.unreadNotificationCount.set(0);
        this.hasNotification.set(false);
      }
    });
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'order':
        return 'bi-box-seam';
      case 'seller':
        return 'bi-shop';
      case 'repair':
        return 'bi-tools';
      case 'repair_admin':
        return 'bi-person-workspace';
      case 'recycle':
        return 'bi-recycle';
      case 'green_coin':
        return 'bi-coin';
      default:
        return 'bi-bell';
    }
  }

  getNotificationBadgeClass(type: string): string {
    switch (type) {
      case 'order':
        return 'bg-emerald-100 text-emerald-700';
      case 'seller':
        return 'bg-indigo-100 text-indigo-700';
      case 'repair':
        return 'bg-blue-100 text-blue-700';
      case 'repair_admin':
        return 'bg-emerald-100 text-emerald-700';
      case 'recycle':
        return 'bg-teal-100 text-teal-700';
      case 'green_coin':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  onSearchInput(val: string): void {
    this.searchTerm.set(val);
  }

  onSearch(): void {
    const kw = this.searchTerm();
    this.productService.setSearchKeyword(kw);
    if (this.router.url !== '/mua-hang') {
      this.router.navigate(['/mua-hang']);
    }
  }

  logout(): void {
    this.authService.logout();
    this.isUserDropdownOpen.set(false);
    this.router.navigate(['/login']);
  }
}
