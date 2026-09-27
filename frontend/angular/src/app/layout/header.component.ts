import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../core/auth.store';
import { AuthService } from '../services/auth.service';
import { I18nService } from '../i18n/i18n.service';
import { IconComponent } from '../shared/icon.component';
import { LanguageSwitcherComponent } from '../shared/language-switcher.component';
import { LeadDialogComponent } from '../shared/lead-dialog.component';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent, LanguageSwitcherComponent, LeadDialogComponent],
  template: `
    <header class="site-header" [class.solid]="scrolled() || menuOpen()">
      <div class="bar container">
        <a routerLink="/" class="brand" [attr.aria-label]="'Motion Park — ' + i18n.t('nav.home')">
          <img src="assets/brand/logo-light.svg" alt="Motion Park" height="46" width="187" />
        </a>

        <nav class="desktop-nav" [attr.aria-label]="i18n.t('nav.home')">
          @for (item of navItems(); track item.link) {
            <a [routerLink]="item.link" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: false }">
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="desktop-actions">
          <app-language-switcher />
          @if (store.isAuthenticated()) {
            <a class="account-link" [routerLink]="store.isAdmin() ? '/admin' : '/account'">
              <app-icon name="user" size="1rem" />
              {{ store.isAdmin() ? i18n.t('nav.admin') : i18n.t('nav.account') }}
            </a>
            <button class="btn btn-ghost btn-sm" (click)="logout()">
              <app-icon name="logout" size="0.95rem" />
              {{ i18n.t('nav.logout') }}
            </button>
          } @else {
            <a routerLink="/login" class="login-link">{{ i18n.t('nav.login') }}</a>
            <button class="btn gradient-button btn-sm" (click)="leadOpen.set(true)">
              {{ i18n.t('nav.joinNow') }}
              <app-icon name="arrow-start" size="0.95rem" [flip]="true" />
            </button>
          }
        </div>

        <button
          class="menu-btn"
          (click)="menuOpen.set(!menuOpen())"
          [attr.aria-label]="menuOpen() ? i18n.t('nav.closeMenu') : i18n.t('nav.openMenu')"
          [attr.aria-expanded]="menuOpen()"
        >
          <app-icon [name]="menuOpen() ? 'close' : 'menu'" size="1.25rem" />
        </button>
      </div>

      @if (menuOpen()) {
        <div class="mobile-panel">
          <nav class="mobile-nav" [attr.aria-label]="i18n.t('nav.home')">
            @for (item of navItems(); track item.link) {
              <a [routerLink]="item.link" routerLinkActive="active" (click)="menuOpen.set(false)">{{ item.label }}</a>
            }
            <div class="mobile-actions">
              <app-language-switcher />
              @if (store.isAuthenticated()) {
                <a class="btn btn-ghost btn-block" [routerLink]="store.isAdmin() ? '/admin' : '/account'" (click)="menuOpen.set(false)">
                  {{ store.isAdmin() ? i18n.t('nav.admin') : i18n.t('nav.account') }}
                </a>
                <button class="btn btn-ghost btn-block" (click)="logout()">{{ i18n.t('nav.logout') }}</button>
              } @else {
                <a class="btn btn-ghost btn-block" routerLink="/login" (click)="menuOpen.set(false)">{{ i18n.t('nav.login') }}</a>
              }
              <button class="btn gradient-button btn-block" (click)="leadOpen.set(true); menuOpen.set(false)">
                {{ i18n.t('nav.joinNow') }}
              </button>
            </div>
          </nav>
        </div>
      }
    </header>

    <app-lead-dialog [isOpen]="leadOpen()" (close)="leadOpen.set(false)" />
  `,
  styles: `
    :host { display: block; }
    .site-header {
      position: fixed;
      inset-inline: 0;
      top: 0;
      z-index: 60;
      transition: background 300ms var(--ease-out), box-shadow 300ms var(--ease-out), border-color 300ms var(--ease-out);
      border-bottom: 1px solid transparent;
      background: transparent;

      &.solid {
        background: rgba(18, 18, 24, .95);
        backdrop-filter: blur(16px);
        border-color: rgba(255, 255, 255, .1);
        box-shadow: 0 14px 40px rgba(0, 0, 0, .24);
      }
    }
    .bar { display: flex; align-items: center; justify-content: space-between; height: 76px; gap: 1rem; }
    .brand { display: flex; flex-shrink: 0; }
    .desktop-nav { display: none; align-items: center; gap: 1.75rem; }
    .desktop-nav a {
      font-size: .92rem; font-weight: 500; color: rgba(245, 245, 247, .72);
      transition: color 160ms var(--ease-out);
      &:hover, &.active { color: #fff; }
    }
    .desktop-actions { display: none; align-items: center; gap: .75rem; }
    .login-link { font-size: .92rem; font-weight: 600; color: rgba(245,245,247,.8); &:hover { color: #fff; } }
    .account-link {
      display: inline-flex; align-items: center; gap: .4rem;
      font-size: .9rem; font-weight: 700; color: #fff;
      border: 1px solid rgba(245,245,247,.18); border-radius: 9999px;
      padding: .45rem .9rem;
      &:hover { background: rgba(245,245,247,.08); }
    }
    .menu-btn {
      display: grid; place-items: center;
      width: 44px; height: 44px; border-radius: 50%;
      border: 1px solid rgba(245, 245, 247, .15);
      background: rgba(245, 245, 247, .05);
      color: #fff;
    }
    .mobile-panel { border-top: 1px solid rgba(255,255,255,.1); background: #17171d; padding: 1.25rem 20px 1.5rem; }
    .mobile-nav { display: grid; gap: .25rem; }
    .mobile-nav > a {
      border-radius: 12px; padding: .8rem 1rem;
      font-size: 1rem; font-weight: 600; text-align: start;
      &:hover { background: rgba(245,245,247,.05); }
    }
    .mobile-actions { display: grid; gap: .6rem; margin-top: .9rem; justify-items: stretch; }

    @media (min-width: 1024px) {
      .desktop-nav, .desktop-actions { display: flex; }
      .menu-btn, .mobile-panel { display: none; }
    }
  `,
})
export class HeaderComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly store = inject(AuthStore);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly leadOpen = signal(false);

  protected readonly navItems = computed(() => [
    { link: '/activities', label: this.i18n.t('nav.activities') },
    { link: '/schedule', label: this.i18n.t('nav.schedule') },
    { link: '/memberships', label: this.i18n.t('nav.memberships') },
    { link: '/coaches', label: this.i18n.t('nav.coaches') },
    { link: '/branches', label: this.i18n.t('nav.branches') },
    { link: '/about', label: this.i18n.t('nav.about') },
  ]);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => this.scrolled.set(window.scrollY > 24), { passive: true });
    }
  }

  protected logout(): void {
    this.menuOpen.set(false);
    this.auth.logout().subscribe(() => this.toast.info(this.i18n.t('auth.logoutSuccess')));
  }
}
