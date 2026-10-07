import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ProductService } from '../../modules/marketplace/services/product';
import { CartService } from '../../modules/order/services/cart';
import { NotificationItem } from '../../classes/notification';

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
    { id: 'tai-che', label: 'Tái chế', href: '/tai-che' },
    { id: 've-chung-toi', label: 'Về chúng tôi', href: '/ve-chung-toi' }
  ]);

  searchTerm = signal<string>('');
  cartCount = signal<number>(3);
  userCoins = signal<number>(3420);
  notifications = signal<NotificationItem[]>([]);
  unreadNotificationCount = signal<number>(0);
  hasNotification = signal<boolean>(false);
  isMenuOpen = signal<boolean>(false);
  isUserDropdownOpen = signal<boolean>(false);
  isNotificationDropdownOpen = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.loadNavData();
    this.loadUserProfile();
    this.loadNotifications();
    this.cartService.cartCount$.subscribe({
      next: (count) => this.cartCount.set(count)
    });
  }

  loadUserProfile(): void {
    this.http.get<any>('http://localhost:3000/users/CM000001').subscribe({
      next: (user) => {
        if (user && user.greenCoins !== undefined) {
          this.userCoins.set(user.greenCoins);
        }
      },
      error: () => {}
    });
  }

  loadNotifications(): void {
    this.http.get<NotificationItem[]>('http://localhost:3000/notifications?userId=CM000001').subscribe({
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

  loadNavData(): void {
    this.http.get<any>('nav.json').subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : (data.mainNav || []);
        if (items && items.length > 0) {
          const filtered = items.filter((item: any) => 
            item.id !== 'mua-hang' && item.href !== '/mua-hang' && 
            item.id !== 'green-coin' && item.href !== '/green-coin'
          );
          this.navItems.set(filtered);
        }
      },
      error: () => {}
    });
  }

  toggleMenu(): void {
    this.isMenuOpen.update(v => !v);
  }

  toggleNotificationDropdown(): void {
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

  openNotificationsFromDropdown(): void {
    this.isUserDropdownOpen.set(false);
    this.isNotificationDropdownOpen.set(true);
    this.loadNotifications();
  }

  onNotificationClick(item: NotificationItem): void {
    if (!item.isRead && item.notificationID) {
      item.isRead = true;
      this.http.put(`http://localhost:3000/notifications/${item.notificationID}/read`, {}).subscribe({
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
    }
  }

  markAllAsRead(): void {
    this.http.put('http://localhost:3000/notifications/read-all', { userId: 'CM000001' }).subscribe({
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
}
