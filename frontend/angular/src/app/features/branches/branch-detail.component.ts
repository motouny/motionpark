import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { PublicService } from '../../services/public.service';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';
import { ErrorStateComponent } from '../../shared/error-state.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, LoadingComponent, ErrorStateComponent],
  template: `
    @if (loader.loading()) {
      <div style="min-height: 60vh; display: grid; place-items: center;"><app-loading /></div>
    } @else if (!branch()) {
      <section class="page-band"><div class="container"><app-error-state [message]="i18n.t('common.notFoundBody')" [showRetry]="false" /></div></section>
    } @else {
      <section class="detail-band">
        <div class="glow" aria-hidden="true"></div>
        <div class="container inner">
          <a routerLink="/branches" class="back-link">
            <app-icon name="arrow-start" size="1rem" />
            {{ i18n.t('nav.branches') }}
          </a>
          <h1>{{ i18n.pick(branch()!) }}</h1>
          <p class="lead">{{ branch()!.city }} — {{ branch()!.address }}</p>
        </div>
      </section>

      <section class="body-section">
        <div class="container cols">
          <div class="card">
            <h2>{{ i18n.t('branchesPage.address') }}</h2>
            <p class="addr">{{ branch()!.address }}</p>
            <h2>{{ i18n.t('branchesPage.hours') }}</h2>
            <p class="addr">{{ branch()!.operatingHours }}</p>
            <div class="actions">
              @if (branch()!.phone) {
                <a class="btn btn-ghost btn-sm" [href]="'tel:' + branch()!.phone">
                  <app-icon name="phone" size="0.9rem" /> {{ i18n.t('branchesPage.call') }}
                </a>
              }
              @if (branch()!.whatsapp) {
                <a class="btn btn-ghost btn-sm" [href]="'https://wa.me/' + waNumber(branch()!.whatsapp!)" target="_blank" rel="noopener">
                  <app-icon name="chat" size="0.9rem" /> {{ i18n.t('branchesPage.whatsapp') }}
                </a>
              }
              @if (branch()!.latitude && branch()!.longitude) {
                <a
                  class="btn btn-sm dir-btn"
                  [href]="'https://maps.google.com/?q=' + branch()!.latitude + ',' + branch()!.longitude"
                  target="_blank"
                  rel="noopener"
                >
                  <app-icon name="external" size="0.9rem" /> {{ i18n.t('branchesPage.directions') }}
                </a>
              }
            </div>
          </div>

          <div class="card map-card" aria-hidden="true">
            <div class="map-art">
              <span class="pin"><app-icon name="map-pin" size="1.6rem" /></span>
              <span class="ring r1"></span>
              <span class="ring r2"></span>
            </div>
            <p class="coords">{{ branch()!.latitude }}, {{ branch()!.longitude }}</p>
          </div>
        </div>
      </section>
    }
  `,
  styles: `
    .detail-band {
      position: relative; overflow: hidden; padding: 150px 0 72px;
      background:
        radial-gradient(circle at 75% 35%, rgba(255,122,0,.16), transparent 42%),
        radial-gradient(circle at 60% 70%, rgba(138,43,226,.18), transparent 42%),
        var(--background);
      .glow { position: absolute; inset-inline-end: -6rem; top: 8rem; width: 20rem; height: 20rem; border-radius: 50%; background: rgba(255,64,129,.14); filter: blur(90px); }
    }
    .inner { position: relative; }
    .back-link { display: inline-flex; align-items: center; gap: .5rem; font-size: .88rem; font-weight: 700; color: rgba(245,245,247,.6); &:hover { color: #fff; } }
    h1 { margin-top: 1.5rem; font-size: clamp(2.2rem, 6vw, 3.2rem); font-weight: 900; }
    .lead { margin-top: .75rem; color: rgba(245,245,247,.68); }
    .body-section { padding: 72px 0 96px; background: var(--background); }
    .cols { display: grid; gap: 1.5rem; @media (min-width: 1024px) { grid-template-columns: 1fr 1fr; } }
    .card { padding: 2rem; }
    h2 { font-size: 1.1rem; font-weight: 900; margin-bottom: .6rem; &:not(:first-child) { margin-top: 1.5rem; } }
    .addr { color: rgba(245,245,247,.7); }
    .actions { margin-top: 1.75rem; display: flex; gap: .75rem; flex-wrap: wrap; }
    .dir-btn { background: var(--gradient-button); color: #fff; }
    .map-card { display: grid; place-items: center; }
    .map-art {
      position: relative; width: 100%; min-height: 260px; border-radius: 20px; overflow: hidden;
      background:
        linear-gradient(rgba(245,245,247,.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(245,245,247,.05) 1px, transparent 1px),
        radial-gradient(circle at 60% 45%, rgba(255,64,129,.22), transparent 55%),
        #101014;
      background-size: 34px 34px, 34px 34px, auto, auto;
      display: grid; place-items: center;
      .pin { position: relative; z-index: 2; color: var(--primary); }
      .ring { position: absolute; border: 1px solid rgba(255,64,129,.35); border-radius: 50%; }
      .r1 { width: 90px; height: 90px; }
      .r2 { width: 170px; height: 170px; opacity: .5; }
    }
    .coords { margin-top: 1rem; color: var(--muted-foreground); font-size: .8rem; font-family: 'Sora', sans-serif; }
  `,
})
export class BranchDetailComponent {
  protected readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly publicService = inject(PublicService);

  protected readonly slug = signal(this.route.snapshot.paramMap.get('slug') ?? '');
  protected readonly loader = createLoader(() => this.publicService.branch(this.slug()), null);
  protected readonly branch = computed(() => this.loader.data());

  protected waNumber(raw: string): string {
    return raw.replace(/[^0-9]/g, '');
  }
}
