import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ProductService } from '../../services/product';
import { Category } from '../../../../classes/category';
import { Product } from '../../../../classes/product';
import { createSlug } from '../../../../classes/slug-helper';

@Component({
  selector: 'app-product-list',
  standalone: false,
  styleUrl: './product-list.css',
  templateUrl: './product-list.html',
})
export class ProductList implements OnInit {
  readonly fallbackImage = '/assets/ecocycle-logo.svg';
  public createSlug = createSlug;
  categories: Category[] = [];
  allProducts: Product[] = [];
  displayedProducts: Product[] = [];
  
  selectedCateId: string = '';
  searchKeyword: string = '';
  selectedSort: string = 'all';
  
  minPrice: number | null = null;
  maxPrice: number | null = null;
  
  selectedConditions: string[] = [];
  
  availableProvinces: string[] = ['TP.HCM', 'Đà Nẵng', 'Hà Nội', 'Bình Dương', 'Cần Thơ', 'Đồng Nai', 'Hải Phòng'];
  selectedLocations: string[] = [];

  currentPage: number = 1;
  pageSize: number = 50;
  totalPages: number = 1;
  pagesArray: number[] = [1];

  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(
    private _productService: ProductService,
    private _cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAllProducts();

    this._productService.searchKeyword$.subscribe({
      next: (kw) => {
        this.searchKeyword = kw;
        this.extractAllProducts();
        this._cdr.detectChanges();
      }
    });
  }

  loadAllProducts(): void {
    this.isLoading = true;
    this.selectedCateId = '';
    console.log('[ProductList] Đang gọi getProducts()...');
    this._productService.getProducts().subscribe({
      next: (data) => {
        console.log('[ProductList] Nhận dữ liệu thành công từ Server:', data);
        this.categories = data || [];
        this.extractAllProducts();
        this.isLoading = false;
        this._cdr.detectChanges();
      },
      error: (err) => {
        console.error('[ProductList] Lỗi gọi API:', err);
        this.errorMessage = 'Không thể tải dữ liệu từ MongoDB Server! Vui lòng bật "node index.js" ở folder database-mongodb';
        this.isLoading = false;
        this._cdr.detectChanges();
      }
    });
  }

  toggleCondition(conditionValue: string): void {
    const index = this.selectedConditions.indexOf(conditionValue);
    if (index > -1) {
      this.selectedConditions.splice(index, 1);
    } else {
      this.selectedConditions.push(conditionValue);
    }
    this.extractAllProducts();
  }

  toggleLocation(locationValue: string): void {
    const index = this.selectedLocations.indexOf(locationValue);
    if (index > -1) {
      this.selectedLocations.splice(index, 1);
    } else {
      this.selectedLocations.push(locationValue);
    }
    this.extractAllProducts();
  }

  extractAllProducts(): void {
    let list: Product[] = [];
    if (this.selectedCateId) {
      const cat = this.categories.find(c => c.CateID === this.selectedCateId);
      if (cat) list = [...cat.Products];
    } else {
      this.categories.forEach(cat => {
        if (cat.Products) {
          list = list.concat(cat.Products);
        }
      });
    }

    list = list.filter(p => p.Status !== 'Đã bán');

    if (this.searchKeyword.trim()) {
      const kw = this.searchKeyword.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(kw));
    }

    if (this.minPrice !== null && this.minPrice > 0) {
      list = list.filter(p => this.parsePrice(p.fromPrice) >= (this.minPrice! * 1000000));
    }
    if (this.maxPrice !== null && this.maxPrice > 0) {
      list = list.filter(p => this.parsePrice(p.fromPrice) <= (this.maxPrice! * 1000000));
    }

    if (this.selectedConditions.length > 0) {
      list = list.filter(p => {
        if (!p.condition) return false;
        const cond = p.condition.toLowerCase().trim();
        return this.selectedConditions.some(sc => {
          if (sc === 'Mới') {
            return cond === 'mới' || cond === 'moi' || cond.includes('mới 100%') || cond.includes('mới tinh') || cond.includes('nguyên seal');
          }
          if (sc === 'Mới 80-99%') {
            return cond.includes('99%') || cond.includes('98%') || cond.includes('97%') || cond.includes('96%') || cond.includes('95%') || cond.includes('90%') || cond.includes('85%') || cond.includes('80%') || cond.includes('likenew') || cond.includes('like new');
          }
          if (sc === 'Đã qua sử dụng') {
            return cond.includes('đã sử dụng') || cond.includes('da su dung') || cond.includes('cũ') || cond.includes('đã qua sử dụng');
          }
          return false;
        });
      });
    }

    if (this.selectedLocations.length > 0) {
      list = list.filter(p => {
        const prodLoc = (p.sellerLocation || '').toLowerCase();
        const prodDesc = (p.Description || '').toLowerCase();
        return this.selectedLocations.some(sl => {
          const locLow = sl.toLowerCase();
          return prodLoc.includes(locLow) || prodDesc.includes(locLow);
        });
      });
    }

    if (this.selectedSort === 'price-asc') {
      list.sort((a, b) => this.parsePrice(a.fromPrice) - this.parsePrice(b.fromPrice));
    } else if (this.selectedSort === 'price-desc') {
      list.sort((a, b) => this.parsePrice(b.fromPrice) - this.parsePrice(a.fromPrice));
    }

    this.allProducts = list;
    this.currentPage = 1;
    this.updatePagination();
  }

  resetFilters(): void {
    this.minPrice = null;
    this.maxPrice = null;
    this.selectedConditions = [];
    this.selectedLocations = [];
    this.selectedCateId = '';
    this.searchKeyword = '';
    this.selectedSort = 'all';
    this._productService.setSearchKeyword('');
    this.extractAllProducts();
  }

  parsePrice(priceStr: string): number {
    if (!priceStr) return 0;
    const num = priceStr.replace(/[^0-9]/g, '');
    return parseInt(num, 10) || 0;
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.allProducts.length / this.pageSize) || 1;
    this.pagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedProducts = this.allProducts.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  filterByCategory(cateId: string): void {
    this.selectedCateId = cateId;
    this.extractAllProducts();
  }

  setSort(sortType: string): void {
    this.selectedSort = sortType;
    this.extractAllProducts();
  }

  onSearch(): void {
    this.extractAllProducts();
  }

  scrollCategoriesLeft(): void {
    const el = document.getElementById('categoryScrollContainer');
    if (el) {
      el.scrollBy({ left: -300, behavior: 'smooth' });
    }
  }

  scrollCategoriesRight(): void {
    const el = document.getElementById('categoryScrollContainer');
    if (el) {
      el.scrollBy({ left: 300, behavior: 'smooth' });
    }
  }

  onProductImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.src.endsWith(this.fallbackImage)) return;
    image.src = this.fallbackImage;
  }
}
