
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User, UserRole } from '../classes/user';
import type { ProfileUpdateRequest, RegisterRequest } from '../classes/admin';

const JSON_HEADERS = {
  'Content-Type': 'application/json'
};

interface AuthResponse {
  message: string;
  token?: string;
  user: User;
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

        const user = this.normalizeUser(response.user);

        localStorage.setItem(
          'ecocycle_token',
          response.token
        );

        localStorage.setItem(
          'ecocycle_user',
          JSON.stringify(user)
        );

        this.userSubject.next(user);
      })
    );
  }

  restoreSession(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(
      `${this.apiUrl}/me`
    ).pipe(
      tap(response => {
        const user = this.normalizeUser(response.user);

        localStorage.setItem(
          'ecocycle_user',
          JSON.stringify(user)
        );

        this.userSubject.next(user);
      })
    );
  }

  updateProfile(data: ProfileUpdateRequest): Observable<AuthResponse> {
    return this.http.put<AuthResponse>(`${this.apiUrl}/profile`, data).pipe(
      tap(response => {
        const user = this.normalizeUser(response.user);
        localStorage.setItem('ecocycle_user', JSON.stringify(user));
        this.userSubject.next(user);
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

      return this.normalizeUser(data);
    } catch {
      return null;
    }
  }

  private normalizeUser(data: User): User {
    const user = Object.assign(new User(), data);
    const normalizedRole = typeof data.role === 'string'
      ? data.role.trim().toUpperCase()
      : '';

    if (['CUSTOMER', 'SELLER', 'ADMIN', 'TECHNICIAN'].includes(normalizedRole)) {
      user.role = normalizedRole as UserRole;
    }

    delete user.password;
    return user;
  }
}