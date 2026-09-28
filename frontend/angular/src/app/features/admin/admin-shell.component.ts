import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth.store';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { IconComponent } from '../../shared/icon.component';
import { LanguageSwitcherComponent } from '../../shared/language-switcher.component';

interface NavItem {
  link: string;
  label: string;
  icon: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-admin-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, LanguageSwitcherComponent],
  template: `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <a routerLink="/" class="brand">
          <img src="assets/brand/motion-park-logo-light.png" alt="Motion Park" height="40" width="165" />
        </a>

        @for (group of nav(); track group.title) {
          <div class="admin-nav-group">
            <h4>{{ group.title }}</h4>
            @for (item of group.items; track item.link) {
              <a [routerLink]="item.link" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.link === '/admin' }">
                <app-icon [name]="item.icon" size="1rem" />
                {{ item.label }}
              </a>
            }
          </div>
        }
      </aside>

      <div class="admin-main">
        <header class="topbar">
          <a routerLink="/" class="view-site">
            <app-icon name="external" size="0.95rem" />
            {{ i18n.t('admin.viewSite') }}
          </a>
          <div class="top-actions">
            <app-language-switcher />
            <span class="user-chip">
              <app-icon name="user" size="0.95rem" />
              {{ store.user()?.name ?? '' }}
            </span>
            <button class="btn btn-ghost btn-sm" (click)="logout()">
              <app-icon name="logout" size="0.9rem" />
              {{ i18n.t('nav.logout') }}
            </button>
          </div>
        </header>
        <router-outlet />
      </div>
    </div>
  `,
  styles: `
    .brand { display: flex; padding: .25rem .5rem 1rem; border-bottom: 1px solid var(--border); }
    .topbar {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
      margin-bottom: 1.75rem;
    }
    .view-site {
      display: inline-flex; align-items: center; gap: .4rem;
      font-size: .85rem; font-weight: 700; color: var(--muted-foreground);
      &:hover { color: #fff; }
    }
    .top-actions { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
    .user-chip {
      display: inline-flex; align-items: center; gap: .4rem;
      font-size: .85rem; font-weight: 700;
      border: 1px solid var(--border); border-radius: 9999px; padding: .45rem .9rem;
    }
  `,
})
export class AdminShellComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly store = inject(AuthStore);
  private readonly auth = inject(AuthService);

  protected readonly nav = computed<NavGroup[]>(() => [
    {
      title: '',
      items: [{ link: '/admin', label: this.i18n.t('admin.dashboard'), icon: 'grid' }],
    },
    {
      title: this.i18n.t('admin.cms'),
      items: [
        { link: '/admin/cms/homepage', label: this.i18n.t('admin.homepageSections'), icon: 'home' },
        { link: '/admin/cms/pages', label: this.i18n.t('admin.pages'), icon: 'file' },
        { link: '/admin/cms/banners', label: this.i18n.t('admin.banners'), icon: 'tag' },
        { link: '/admin/cms/faqs', label: this.i18n.t('admin.faqs'), icon: 'list' },
        { link: '/admin/cms/testimonials', label: this.i18n.t('admin.testimonials'), icon: 'star' },
        { link: '/admin/media', label: this.i18n.t('admin.mediaLibrary'), icon: 'upload' },
      ],
    },
    {
      title: this.i18n.t('admin.content'),
      items: [
        { link: '/admin/activities', label: this.i18n.t('admin.activities'), icon: 'sparkles' },
        { link: '/admin/coaches', label: this.i18n.t('admin.coaches'), icon: 'users' },
        { link: '/admin/branches', label: this.i18n.t('admin.branches'), icon: 'building' },
        { link: '/admin/schedules', label: this.i18n.t('admin.schedules'), icon: 'calendar' },
        { link: '/admin/bookings', label: this.i18n.t('admin.bookings'), icon: 'check' },
        { link: '/admin/membership-plans', label: this.i18n.t('admin.membershipPlans'), icon: 'card' },
        { link: '/admin/customers', label: this.i18n.t('admin.customers'), icon: 'user' },
        { link: '/admin/leads', label: this.i18n.t('admin.leads'), icon: 'bell' },
      ],
    },
    {
      title: this.i18n.t('admin.integrations'),
      items: [{ link: '/admin/integrations/odoo', label: this.i18n.t('admin.odoo'), icon: 'refresh' }],
    },
    {
      title: this.i18n.t('admin.system'),
      items: [
        { link: '/admin/settings/brand', label: this.i18n.t('admin.settingsBrand'), icon: 'settings' },
        { link: '/admin/settings/system', label: this.i18n.t('admin.settingsSystem'), icon: 'database' },
        { link: '/admin/roles', label: this.i18n.t('admin.roles'), icon: 'lock' },
        { link: '/admin/audit-logs', label: this.i18n.t('admin.auditLogs'), icon: 'history' },
      ],
    },
  ]);

  protected logout(): void {
    this.auth.logout().subscribe(() => {
      window.location.href = '/';
    });
  }
}
