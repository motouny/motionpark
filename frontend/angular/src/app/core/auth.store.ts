import { computed, Injectable, signal } from '@angular/core';
import { User } from '../models';
import { TokenStorage } from './token-storage';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly userSignal = signal<User | null>(null);
  private readonly sessionChecked = signal(false);

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.userSignal() || !!this.storage.accessToken);
  readonly roles = computed<string[]>(() => this.userSignal()?.roles ?? []);
  readonly isAdmin = computed(() => this.hasRole('admin'));
  readonly hasSession = computed(() => !!this.storage.accessToken);
  readonly checked = this.sessionChecked.asReadonly();

  constructor(private readonly storage: TokenStorage) {}

  setUser(user: User | null): void {
    this.userSignal.set(user);
    this.sessionChecked.set(true);
  }

  markChecked(): void {
    this.sessionChecked.set(true);
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  hasAnyRole(required: string[]): boolean {
    const roles = this.roles();
    return required.some((role) => roles.includes(role));
  }

  clear(): void {
    this.storage.clear();
    this.userSignal.set(null);
  }
}
