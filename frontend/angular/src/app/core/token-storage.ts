import { Injectable } from '@angular/core';
import { AuthTokens } from '../models';

const ACCESS_KEY = 'mp.accessToken';
const REFRESH_KEY = 'mp.refreshToken';

@Injectable({ providedIn: 'root' })
export class TokenStorage {
  private memory: AuthTokens | null = null;

  get tokens(): AuthTokens | null {
    if (this.memory) return this.memory;
    try {
      const accessToken = localStorage.getItem(ACCESS_KEY);
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (accessToken) {
        this.memory = { accessToken, refreshToken: refreshToken ?? '' };
        return this.memory;
      }
    } catch {
      /* storage unavailable */
    }
    return null;
  }

  get accessToken(): string | null {
    return this.tokens?.accessToken ?? null;
  }

  get refreshToken(): string | null {
    return this.tokens?.refreshToken ?? null;
  }

  save(tokens: AuthTokens): void {
    this.memory = tokens;
    try {
      localStorage.setItem(ACCESS_KEY, tokens.accessToken);
      if (tokens.refreshToken) localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    } catch {
      /* storage unavailable */
    }
  }

  clear(): void {
    this.memory = null;
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* storage unavailable */
    }
  }
}
