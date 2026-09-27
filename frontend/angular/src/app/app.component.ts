import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicService } from './services/public.service';
import { FooterComponent } from './layout/footer.component';
import { HeaderComponent } from './layout/header.component';
import { I18nService } from './i18n/i18n.service';
import { IconComponent } from './shared/icon.component';
import { ToastsComponent } from './shared/toasts.component';
import { LayoutService } from './layout/layout.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastsComponent, IconComponent],
  template: `
    @if (!layout.isAdminArea()) {
      <app-header />
    }
    @if (publicService.degraded()) {
      <div class="degraded-bar" role="status">
        <app-icon name="alert" size="0.9rem" />
        {{ i18n.t('degraded') }}
      </div>
    }
    <main [class.admin-main-area]="layout.isAdminArea()">
      <router-outlet />
    </main>
    @if (!layout.isAdminArea()) {
      <app-footer />
    }
    <app-toasts />
  `,
  styles: `
    .degraded-bar {
      position: fixed;
      bottom: 0;
      inset-inline: 0;
      z-index: 80;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      background: rgba(251, 146, 60, .14);
      border-top: 1px solid rgba(251, 146, 60, .4);
      color: #fdba74;
      font-size: .8rem;
      padding: .5rem 1rem;
      backdrop-filter: blur(10px);
    }
    .admin-main-area { min-height: 100vh; }
  `,
})
export class AppComponent {
  protected readonly layout = inject(LayoutService);
  protected readonly publicService = inject(PublicService);
  protected readonly i18n = inject(I18nService);
  protected readonly title = computed(() => 'Motion Park');
}
