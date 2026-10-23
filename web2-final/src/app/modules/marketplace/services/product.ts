import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Category } from '../../../classes/category';
import { Product } from '../../../classes/product';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private _apiUrl = 'http://localhost:3000/products';
  private _cachedCategories: Category[] | null = null;

  private _searchKeywordSource = new BehaviorSubject<string>('');
  searchKeyword$ = this._searchKeywordSource.asObservable();

  constructor(private _http: HttpClient) {}

  setSearchKeyword(keyword: string): void {
    this._searchKeywordSource.next(keyword);
  }

  clearProductsCache(): void {
    this._cachedCategories = null;
  }

  getProducts(forceRefresh: boolean = false): Observable<Category[]> {
    if (this._cachedCategories && !forceRefresh) {
      return of(this._cachedCategories);
    }

    return this._http.get<Category[]>(this._apiUrl).pipe(
      tap(data => this._cachedCategories = data)
    );
  }

  getProductDetail(id: string): Observable<Product> {
    return this._http.get<Product>(`${this._apiUrl}/detail/${id}`);
  }

  filterProducts(cateId?: string): Observable<Category[]> {
    let params = new HttpParams();
    if (cateId) {
      params = params.set('cateId', cateId);
    }
    return this._http.get<Category[]>(`${this._apiUrl}/filter`, { params });
  }

  searchProducts(keyword: string): Observable<Category[]> {
    let params = new HttpParams();
    if (keyword) {
      params = params.set('keyword', keyword);
    }
    return this._http.get<Category[]>(`${this._apiUrl}/filter`, { params });
  }

  createProductRequest(requestData: any): Observable<any> {
    return this._http.post('http://localhost:3000/api/product-requests', requestData);
  }

  getProductRequests(): Observable<any[]> {
    return this._http.get<any[]>('http://localhost:3000/api/product-requests');
  }
}
