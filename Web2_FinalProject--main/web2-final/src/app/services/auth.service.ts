
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User, UserRole } from '../classes/user';

const JSON_HEADERS = {
  'Content-Type': 'application/json'
};

interface AuthResponse {
  message: string;
  token?: string;
  user: User;
}

export interface RegisterRequest {
  userName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  province: string;
  district?: string;
  streetAddress: string;
  password: string;
  role: 'CUSTOMER' | 'SELLER';
  businessName?: string;
  shopName?: string;
}

export interface ProfileUpdateRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  province: string;
  district?: string;
  streetAddress: string;
  businessName?: string;
  shopName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:3000/api/auth';

  private readonly userSubject =
    new BehaviorSubject<User | null>(this.readSavedUser());

  readonly currentUser$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  get token(): string | null {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem('ecocycle_token')
      : null;
  }

  get isLoggedIn(): boolean {
    return !!this.token && !!this.currentUser;
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/register`,
      data,
      { headers: JSON_HEADERS }
    );
  }

  login(
    identifier: string,
    password: string
  ): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/login`,
      { identifier, password },
      { headers: JSON_HEADERS }
    ).pipe(
      tap(response => {
        if (!response.token) {
          throw new Error('API không trả về token.');
        }

        localStorage.setItem(
          'ecocycle_token',
          response.token
        );

        localStorage.setItem(
          'ecocycle_user',
          JSON.stringify(response.user)
        );

        this.userSubject.next(Object.assign(new User(), response.user));
      })
    );
  }

  restoreSession(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(
      `${this.apiUrl}/me`
    ).pipe(
      tap(response => {
        localStorage.setItem(
          'ecocycle_user',
          JSON.stringify(response.user)
        );

        this.userSubject.next(Object.assign(new User(), response.user));
      })
    );
  }

  updateProfile(data: ProfileUpdateRequest): Observable<AuthResponse> {
    return this.http.put<AuthResponse>(`${this.apiUrl}/profile`, data).pipe(
      tap(response => {
        localStorage.setItem('ecocycle_user', JSON.stringify(response.user));
        this.userSubject.next(Object.assign(new User(), response.user));
      })
    );
  }

  logout(): void {
    localStorage.removeItem('ecocycle_token');
    localStorage.removeItem('ecocycle_user');
    this.userSubject.next(null);
  }

  hasRole(...roles: UserRole[]): boolean {
    return !!this.currentUser?.role &&
      roles.includes(this.currentUser.role);
  }

  private readSavedUser(): User | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem('ecocycle_user');

      if (!raw) return null;

      const data = JSON.parse(raw);

      // Không bao giờ khôi phục password từ localStorage.
      delete data.password;

      return Object.assign(new User(), data);
    } catch {
      return null;
    }
  }
}