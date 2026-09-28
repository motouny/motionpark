import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { Branch } from '../../models';
import { PublicService } from '../../services/public.service';
import { EmptyComponent } from '../../shared/empty.component';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';
import { HoursPipe } from '../../shared/hours.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HoursPipe, RouterLink, IconComponent, LoadingComponent, EmptyComponent],
  template: `
    <section class="page-band">
      <div class="container">
        <p class="eyebrow">{{ i18n.t('nav.branches') }}</p>
        <h1>{{ i18n.t('branchesPage.title') }}</h1>
        <p class="lead">{{ i18n.t('branchesPage.lead') }}</p>
      </div>
    </section>

    <section class="list-body">
      <div class="container">
        @if (loader.loading()) {
          <app-loading [label]="i18n.t('common.loading')" />
        } @else if (branches().length === 0) {
          <app-empty [message]="i18n.t('branchesPage.empty')" />
        } @else {
          <div class="grid">
            @for (b of branches(); track b.id) {
              <article class="branch-card">
                <div class="map-art" aria-hidden="true">
                  <span class="pin"><app-icon name="map-pin" size="1.5rem" /></span>
                </div>
                <h3>{{ i18n.pick(b) }}</h3>
                <p class="city">{{ b.city }}</p>
                <ul class="facts">
                  <li><app-icon name="map-pin" size="0.95rem" /> {{ b.address }}</li>
                  <li><app-icon name="clock" size="0.95rem" /> {{ b.operatingHours | hours:i18n.lang() }}</li>
                  @if (b.phone) {
                    <li><app-icon name="phone" size="0.95rem" /> {{ b.phone }}</li>
                  }
                </ul>
                <div class="row-actions">
                  <a class="btn btn-ghost btn-sm" [routerLink]="['/branches', b.slug]">{{ i18n.t('homeActivities.more') }}</a>
                  @if (b.latitude && b.longitude) {
                    <a
                      class="btn btn-sm dir-btn"
                      [href]="'https://maps.google.com/?q=' + b.latitude + ',' + b.longitude"
                      target="_blank"
                      rel="noopener"
                    >
                      <app-icon name="external" size="0.9rem" />
                      {{ i18n.t('branchesPage.directions') }}
                    </a>
                  }
                </div>
              </article>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .list-body { padding: 64px 0 96px; background: var(--light-bg); min-height: 40vh; }
    .grid {
      display: grid; gap: 1.25rem;
      @media (min-width: 640px) { grid-template-columns: repeat(2, 1fr); }
    }
    .branch-card {
      border-radius: 28px; border: 1px solid rgba(26,26,26,.1);
      background: #fff; padding: 1.75rem; color: #1A1A1A;
    }
    .map-art {
      position: relative; height: 150px; border-radius: 20px; overflow: hidden;
      background:
        radial-gradient(circle at 70% 40%, rgba(255,64,129,.25), transparent 55%),
        radial-gradient(circle at 25% 75%, rgba(138,43,226,.25), transparent 55%),
        linear-gradient(150deg, #241531, #12121a);
      margin-bottom: 1.4rem;
      .pin {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        display: grid; place-items: center;
        width: 3.2rem; height: 3.2rem; border-radius: 50%;
        background: rgba(255,255,255,.12); color: #FF4081;
        backdrop-filter: blur(6px);
      }
    }
    h3 { font-size: 1.35rem; font-weight: 900; }
    .city { margin-top: .25rem; color: var(--accent); font-size: .85rem; font-weight: 700; }
    .facts { margin-top: 1rem; display: grid; gap: .6rem; color: rgba(26,26,26,.65); font-size: .9rem; }
    .facts li { display: flex; align-items: center; gap: .55rem; }
    .row-actions { margin-top: 1.5rem; display: flex; gap: .75rem; flex-wrap: wrap; }
    .btn-ghost { border-color: rgba(26,26,26,.18); color: #1A1A1A; background: transparent; }
    .dir-btn { background: var(--gradient-button); color: #fff; }
  `,
})
export class BranchesComponent {
  protected readonly i18n = inject(I18nService);
  private readonly publicService = inject(PublicService);

  protected readonly loader = createLoader<Branch[]>(() => this.publicService.branches(), []);
  protected readonly branches = computed(() => this.loader.data().filter((b) => b.active));
}
