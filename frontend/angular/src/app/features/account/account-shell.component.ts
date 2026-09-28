import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth.store';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <section class="portal">
      <div class="container">
        <header class="portal-head">
          <div>
            <p class="eyebrow">{{ i18n.t('nav.account') }}</p>
            <h1>{{ i18n.t('account.welcome', { name: store.user()?.name ?? '' }) }}</h1>
          </div>
          <button class="btn btn-ghost btn-sm" (click)="logout()">
            <app-icon name="logout" size="0.95rem" />
            {{ i18n.t('nav.logout') }}
          </button>
        </header>

        <nav class="portal-tabs" [attr.aria-label]="i18n.t('nav.account')">
          <a routerLink="profile" routerLinkActive="active">{{ i18n.t('account.tabs.profile') }}</a>
          <a routerLink="membership" routerLinkActive="active">{{ i18n.t('account.tabs.membership') }}</a>
          <a routerLink="bookings" routerLinkActive="active">{{ i18n.t('account.tabs.bookings') }}</a>
          <a routerLink="payments" routerLinkActive="active">{{ i18n.t('account.tabs.payments') }}</a>
          <a routerLink="invoices" routerLinkActive="active">{{ i18n.t('account.tabs.invoices') }}</a>
          <a routerLink="notifications" routerLinkActive="active">{{ i18n.t('account.tabs.notifications') }}</a>
        </nav>

        <router-outlet />
      </div>
    </section>
  `,
  styles: `
    .portal { min-height: 80vh; padding: 130px 0 100px; background: var(--background); }
    .portal-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    h1 { margin-top: .5rem; font-size: clamp(1.7rem, 4vw, 2.4rem); font-weight: 900; }
    .portal-tabs { margin-top: 2rem; }
  `,
})
export class AccountShellComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly store = inject(AuthStore);
  private readonly auth = inject(AuthService);

  protected readonly isRtl = computed(() => this.i18n.dir() === 'rtl');

  constructor() {
    // Eagerly load the profile so child pages have data (no-op when cached).
    if (!this.store.user()) {
      this.auth.loadProfile().subscribe();
    }
  }

  protected logout(): void {
    this.auth.logout().subscribe(() => {
      window.location.href = '/';
    });
  }
}
