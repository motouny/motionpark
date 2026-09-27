import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';
import { PublicService } from '../../../services/public.service';
import { createLoader } from '../../../core/loader';
import { Activity } from '../../../models';
import { ActivityVisualComponent } from '../../../shared/activity-visual.component';
import { EmptyComponent } from '../../../shared/empty.component';
import { IconComponent } from '../../../shared/icon.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { SectionHeadComponent } from '../../../shared/section-head.component';

@Component({
  selector: 'app-activities-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ActivityVisualComponent, IconComponent, LoadingComponent, EmptyComponent, SectionHeadComponent],
  template: `
    <section id="activities" class="light-surface section">
      <div class="container">
        <div class="head-row">
          <app-section-head
            [eyebrow]="i18n.t('homeActivities.eyebrow')"
            [onLight]="true"
          >
            {{ i18n.t('homeActivities.titleA') }}<br />
            <span class="accent">{{ i18n.t('homeActivities.titleB') }}</span>
          </app-section-head>
          <a routerLink="/activities" class="all-link">
            {{ i18n.t('homeActivities.cta') }}
            <app-icon name="arrow-start" size="1rem" [flip]="true" />
          </a>
        </div>

        @if (loader.loading()) {
          <app-loading [label]="i18n.t('common.loading')" />
        } @else if (activities().length === 0) {
          <app-empty [message]="i18n.t('activitiesPage.empty')" />
        } @else {
          <div class="cards">
            @for (a of activities(); track a.id) {
              <article class="activity-card">
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
    .head-row {
      display: flex; flex-direction: column; gap: 1.5rem;
      justify-content: space-between; align-items: flex-start;
      margin-bottom: 2.75rem;
      @media (min-width: 768px) { flex-direction: row; align-items: flex-end; }
    }
    .accent { color: var(--primary); }
    .all-link {
      display: inline-flex; align-items: center; gap: .5rem;
      border: 1px solid rgba(26,26,26,.15);
      border-radius: 9999px; padding: .8rem 1.4rem;
      font-size: .88rem; font-weight: 700;
      transition: all 160ms var(--ease-out);
      &:hover { border-color: var(--primary); color: var(--primary); }
    }
    .cards {
      display: grid; gap: 1rem;
      grid-template-columns: 1fr;
      @media (min-width: 640px) { grid-template-columns: repeat(2, 1fr); }
      @media (min-width: 1024px) { grid-template-columns: repeat(4, 1fr); }
    }
    .activity-card {
      position: relative;
      min-height: 375px;
      border-radius: 28px;
      overflow: hidden;
      color: #fff;
      transition: transform 240ms var(--ease-out), box-shadow 240ms var(--ease-out);
      &:hover { transform: translateY(-6px); box-shadow: 0 22px 46px rgba(18,18,24,.24); }
    }
    .stretch { position: absolute; inset: 0; }
    .overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to top, #121218 0%, rgba(18,18,24,.25) 55%, transparent 100%);
    }
    .body {
      position: absolute; inset-inline: 0; bottom: 0;
      padding: 1.5rem;
      .subtitle {
        display: block; margin-bottom: .5rem;
        font-family: 'Sora', sans-serif;
        font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .16em;
        color: rgba(255,255,255,.6);
      }
      h3 { font-size: 1.5rem; font-weight: 900; }
      p { margin-top: .5rem; font-size: .88rem; color: rgba(255,255,255,.72); }
      .more {
        margin-top: 1.1rem; display: inline-flex; align-items: center; gap: .5rem;
        font-size: .88rem; font-weight: 700;
        transition: color 160ms var(--ease-out);
      }
    }
    .activity-card:hover .more { color: #FFB36B; }
  `,
})
export class ActivitiesSectionComponent {
  protected readonly i18n = inject(I18nService);
  private readonly publicService = inject(PublicService);

  @Input() content: Record<string, unknown> | null | undefined = null;

  protected readonly loader = createLoader<Activity[]>(() => this.publicService.activities(), []);
  protected readonly activities = computed(() => this.loader.data().filter((a) => a.active).slice(0, 4));
}
