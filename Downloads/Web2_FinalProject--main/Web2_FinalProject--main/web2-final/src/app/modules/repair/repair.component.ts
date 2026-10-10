import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast';
import { AiAssessment, AiRecommendation, DeviceAssessment, PriceEstimate, RepairOption, RepairRequest, RepairService, ResellListingInput } from './repair.service';
import { ProductService } from '../marketplace/services/product';

interface DevicePhoto {
  area: string;
  name: string;
  type: string;
  size: number;
  preview: string;
}

interface StoredPhotoSet {
  repairOrderID: string;
  savedAt: string;
  photos: DevicePhoto[];
}

interface AssessmentResult {
  request: RepairRequest;
  assessment: DeviceAssessment;
}

interface ConfirmationDialog {
  title: string;
  message: string;
  confirmLabel: string;
  icon: string;
  action: () => void;
}

@Component({
  selector: 'app-repair',
  standalone: false,
  templateUrl: './repair.component.html',
  styleUrl: './repair.component.css'
})
export class RepairComponent implements OnInit, OnDestroy {
  readonly steps = [
    { title: 'Thông tin thiết bị', icon: 'bi-phone' },
    { title: 'Ngoại quan', icon: 'bi-eye' },
    { title: 'Chức năng', icon: 'bi-gear' },
    { title: 'Pin & lịch sử', icon: 'bi-battery-half' },
    { title: 'Hình ảnh & xác nhận', icon: 'bi-images' }
  ];

  readonly deviceTypes = ['Điện thoại', 'Laptop', 'Máy tính bảng', 'Thiết bị khác'];
  readonly brands = ['Apple', 'Samsung', 'Dell', 'HP', 'Lenovo', 'Asus', 'Oppo', 'Xiaomi', 'Khác'];
  readonly usagePeriods = ['Dưới 6 tháng', '6–12 tháng', '1–2 năm', '2–4 năm', 'Trên 4 năm'];
  readonly issueOptions = [
    'Chạy chậm', 'Tự tắt nguồn', 'Không nhận sạc', 'Lỗi màn hình',
    'Lỗi âm thanh', 'Lỗi kết nối', 'Lỗi khác', 'Không có lỗi'
  ];
  readonly replacedPartOptions = ['Pin', 'Màn hình', 'Bàn phím', 'Ổ lưu trữ', 'Linh kiện khác'];
  readonly photoAreas = ['Mặt trước', 'Mặt sau', 'Các cạnh', 'Vị trí hư hỏng'];
  readonly maxFileSize = 5 * 1024 * 1024;
  readonly acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

  form: FormGroup;
  currentStep = 0;
  photos: DevicePhoto[] = [];
  photoArea = 'Mặt trước';
  editingPhotoIndex: number | null = null;
  requests: RepairRequest[] = [];
  selectedHistoryRequest: RepairRequest | null = null;
  selectedHistoryAssessment: AiAssessment | null = null;
  private requestedHistoryOrderID: string | null = null;
  result: AssessmentResult | null = null;
  loading = false;
  loadingList = false;
  errorMessage = '';
  successMessage = '';
  aiMessage = '';
  aiAssessment: AiAssessment | null = null;
  confirmationDialog: ConfirmationDialog | null = null;
  choosingRepairOrderID: string | null = null;
  resellRequest: RepairRequest | null = null;
  resellImages: string[] = [];
  resellListing = {
    title: '',
    cateID: 'c2',
    priceVnd: null as number | null,
    condition: 'Đã qua sử dụng',
    description: '',
    image: ''
  };
  publishingResellListing = false;
  resellListingError = '';
  readonly resellCategories = [
    { id: 'c1', name: 'Máy tính bảng' },
    { id: 'c2', name: 'Điện thoại' },
    { id: 'c3', name: 'Laptop' },
    { id: 'c4', name: 'PC' },
    { id: 'c5', name: 'Loa' },
    { id: 'c6', name: 'Tai nghe' },
    { id: 'c7', name: 'Chuột máy tính' },
    { id: 'c8', name: 'Ổ cứng di động' },
    { id: 'c9', name: 'Thẻ nhớ' },
    { id: 'c10', name: 'USB' },
    { id: 'c11', name: 'Cáp sạc' }
  ];
  readonly resaleConditions = ['Mới 99%', 'Mới 95%', 'Mới 90%', 'Đã qua sử dụng'];
  private aiPollTimeout?: ReturnType<typeof setTimeout>;
  private routeQuerySubscription?: Subscription;
  private aiPollAttempts = 0;
  private readonly maxAiPollAttempts = 120;

  constructor(
    private fb: FormBuilder,
    private repairService: RepairService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService,
    private productService: ProductService,
    private changeDetector: ChangeDetectorRef
  ) {
    this.form = this.createForm();
  }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/sua-chua' } });
      return;
    }

    this.routeQuerySubscription = this.route.queryParamMap.subscribe(params => {
      this.requestedHistoryOrderID = params.get('repairOrderID');
      if (this.requests.length) this.openRequestedHistory();
    });
    const params = this.route.snapshot.queryParamMap;
    this.form.patchValue({
      deviceType: params.get('deviceType') || 'Điện thoại',
      model: params.get('deviceName') || '',
      contactPhone: this.authService.currentUser?.phoneNumber || ''
    });
    this.onDeviceTypeChange();
    this.restoreDraftPhotos();
    this.loadRequests();
  }

  ngOnDestroy(): void {
    if (this.aiPollTimeout) clearTimeout(this.aiPollTimeout);
    this.routeQuerySubscription?.unsubscribe();
  }

  get deviceType(): string {
    return this.form.get('deviceType')?.value || 'Điện thoại';
  }

  get selectedIssues(): string[] {
    return this.form.get('issues')?.value || [];
  }

  get isWaterDamaged(): boolean {
    return this.form.get('waterDamage')?.value === 'Có';
  }

  get needsTechnicalInspection(): boolean {
    return this.form.get('batteryCondition')?.value === 'Pin phồng hoặc hư hỏng' || this.isWaterDamaged;
  }

  get isRepairHistoryKnown(): boolean {
    return this.form.get('repairHistory')?.value === 'Đã sửa chữa';
  }

  get showResult(): boolean {
    return this.result !== null;
  }

  hasAiAssessment(request: RepairRequest): boolean {
    return !!request.aiAssessmentHistory?.length;
  }

  isAiAssessmentPending(request: RepairRequest): boolean {
    return request.aiAssessmentStatus?.startsWith('Đang') || false;
  }

  chooseRepairOption(request: RepairRequest, option: RepairOption): void {
    if (!request.repairOrderID || this.choosingRepairOrderID || request.userChoice) return;
    if (option === 'resell') {
      this.openResellListing(request);
      return;
    }
    this.choosingRepairOrderID = request.repairOrderID;
    this.repairService.chooseRepairOption(request.repairOrderID, option).subscribe({
      next: response => {
        request.userChoice = response.userChoice;
        request.status = response.status;
        this.choosingRepairOrderID = null;
        this.toastService.showToast(response.message, 'success', 'Đã lưu lựa chọn');
        this.changeDetector.markForCheck();
      },
      error: error => {
        this.choosingRepairOrderID = null;
        const message = error.error?.message || 'Không thể lưu phương án đã chọn.';
        this.toastService.showToast(message, 'error', 'Lỗi lựa chọn');
        this.changeDetector.markForCheck();
      }
    });
  }

  openResellListing(request: RepairRequest): void {
    const assessment = request.assessment;
    const specialistPrice = request.specialistAssessment?.estimatedPrices.resell.amountVnd;
    const aiPrice = request.aiAssessmentHistory?.[0]?.estimatedPrices?.resell?.amountVnd;
    const condition = assessment?.appearance?.overall;
    const deviceDetails = [
      `Thương hiệu: ${assessment?.brand || 'Chưa cung cấp'}`,
      `Model: ${request.deviceName}`,
      assessment?.usagePeriod ? `Thời gian sử dụng: ${assessment.usagePeriod}` : '',
      assessment?.appearance?.overall ? `Ngoại quan: ${assessment.appearance.overall}` : '',
      assessment?.appearance?.screen ? `Màn hình: ${assessment.appearance.screen}` : '',
      assessment?.appearance?.casing ? `Vỏ thiết bị: ${assessment.appearance.casing}` : '',
      assessment?.appearance?.waterDamage ? `Dấu hiệu vào nước: ${assessment.appearance.waterDamage}` : '',
      assessment?.appearance?.damageDescription,
      assessment?.functionality?.startup ? `Khởi động: ${assessment.functionality.startup}` : '',
      assessment?.functionality?.mainFunction ? `Chức năng chính: ${assessment.functionality.mainFunction}` : '',
      assessment?.functionality?.ports ? `Cổng kết nối: ${assessment.functionality.ports}` : '',
      assessment?.functionality?.deviceChecks
        ? `Kiểm tra chức năng: ${Object.entries(assessment.functionality.deviceChecks).map(([name, value]) => `${name}: ${value}`).join('; ')}`
        : '',
      assessment?.functionality?.issues?.length
        ? `Lỗi ghi nhận: ${assessment.functionality.issues.join(', ')}`
        : '',
      assessment?.functionality?.otherIssue,
      assessment?.battery?.condition ? `Tình trạng pin: ${assessment.battery.condition}` : '',
      assessment?.battery?.maximumCapacity !== undefined
        ? `Dung lượng pin tối đa: ${assessment.battery.maximumCapacity}%`
        : '',
      assessment?.battery?.repairHistory ? `Lịch sử sửa chữa: ${assessment.battery.repairHistory}` : '',
      assessment?.battery?.replacedParts?.length
        ? `Linh kiện đã thay: ${assessment.battery.replacedParts.join(', ')}`
        : '',
      assessment?.battery?.repairDescription,
      request.issueDescription,
      assessment?.additionalDescription,
      request.specialistAssessment?.recommendations.resell
        ? `Nhận xét chuyên gia về bán lại: ${request.specialistAssessment.recommendations.resell}`
        : ''
    ].filter(Boolean).join('\n');
    this.resellRequest = request;
    this.resellImages = assessment?.images?.map(image => image.preview).filter(Boolean) || [];
    this.resellListing = {
      title: [assessment?.brand, request.deviceName].filter(Boolean).join(' '),
      cateID: this.categoryForDevice(request.deviceType),
      priceVnd: specialistPrice ?? aiPrice ?? request.userEstimatedPriceVnd ?? null,
      condition: condition === 'Như mới' ? 'Mới 95%' : condition === 'Tốt' ? 'Mới 90%' : 'Đã qua sử dụng',
      description: deviceDetails.slice(0, 3000),
      image: assessment?.images?.[0]?.preview || ''
    };
    this.resellListingError = '';
  }

  closeResellListing(): void {
    if (this.publishingResellListing) return;
    this.resellRequest = null;
    this.resellImages = [];
    this.resellListingError = '';
  }

  requestResellConfirmation(): void {
    const request = this.resellRequest;
    const title = this.resellListing.title.trim();
    const priceVnd = Number(this.resellListing.priceVnd);
    if (!request?.repairOrderID || this.publishingResellListing) return;
    if (title.length < 3 || title.length > 120 || !Number.isFinite(priceVnd) || priceVnd <= 0) {
      this.resellListingError = 'Vui lòng kiểm tra tên sản phẩm và nhập giá bán hợp lệ.';
      return;
    }
    this.openConfirmation({
      title: 'Xác nhận đăng bán sản phẩm?',
      message: `Thiết bị "${title}" sẽ được đăng công khai trên marketplace với giá ${priceVnd.toLocaleString('vi-VN')} VNĐ. Bạn xác nhận muốn đăng bán?`,
      confirmLabel: 'Xác nhận đăng bán',
      icon: 'bi-shop',
      action: () => this.publishResellListing(request)
    });
  }

  private publishResellListing(request: RepairRequest): void {
    if (!request.repairOrderID || this.publishingResellListing) return;
    const listing: ResellListingInput = {
      ...this.resellListing,
      title: this.resellListing.title.trim(),
      description: this.resellListing.description.trim(),
      priceVnd: Number(this.resellListing.priceVnd)
    };
    this.publishingResellListing = true;
    this.resellListingError = '';
    this.repairService.createResellListing(request.repairOrderID, listing).subscribe({
      next: response => {
        request.userChoice = response.userChoice;
        request.status = response.status;
        request.saleListingID = response.productID;
        this.productService.clearProductsCache();
        this.publishingResellListing = false;
        this.resellRequest = null;
        this.resellImages = [];
        this.toastService.showToast(response.message, 'success', 'Đã đăng bán');
        this.changeDetector.markForCheck();
        this.router.navigate(['/mua-hang']);
      },
      error: error => {
        this.publishingResellListing = false;
        this.resellListingError = error.error?.message || 'Không thể đăng sản phẩm lên marketplace.';
        this.changeDetector.markForCheck();
      }
    });
  }

  private categoryForDevice(deviceType: string): string {
    if (deviceType.includes('Máy tính bảng')) return 'c1';
    if (deviceType.includes('Laptop')) return 'c3';
    if (deviceType.includes('Thiết bị khác')) return 'c4';
    return 'c2';
  }

  choiceLabel(option: string): string {
    if (option === 'repair') return 'Sửa chữa';
    if (option === 'resell') return 'Đã đăng bán';
    return 'Phương án cũ không còn hỗ trợ';
  }

  statusClass(status: string | undefined): string {
    switch (status) {
      case 'Đang bán':
        return 'status-for-sale';
      case 'Đã chọn bán lại':
        return 'status-for-sale';
      case 'Chờ admin cập nhật trạng thái':
        return 'status-waiting-user';
      case 'Chờ chuyên gia đánh giá':
        return 'status-waiting-expert';
      case 'Chờ lựa chọn của người dùng':
        return 'status-waiting-user';
      case 'Đã chọn phương án':
        return 'status-option-selected';
      case 'Đang sửa chữa':
        return 'status-in-progress';
      case 'Đã sửa chữa':
        return 'status-complete';
      default:
        return 'status-not-started';
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      deviceType: ['Điện thoại', Validators.required],
      brand: ['', Validators.required],
      model: ['', [Validators.required, Validators.maxLength(120)]],
      usagePeriod: ['', Validators.required],
      overall: ['', Validators.required],
      screen: ['', Validators.required],
      casing: ['', Validators.required],
      waterDamage: ['', Validators.required],
      damageDescription: [''],
      startup: ['', Validators.required],
      mainFunction: ['', Validators.required],
      ports: ['', Validators.required],
      deviceChecks: this.fb.group({}),
      issues: [[] as string[]],
      otherIssue: [''],
      batteryCondition: ['', Validators.required],
      batteryCapacity: ['', [Validators.min(0), Validators.max(100), Validators.pattern(/^\d+$/)]],
      repairHistory: ['', Validators.required],
      replacedParts: [[] as string[]],
      repairDescription: [''],
      additionalDescription: [''],
      confirmation: [false, Validators.requiredTrue],
      contactPhone: [''],
      userEstimatedPriceVnd: ['', [Validators.min(0), Validators.max(1000000000), Validators.pattern(/^\d+$/)]]
    });
  }

  onDeviceTypeChange(): void {
    const deviceChecks = this.fb.group({});
    this.getDeviceCheckNames().forEach(name => deviceChecks.addControl(name, new FormControl('', Validators.required)));
    this.form.setControl('deviceChecks', deviceChecks);
  }

  getDeviceCheckNames(): string[] {
    switch (this.deviceType) {
      case 'Điện thoại': return ['Cảm ứng', 'Camera', 'Loa', 'Micro', 'Wi-Fi/Bluetooth', 'Vân tay/Face ID'];
      case 'Laptop': return ['Bàn phím', 'Touchpad', 'Bản lề', 'Kết nối', 'Ổ lưu trữ'];
      case 'Máy tính bảng': return ['Cảm ứng', 'Màn hình', 'Camera', 'Pin', 'Kết nối'];
      default: return ['Chức năng chính', 'Kết nối'];
    }
  }

  getDeviceCheckOptions(name: string): string[] {
    if (name === 'Pin') return ['Bình thường', 'Hao pin nhanh', 'Chưa kiểm tra'];
    return ['Bình thường', 'Có lỗi', 'Chưa kiểm tra'];
  }

  toggleIssue(issue: string): void {
    const issues = [...this.selectedIssues];
    if (issue === 'Không có lỗi') {
      this.form.patchValue({ issues: issues.includes(issue) ? [] : [issue], otherIssue: '' });
      return;
    }
    const next = issues.filter(item => item !== 'Không có lỗi');
    const index = next.indexOf(issue);
    index >= 0 ? next.splice(index, 1) : next.push(issue);
    this.form.patchValue({ issues: next });
    if (!next.includes('Lỗi khác')) this.form.patchValue({ otherIssue: '' });
  }

  toggleReplacedPart(part: string): void {
    const parts: string[] = [...(this.form.get('replacedParts')?.value || [])];
    const index = parts.indexOf(part);
    index >= 0 ? parts.splice(index, 1) : parts.push(part);
    this.form.patchValue({ replacedParts: parts });
  }

  nextStep(): void {
    this.errorMessage = '';
    if (!this.validateStep(this.currentStep)) return;
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.errorMessage = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToStep(index: number): void {
    if (index < this.currentStep) {
      this.currentStep = index;
      this.errorMessage = '';
    }
  }

  private validateStep(step: number): boolean {
    const fields: Record<number, string[]> = {
      0: ['deviceType', 'brand', 'model', 'usagePeriod'],
      1: ['overall', 'screen', 'casing', 'waterDamage'],
      2: ['startup', 'mainFunction', 'ports'],
      3: ['batteryCondition', 'repairHistory'],
      4: ['confirmation']
    };
    if (step === 4 && !this.form.get('confirmation')?.value) {
      this.errorMessage = 'Bạn cần xác nhận thông tin trước khi gửi.';
      return false;
    }
    const controls = fields[step].map(field => this.form.get(field)).filter(Boolean);
    controls.forEach(control => control?.markAsTouched());
    if (controls.some(control => control?.invalid)) {
      this.errorMessage = 'Vui lòng hoàn thành các trường bắt buộc ở bước này.';
      return false;
    }
    if (step === 2 && this.form.get('deviceChecks')?.invalid) {
      this.form.get('deviceChecks')?.markAllAsTouched();
      this.errorMessage = 'Vui lòng chọn tình trạng cho các chức năng theo loại thiết bị.';
      return false;
    }
    if (step === 2 && this.form.get('issues')?.value.includes('Lỗi khác') && !this.form.get('otherIssue')?.value.trim()) {
      this.form.get('otherIssue')?.markAsTouched();
      this.errorMessage = 'Vui lòng mô tả lỗi khác.';
      return false;
    }
    if (step === 3 && this.form.get('batteryCapacity')?.invalid) {
      this.form.get('batteryCapacity')?.markAsTouched();
      this.errorMessage = 'Dung lượng pin phải là số nguyên từ 0 đến 100%.';
      return false;
    }
    return true;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.editingPhotoIndex = null;
      return;
    }
    this.errorMessage = '';
    if (!this.acceptedImageTypes.includes(file.type)) {
      this.errorMessage = 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.';
      input.value = '';
      return;
    }
    if (file.size > this.maxFileSize) {
      this.errorMessage = 'Mỗi ảnh không được vượt quá 5MB.';
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const source = new Image();
      source.onload = () => {
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(source.width * scale));
        canvas.height = Math.max(1, Math.round(source.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          this.errorMessage = 'Không thể xử lý ảnh này. Vui lòng chọn ảnh khác.';
          input.value = '';
          this.editingPhotoIndex = null;
          this.changeDetector.markForCheck();
          return;
        }
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        const photo: DevicePhoto = {
          area: this.photoArea,
          name: file.name,
          type: file.type,
          size: file.size,
          preview: canvas.toDataURL('image/jpeg', 0.78)
        };
        if (this.editingPhotoIndex === null && this.photos.length >= 8) {
          this.errorMessage = 'Bạn có thể tải tối đa 8 ảnh.';
        } else if (this.editingPhotoIndex === null) {
          this.photos = [...this.photos, photo];
        } else {
          this.photos = this.photos.map((item, index) => index === this.editingPhotoIndex ? photo : item);
          this.editingPhotoIndex = null;
        }
        this.persistDraftPhotos();
        input.value = '';
        this.changeDetector.markForCheck();
      };
      source.onerror = () => {
        this.errorMessage = 'Không thể đọc ảnh này. Vui lòng chọn tệp ảnh hợp lệ.';
        input.value = '';
        this.editingPhotoIndex = null;
        this.changeDetector.markForCheck();
      };
      source.src = String(reader.result);
    };
    reader.onerror = () => {
      this.errorMessage = 'Không thể tải ảnh. Vui lòng thử lại.';
      input.value = '';
      this.editingPhotoIndex = null;
      this.changeDetector.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  replacePhoto(index: number): void {
    this.editingPhotoIndex = index;
    this.openFilePicker();
  }

  removePhoto(index: number): void {
    this.openConfirmation({
      title: 'Xóa ảnh thiết bị?',
      message: 'Ảnh này sẽ bị xóa khỏi yêu cầu hiện tại.',
      confirmLabel: 'Xóa ảnh',
      icon: 'bi-image',
      action: () => {
        this.photos = this.photos.filter((_, photoIndex) => photoIndex !== index);
        if (this.editingPhotoIndex === index) this.editingPhotoIndex = null;
        this.persistDraftPhotos();
      }
    });
  }

  openFilePicker(): void {
    const input = document.getElementById('device-photo-input') as HTMLInputElement | null;
    if (input) {
      input.value = '';
      input.click();
    }
  }

  submit(): void {
    this.errorMessage = '';
    if (this.loading || this.showResult || !this.validateStep(4)) return;
    const assessment = this.buildAssessment();
    const assessmentForApi = assessment;
    const imagePayloadSize = new Blob(
      assessmentForApi.images.map(photo => photo.preview)
    ).size;
    if (imagePayloadSize > 12 * 1024 * 1024) {
      this.loading = false;
      this.errorMessage = 'Tổng dung lượng ảnh quá lớn. Vui lòng xóa bớt ảnh hoặc chọn ảnh nhỏ hơn.';
      return;
    }
    const request: RepairRequest = {
      productID: this.route.snapshot.queryParamMap.get('productID') || undefined,
      deviceName: String(this.form.get('model')?.value).trim(),
      deviceType: this.deviceType,
      issueDescription: this.buildIssueDescription(assessment),
      contactPhone: String(this.form.get('contactPhone')?.value || '').trim(),
      userEstimatedPriceVnd: this.form.get('userEstimatedPriceVnd')?.value === ''
        ? null
        : Number(this.form.get('userEstimatedPriceVnd')?.value),
      assessment: assessmentForApi
    };
    this.openConfirmation({
      title: 'Gửi yêu cầu sửa chữa?',
      message: 'Thông tin và ảnh sẽ được lưu để kỹ thuật viên theo dõi. Gemini sẽ phân tích tình trạng và định giá theo hai hướng: sửa chữa và bán lại.',
      confirmLabel: 'Gửi yêu cầu',
      icon: 'bi-send-check',
      action: () => this.createRepairRequest(request, assessment)
    });
  }

  private createRepairRequest(request: RepairRequest, assessment: DeviceAssessment): void {
    if (this.loading || this.showResult) return;
    this.loading = true;
    this.changeDetector.markForCheck();
    this.repairService.createRequest(request).subscribe({
      next: response => {
        this.loading = false;
        this.successMessage = '';
        const savedRequest = response.repairOrder || request;
        this.result = { request: savedRequest, assessment };
        this.requests = [savedRequest, ...this.requests];
        this.clearDraftPhotos();
        this.photos = [];
        this.editingPhotoIndex = null;
        this.currentStep = 0;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.aiAssessment = null;
        this.toastService.showToast(
          `Yêu cầu ${savedRequest.repairOrderID || ''} đã được lưu. Gemini đang phân tích nền; kết quả dự kiến trong khoảng 30 phút (có thể sớm hơn) sẽ xuất hiện tại lịch sử sửa chữa và Thông báo.`,
          'success',
          'Đã gửi yêu cầu sửa chữa',
          8000
        );
        this.changeDetector.markForCheck();
        this.startAiPolling(savedRequest.repairOrderID);
      },
      error: error => {
        this.loading = false;
        this.errorMessage = error.error?.message || 'Không thể lưu yêu cầu đánh giá. Vui lòng thử lại.';
        this.changeDetector.markForCheck();
        this.toastService.showToast(this.errorMessage, 'error', 'Không gửi được yêu cầu');
      }
    });
  }

  resetForm(): void {
    this.openConfirmation({
      title: 'Bắt đầu yêu cầu mới?',
      message: 'Thông tin và ảnh chưa gửi trong biểu mẫu hiện tại sẽ được xóa.',
      confirmLabel: 'Xóa và tạo mới',
      icon: 'bi-arrow-counterclockwise',
      action: () => this.clearFormState()
    });
  }

  private clearFormState(): void {
    this.form.reset({
      deviceType: 'Điện thoại',
      contactPhone: this.authService.currentUser?.phoneNumber || '',
      issues: [],
      replacedParts: [],
      confirmation: false
    });
    this.photos = [];
    this.editingPhotoIndex = null;
    this.aiAssessment = null;
    this.result = null;
    this.currentStep = 0;
    this.successMessage = '';
    this.errorMessage = '';
    this.onDeviceTypeChange();
    this.clearDraftPhotos();
  }

  clearForm(): void {
    this.resetForm();
  }

  private persistDraftPhotos(): void {
    const payload: StoredPhotoSet = {
      repairOrderID: 'draft',
      savedAt: new Date().toISOString(),
      photos: this.photos
    };
    try {
      localStorage.setItem(this.draftPhotoStorageKey, JSON.stringify(payload));
    } catch {
      this.errorMessage = 'Không thể lưu ảnh tạm trên thiết bị. Hãy giảm số lượng hoặc dung lượng ảnh.';
    }
  }

  private get draftPhotoStorageKey(): string {
    const userID = this.authService.currentUser?.userID || 'anonymous';
    return `ecocycle-repair-photos-draft-${userID}`;
  }

  private clearDraftPhotos(): void {
    localStorage.removeItem(this.draftPhotoStorageKey);
    localStorage.removeItem('ecocycle-repair-photos-draft');
  }

  private restoreDraftPhotos(): void {
    try {
      localStorage.removeItem('ecocycle-repair-photos-draft');
      const raw = localStorage.getItem(this.draftPhotoStorageKey);
      if (!raw) return;
      const stored = JSON.parse(raw) as StoredPhotoSet;
      if (Array.isArray(stored.photos)) this.photos = stored.photos;
    } catch {
      this.clearDraftPhotos();
    }
  }

  private openConfirmation(dialog: ConfirmationDialog): void {
    this.confirmationDialog = dialog;
  }

  cancelConfirmation(): void {
    this.confirmationDialog = null;
  }

  confirmAction(): void {
    const action = this.confirmationDialog?.action;
    this.confirmationDialog = null;
    action?.();
  }

  private buildAssessment(): DeviceAssessment {
    const value = this.form.getRawValue();
    return {
      brand: value.brand,
      usagePeriod: value.usagePeriod,
      appearance: {
        overall: value.overall,
        screen: value.screen,
        casing: value.casing,
        waterDamage: value.waterDamage,
        damageDescription: value.damageDescription?.trim() || undefined
      },
      functionality: {
        startup: value.startup,
        mainFunction: value.mainFunction,
        ports: value.ports,
        deviceChecks: value.deviceChecks,
        issues: value.issues,
        otherIssue: value.otherIssue?.trim() || undefined
      },
      battery: {
        condition: value.batteryCondition,
        maximumCapacity: value.batteryCapacity === '' ? undefined : Number(value.batteryCapacity),
        repairHistory: value.repairHistory,
        replacedParts: value.replacedParts,
        repairDescription: value.repairDescription?.trim() || undefined,
        needsTechnicalInspection: this.needsTechnicalInspection
      },
      images: this.photos,
      additionalDescription: value.additionalDescription?.trim() || undefined
    };
  }

  private buildIssueDescription(assessment: DeviceAssessment): string {
    const issues = assessment.functionality.issues.includes('Không có lỗi')
      ? 'Không ghi nhận lỗi cụ thể'
      : assessment.functionality.issues.join(', ') || 'Cần kiểm tra tổng thể';
    return `${assessment.appearance.overall}; lỗi chức năng: ${issues}. ${assessment.additionalDescription || ''}`.trim();
  }

  loadRequests(): void {
    this.loadingList = true;
    this.repairService.getMyRequests().subscribe({
      next: response => {
        this.requests = response.requests;
        this.loadingList = false;
        this.openRequestedHistory();
        this.changeDetector.markForCheck();
        const pending = this.requests.find(item =>
          item.repairOrderID && item.aiAssessmentStatus?.startsWith('Đang')
        );
        if (pending?.repairOrderID) this.startAiPolling(pending.repairOrderID);
      },
      error: error => {
        this.loadingList = false;
        this.errorMessage = error.error?.message || 'Không thể tải lịch sử sửa chữa.';
        this.changeDetector.markForCheck();
      }
    });
  }

  assess(request: RepairRequest): void {
    if (!request.repairOrderID) return;
    this.aiMessage = '';
    this.aiAssessment = null;
    this.repairService.requestAiAssessment(request.repairOrderID).subscribe({
      next: response => {
        if (response.assessment) {
          this.aiAssessment = this.normalizeAiAssessment(response.assessment, request);
          request.aiAssessmentStatus = this.aiAssessment.status;
          request.aiAssessmentHistory = [
            this.aiAssessment,
            ...(request.aiAssessmentHistory || [])
          ];
          this.changeDetector.markForCheck();
          return;
        }
        request.aiAssessmentStatus = response.status || 'Đang đánh giá bằng Gemini';
        this.changeDetector.markForCheck();
        this.toastService.showToast(
          'Yêu cầu đã vào hàng đợi. Kết quả sẽ được cập nhật tự động trong lịch sử sửa chữa.',
          'info',
          'Gemini đang xử lý',
          7000
        );
        this.startAiPolling(request.repairOrderID);
      },
      error: error => {
        this.aiMessage = error.error?.message || 'Không thể đánh giá thiết bị.';
        this.changeDetector.markForCheck();
        this.toastService.showToast(this.aiMessage, 'error', 'Không thể gửi Gemini');
      }
    });
  }

  private startAiPolling(repairOrderID?: string): void {
    if (!repairOrderID) return;
    if (this.aiPollTimeout) clearTimeout(this.aiPollTimeout);
    this.aiPollAttempts = 0;
    this.pollAiResult(repairOrderID);
  }

  private pollAiResult(repairOrderID: string): void {
    if (this.aiPollAttempts >= this.maxAiPollAttempts) {
      this.toastService.showToast(
        'Yêu cầu vẫn đang được xử lý. Vui lòng xem lại lịch sử sửa chữa hoặc thử đánh giá lại sau.',
        'info',
        'Gemini đang xử lý lâu hơn dự kiến',
        9000
      );
      return;
    }
    this.aiPollAttempts++;
    this.aiPollTimeout = setTimeout(() => {
      this.repairService.getMyRequests().subscribe({
        next: response => {
          this.requests = response.requests;
          const updated = this.requests.find(item => item.repairOrderID === repairOrderID);
          this.changeDetector.markForCheck();
          if (!updated) return;
          if (this.result?.request.repairOrderID === repairOrderID) {
            this.result.request = updated;
          }
          if (updated.aiAssessmentStatus === 'Lỗi đánh giá Gemini') {
            this.toastService.showToast(
              'Gemini chưa thể phân tích yêu cầu này. Bạn có thể thử gửi đánh giá lại.',
              'error',
              'Đánh giá chưa hoàn tất',
              9000
            );
            return;
          }
          if (updated.aiAssessmentHistory?.length) {
            const latest = this.getLatestAssessment(updated);
            updated.aiAssessmentStatus = latest.status;
            if (this.result?.request.repairOrderID === repairOrderID) {
              this.aiAssessment = this.normalizeAiAssessment(latest, updated);
            }
            if (latest.source === 'gemini') {
              this.toastService.showToast(
                'Gemini đã phân tích xong tình trạng và định giá các hướng xử lý.',
                'success',
                'Đã có kết quả Gemini',
                8000
              );
            } else {
              this.toastService.showToast(
                latest.error || 'Gemini đang tạm thời quá tải. Bạn có thể thử đánh giá lại từ lịch sử sửa chữa.',
                'error',
                'Chưa nhận được kết quả AI',
                9000
              );
            }
            return;
          }
          this.pollAiResult(repairOrderID);
        },
        error: () => this.pollAiResult(repairOrderID)
      });
    }, 15000);
  }

  private normalizeAiAssessment(
    assessment: Partial<AiAssessment> | null | undefined,
    request: RepairRequest
  ): AiAssessment {
    const recommendation = assessment?.recommendation || 'Chưa có kết luận tự động.';
    const createRecommendation = (title: string, fallback: string): AiRecommendation => ({
      title,
      recommendation: fallback,
      nextStep: 'Chờ kỹ thuật viên kiểm tra trực tiếp.',
      confidence: 'thấp'
    });
    const defaults = {
      repair: createRecommendation('Sửa chữa', 'Cần kiểm tra khả năng thay thế linh kiện.'),
      resell: createRecommendation('Bán lại', 'Chỉ bán lại sau khi công khai đầy đủ tình trạng.')
    };
    return {
      assessmentID: assessment?.assessmentID || `LOCAL-${request.repairOrderID}`,
      repairOrderID: assessment?.repairOrderID || request.repairOrderID || '',
      userID: assessment?.userID,
      deviceType: assessment?.deviceType || request.deviceType,
      source: assessment?.source || 'fallback',
      fingerprint: assessment?.fingerprint,
      recommendation,
      recommendations: {
        repair: { ...defaults.repair, ...(assessment?.recommendations?.repair || {}) },
        resell: { ...defaults.resell, ...(assessment?.recommendations?.resell || {}) }
      },
      summary: assessment?.summary || recommendation,
      estimatedPrice: assessment?.estimatedPrice || 'Chưa có dữ liệu định giá',
      estimatedPriceDetails: assessment?.estimatedPriceDetails || {
        amountVnd: null,
        currency: 'VND',
        display: 'Chưa có dữ liệu định giá',
        rationale: ''
      },
      estimatedPrices: assessment?.estimatedPrices || {
        repair: this.emptyPrice(),
        resell: this.emptyPrice()
      },
      status: assessment?.status || 'Chưa có kết quả AI',
      error: assessment?.error || null,
      createdAt: assessment?.createdAt || new Date().toISOString()
    };
  }

  showStoredAssessment(assessment: AiAssessment): void {
    this.selectedHistoryAssessment = this.normalizeAiAssessment(assessment, {
      repairOrderID: assessment.repairOrderID,
      deviceName: '',
      deviceType: assessment.deviceType,
      issueDescription: '',
      contactPhone: ''
    });
  }

  closeStoredAssessment(): void {
    this.selectedHistoryAssessment = null;
  }

  openHistoryDetails(request: RepairRequest): void {
    this.selectedHistoryRequest = request;
  }

  private openRequestedHistory(): void {
    const requestedRequest = this.requests.find(
      item => item.repairOrderID === this.requestedHistoryOrderID
    );
    if (requestedRequest) {
      this.openHistoryDetails(requestedRequest);
      setTimeout(() => document.getElementById('repair-history')?.scrollIntoView({ behavior: 'smooth' }));
      return;
    }
    if (
      this.selectedHistoryRequest?.repairOrderID &&
      !this.requests.some(item => item.repairOrderID === this.selectedHistoryRequest?.repairOrderID)
    ) {
      this.selectedHistoryRequest = null;
    }
  }

  getLatestAssessment(request: RepairRequest): AiAssessment {
    return request.aiAssessmentHistory?.[0]
      || this.normalizeAiAssessment(null, request);
  }

  private emptyPrice(): PriceEstimate {
    return {
      amountVnd: null,
      currency: 'VND',
      display: 'Chưa có dữ liệu định giá',
      rationale: ''
    };
  }
}
