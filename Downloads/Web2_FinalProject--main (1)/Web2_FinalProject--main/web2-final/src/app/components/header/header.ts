import { Component, OnInit, OnDestroy, HostListener, signal } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ProductService } from '../../modules/marketplace/services/product';
import { CartService } from '../../modules/order/services/cart';
import { NotificationItem } from '../../classes/notification';
import { AuthService } from '../../services/auth.service';
import { User } from '../../classes/user';
import type { NavItem } from '../../classes/admin';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  // Điều hướng chính
  navItems = signal<NavItem[]>([
    { id: 'mua-hang', label: 'Sản phẩm', href: '/mua-hang' },
    { id: 'sua-chua', label: 'Sửa chữa', href: '/sua-chua' },
    { id: 'moi-truong', label: 'Môi trường', href: '/moi-truong' }
  ]);

  // Trạng thái giao diện và dữ liệu Header
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

  private readonly notificationRefresh = new Subscription();
  private notificationLoading = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService
  ) {}

  // Khởi tạo dữ liệu
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
    // Cập nhật badge thông báo định kỳ, không cần mở chuông.
    this.notificationRefresh.add(interval(45000).subscribe(() => {
      const userID = this.currentUser()?.userID;
      if (userID) {
        this.loadUserProfile(userID);
        this.loadNotifications();
      }
    }));
    this.cartService.cartCount$.subscribe({
      next: (count) => this.cartCount.set(count)
    });
  }

  ngOnDestroy(): void {
    this.notificationRefresh.unsubscribe();
  }

  // Hồ sơ và thông báo
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
    if (this.notificationLoading) return;
    this.notificationLoading = true;
    const requestedUserID = userID;
    this.http.get<NotificationItem[]>('http://localhost:3000/notifications').subscribe({
      next: (data) => {
        this.notificationLoading = false;
        if (this.currentUser()?.userID !== requestedUserID) return;
        if (Array.isArray(data)) {
          this.notifications.set(data);
          const unread = data.filter(n => !n.isRead).length;
          this.unreadNotificationCount.set(unread);
          this.hasNotification.set(unread > 0);
        }
      },
      error: () => { this.notificationLoading = false; }
    });
  }

  // Điều khiển menu và dropdown
  toggleMenu(): void {
    this.isMenuOpen.update(v => !v);
  }
  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  toggleNotificationDropdown(): void {
    if (!this.currentUser()) return;
    this.isNotificationDropdownOpen.update(v => !v);
    if (this.isNotificationDropdownOpen()) {
      this.isUserDropdownOpen.set(false);
      this.loadNotifications();
      const userID = this.currentUser()?.userID;
      if (userID) this.loadUserProfile(userID);
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


  // Xử lý thông báo
  onNotificationClick(item: NotificationItem): void {
    if (!item.isRead && item.notificationID) {
      this.http.put(
        `http://localhost:3000/notifications/${encodeURIComponent(item.notificationID)}/read`,
        {}
      ).subscribe({
        next: () => {
          this.notifications.update(items => items.map(n =>
            n.notificationID === item.notificationID ? { ...n, isRead: true } : n
          ));
          const unread = this.notifications().filter(n => !n.isRead).length;
          this.unreadNotificationCount.set(unread);
          this.hasNotification.set(unread > 0);
        },
        error: (error) => console.error('Không thể đánh dấu đã đọc:', error)
      });
    }

    this.closeNotificationDropdown();

    if (item.targetID && item.targetID.startsWith('OD')) {
      // Truyền mã đơn hàng để trang đích có thể chọn đúng đơn.
      this.router.navigate(['/don-hang-da-dat'], {
        queryParams: { orderID: item.targetID }
      });
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

  // Tìm kiếm và tài khoản
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

  closeIconDropdowns(): void {
    this.isNotificationDropdownOpen.set(false);
    this.isUserDropdownOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;

    // Giữ dropdown khi bấm nút kích hoạt hoặc thao tác trong chính dropdown.
    // Bấm vào bất kỳ vùng nào khác (kể cả khoảng trống Header) sẽ đóng.
    if (!target.closest('[data-header-popup]')) {
      this.closeIconDropdowns();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeIconDropdowns();
  }

  isIconRouteActive(path: string): boolean {
    return this.router.url.split('?')[0].split('#')[0] === path;
  }
  getRoleLabel(role?: string): string {
    switch (role) {
      case 'ADMIN':
        return 'Quản trị viên';
      case 'CUSTOMER':
        return 'Khách hàng';
      case 'SELLER':
        return 'Người bán';
      case 'TECHNICIAN':
        return 'Kỹ thuật viên';
      default:
        return 'Chưa xác định';
    }
  }
}
