import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { Activity } from '../../models';
import { PublicService } from '../../services/public.service';
import { ActivityVisualComponent } from '../../shared/activity-visual.component';
import { EmptyComponent } from '../../shared/empty.component';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ActivityVisualComponent, IconComponent, LoadingComponent, EmptyComponent],
  template: `
    <section class="page-band">
      <div class="container">
        <p class="eyebrow">{{ i18n.t('nav.activities') }}</p>
        <h1>{{ i18n.t('activitiesPage.title') }}</h1>
        <p class="lead">{{ i18n.t('activitiesPage.lead') }}</p>
      </div>
    </section>

    <section class="list-section">
      <div class="container">
        @if (loader.loading()) {
          <app-loading [label]="i18n.t('common.loading')" />
        } @else if (activities().length === 0) {
          <app-empty [message]="i18n.t('activitiesPage.empty')" />
        } @else {
          <div class="cards">
            @for (a of activities(); track a.id) {
              <article class="card">
                <a [routerLink]="['/activities', a.slug]" class="stretch" [attr.aria-label]="i18n.pick(a)">
                  <app-activity-visual [slug]="a.slug" [icon]="a.icon ?? 'sparkles'" />
                  <div class="overlay"></div>
                  <div class="body">
                    <span class="subtitle">{{ i18n.pick(a, 'nameEn', 'nameAr') }}</span>
                    <h3>{{ i18n.pick(a) }}</h3>
                    <p>{{ i18n.pick(a, 'descriptionAr', 'descriptionEn') }}</p>
                    <span class="more">
                      {{ i18n.t('homeActivities.more') }}
                      <app-icon name="arrow-start" size="0.95rem" [flip]="true" />
                    </span>
                  </div>
                </a>
              </article>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .list-section { padding: 64px 0 96px; background: var(--light-bg); }
    .cards {
      display: grid; gap: 1.25rem;
      @media (min-width: 640px) { grid-template-columns: repeat(2, 1fr); }
    }
    .card {
      position: relative; min-height: 340px;
      border-radius: 28px; overflow: hidden; color: #fff;
      transition: transform 240ms var(--ease-out), box-shadow 240ms var(--ease-out);
      &:hover { transform: translateY(-6px); box-shadow: 0 22px 46px rgba(18,18,24,.24); }
    }
    .stretch { position: absolute; inset: 0; }
    .overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to top, #121218 0%, rgba(18,18,24,.2) 60%, transparent 100%);
    }
    .body {
      position: absolute; inset-inline: 0; bottom: 0; padding: 1.75rem;
      .subtitle {
        display: block; margin-bottom: .5rem;
        font-family: 'Sora', sans-serif;
        font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .16em;
        color: rgba(255,255,255,.6);
      }
      h3 { font-size: 1.6rem; font-weight: 900; }
      p { margin-top: .5rem; max-width: 420px; font-size: .92rem; color: rgba(255,255,255,.72); }
      .more { margin-top: 1.1rem; display: inline-flex; align-items: center; gap: .5rem; font-size: .9rem; font-weight: 700; }
    }
    .card:hover .more { color: #FFB36B; }
  `,
})
export class ActivitiesComponent {
  protected readonly i18n = inject(I18nService);
  private readonly publicService = inject(PublicService);

  protected readonly loader = createLoader<Activity[]>(() => this.publicService.activities(), []);
  protected readonly activities = computed(() => this.loader.data().filter((a) => a.active));
}
