import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <footer class="site-footer">
      <div class="container">
        <div class="grid">
          <div>
            <img src="assets/brand/logo-light.svg" alt="Motion Park" height="56" width="228" />
            <p class="tagline">{{ i18n.t('footer.tagline') }}</p>
          </div>
          <div>
            <h3>{{ i18n.t('footer.explore') }}</h3>
            <nav class="links" [attr.aria-label]="i18n.t('footer.explore')">
              <a routerLink="/activities">{{ i18n.t('nav.activities') }}</a>
              <a routerLink="/schedule">{{ i18n.t('nav.schedule') }}</a>
              <a routerLink="/memberships">{{ i18n.t('nav.memberships') }}</a>
              <a routerLink="/coaches">{{ i18n.t('nav.coaches') }}</a>
              <a routerLink="/branches">{{ i18n.t('nav.branches') }}</a>
              <a routerLink="/about">{{ i18n.t('nav.about') }}</a>
            </nav>
          </div>
          <div>
            <h3>{{ i18n.t('footer.contact') }}</h3>
            <div class="links contact">
              <span><app-icon name="map-pin" size="1rem" /> {{ i18n.t('footer.address') }}</span>
              <a href="tel:+966110000000"><app-icon name="phone" size="1rem" /> +966 11 000 0000</a>
              <a href="mailto:hello@motionpark.sa"><app-icon name="mail" size="1rem" /> hello&#64;motionpark.sa</a>
            </div>
          </div>
        </div>
        <div class="bottom">
          <span>{{ i18n.t('footer.rights') }}</span>
          <nav class="legal" [attr.aria-label]="i18n.t('footer.legal')">
            <a routerLink="/privacy">{{ i18n.t('footer.legal') }}</a>
            <a routerLink="/terms">{{ i18n.t('footer.legal') }}</a>
          </nav>
          <span class="motto">{{ i18n.t('footer.motto') }}</span>
        </div>
      </div>
    </footer>
  `,
  styles: `
    :host { display: block; }
    .site-footer { background: var(--footer-bg); padding: 3.5rem 0 2rem; }
    .grid {
      display: grid; gap: 3rem;
      padding-bottom: 3rem;
      border-bottom: 1px solid rgba(245, 245, 247, .1);
      grid-template-columns: 1fr;
      @media (min-width: 768px) { grid-template-columns: 1.15fr .85fr .85fr; }
    }
    .tagline { margin-top: 1.25rem; max-width: 340px; color: rgba(245,245,247,.5); font-size: .92rem; line-height: 1.8; }
    h3 { font-weight: 700; margin-bottom: 1rem; }
    .links { display: grid; gap: .75rem; font-size: .92rem; color: rgba(245,245,247,.5); }
    .links a:hover { color: #fff; }
    .links.contact span, .links.contact a { display: flex; align-items: center; gap: .5rem; }
    .bottom {
      display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between;
      padding-top: 1.75rem; color: rgba(245,245,247,.34); font-size: .8rem;
    }
    .legal { display: flex; gap: 1.25rem; }
    .legal a:hover { color: #fff; }
    .motto { font-family: 'Sora', sans-serif; }
  `,
})
export class FooterComponent {
  protected readonly i18n = inject(I18nService);
}
