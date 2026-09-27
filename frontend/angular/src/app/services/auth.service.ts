import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { API_CONFIG, ApiConfig } from '../core/api-config';
import { AuthStore } from '../core/auth.store';
import { TokenStorage } from '../core/token-storage';
import { AuthResponse, ProfileUpdate, User } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject<ApiConfig>(API_CONFIG);
  private readonly storage = inject(TokenStorage);
  private readonly store = inject(AuthStore);

  private get base(): string {
    return this.config.baseUrl;
  }

  login(identifier: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/login`, { identifier, password }).pipe(
      tap((res) => this.persistSession(res)),
    );
  }

  register(payload: { name: string; email?: string; phone: string; password: string; preferredLanguage: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/register`, payload).pipe(
      tap((res) => this.persistSession(res)),
    );
  }

  refresh(refreshToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/refresh`, { refreshToken });
  }

  logout(): Observable<unknown> {
    const refreshToken = this.storage.refreshToken;
    const req: Observable<unknown> = refreshToken
      ? this.http.post(`${this.base}/auth/logout`, { refreshToken })
      : of(null);
    return req.pipe(
      catchError(() => of(null)),
      tap(() => {
        this.store.clear();
        this.store.markChecked();
      }),
    );
  }

  forgotPassword(identifier: string): Observable<unknown> {
    return this.http.post(`${this.base}/auth/forgot-password`, { identifier });
  }

  resetPassword(token: string, newPassword: string): Observable<unknown> {
    return this.http.post(`${this.base}/auth/reset-password`, { token, newPassword });
  }

  /** Load the current profile into the store. Resolves false when the session is invalid. */
  loadProfile(): Observable<boolean> {
    if (!this.storage.accessToken) {
      this.store.markChecked();
      return of(false);
    }
    return this.http.get<User>(`${this.base}/account/profile`).pipe(
      tap((user) => this.store.setUser(user)),
      map(() => true),
      catchError(() => {
        this.store.clear();
        this.store.markChecked();
        return of(false);
      }),
    );
  }

  updateProfile(payload: ProfileUpdate): Observable<User> {
    return this.http.put<User>(`${this.base}/account/profile`, payload).pipe(
      tap((user) => this.store.setUser(user)),
    );
  }

  private persistSession(res: AuthResponse): void {
    this.storage.save({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    this.store.setUser(res.user);
  }
}
