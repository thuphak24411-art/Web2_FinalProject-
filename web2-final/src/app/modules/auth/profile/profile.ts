import { ChangeDetectorRef, Component, OnDestroy, OnInit,  ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
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
  uploadingAvatar = false;
  avatarPreview: string | null = null;
  // Trình chỉnh sửa ảnh đại diện
  @ViewChild('cropCanvas')
  cropCanvas?: ElementRef<HTMLCanvasElement>;

  cropDialogOpen = false;
  cropZoom = 100;
  cropX = 50;
  cropY = 50;

  private selectedAvatarImage: HTMLImageElement | null = null;
  message = '';
  errorMessage = '';
  private userSubscription?: Subscription;

  constructor(private authService: AuthService, private router: Router, private cdr: ChangeDetectorRef) {
    this.user = authService.currentUser;
  }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.user = user;
      this.avatarPreview = null;
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
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) return;

    this.message = '';
    this.errorMessage = '';

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage = 'Ảnh đại diện không được vượt quá 2 MB.';
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      this.errorMessage = 'Không thể đọc ảnh đã chọn.';
      this.cdr.markForCheck();
    };

    reader.onload = () => {
      if (typeof reader.result !== 'string') return;

      const image = new Image();

      image.onload = () => {
        this.selectedAvatarImage = image;
        this.cropZoom = 100;
        this.cropX = 50;
        this.cropY = 50;
        this.cropDialogOpen = true;

        // Tạo canvas sau khi modal được hiển thị
        this.cdr.detectChanges();
        this.renderCropPreview();
      };

      image.onerror = () => {
        this.errorMessage = 'Ảnh không hợp lệ hoặc không thể đọc.';
        this.cdr.markForCheck();
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  }

  // Vẽ ảnh đã crop lên canvas xem trước
  renderCropPreview(): void {
    const image = this.selectedAvatarImage;
    const canvas = this.cropCanvas?.nativeElement;

    if (!image || !canvas) return;

    this.drawCroppedImage(canvas, 280);
  }

  // Xử lý crop ảnh theo tỷ lệ vuông
  private drawCroppedImage(
    canvas: HTMLCanvasElement,
    outputSize: number
  ): void {
    const image = this.selectedAvatarImage;

    if (!image) return;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = outputSize;
    canvas.height = outputSize;

    const scale = Math.max(
      outputSize / image.naturalWidth,
      outputSize / image.naturalHeight
    ) * (this.cropZoom / 100);

    const sourceWidth = outputSize / scale;
    const sourceHeight = outputSize / scale;

    const maxX = Math.max(0, image.naturalWidth - sourceWidth);
    const maxY = Math.max(0, image.naturalHeight - sourceHeight);

    const sourceX = maxX * this.cropX / 100;
    const sourceY = maxY * this.cropY / 100;

    ctx.clearRect(0, 0, outputSize, outputSize);

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputSize,
      outputSize
    );
  }

  // Khi thay đổi thanh điều chỉnh
  onCropChange(): void {
    this.renderCropPreview();
  }

  // Khôi phục vị trí ban đầu
  resetCrop(): void {
    this.cropZoom = 100;
    this.cropX = 50;
    this.cropY = 50;

    this.renderCropPreview();
  }

  // Đóng trình chỉnh sửa
  closeCropEditor(): void {
    if (this.uploadingAvatar) return;

    this.cropDialogOpen = false;
    this.selectedAvatarImage = null;
    this.avatarPreview = null;
  }

  // Lưu ảnh đã chỉnh sửa
  saveCroppedAvatar(): void {
    if (this.uploadingAvatar || !this.selectedAvatarImage) {
      return;
    }

    const canvas = document.createElement('canvas');

    this.drawCroppedImage(canvas, 512);

    const croppedImage = canvas.toDataURL('image/jpeg', 0.9);

    this.uploadingAvatar = true;
    this.avatarPreview = croppedImage;
    this.message = '';
    this.errorMessage = '';

    this.authService.updateAvatar(croppedImage).subscribe({
      next: response => {
        this.uploadingAvatar = false;
        this.avatarPreview = null;
        this.user = this.authService.currentUser;

        this.cropDialogOpen = false;
        this.selectedAvatarImage = null;

        this.message = response.message || 'Đã cập nhật ảnh đại diện.';

        this.cdr.markForCheck();
      },
      error: error => {
        this.uploadingAvatar = false;
        this.avatarPreview = null;

        this.errorMessage =
          error.error?.message || 'Không thể lưu ảnh đại diện.';

        this.cdr.markForCheck();
      }
    });
  }

  logout(): void {
    if (!window.confirm('Bạn có chắc muốn đăng xuất khỏi tài khoản không?')) {
      return;
    }
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  save(): void {
    if (this.saving) return;

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
        ? {
            businessName: this.businessName,
            shopName: this.shopName
          }
        : {})
    })
    .pipe(
      finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe({
      next: response => {
        this.user = this.authService.currentUser;
        this.message = response.message || 'Cập nhật hồ sơ thành công!';
        this.cdr.markForCheck();
      },
      error: error => {
        console.error('Lỗi cập nhật hồ sơ:', error);
        this.errorMessage =
          error.error?.message || 'Không thể cập nhật hồ sơ.';
        this.cdr.markForCheck();
      }
    });
  }
}
