import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { Coach } from '../../../models';
import { PublicService } from '../../../services/public.service';
import { EmptyComponent } from '../../../shared/empty.component';
import { IconComponent } from '../../../shared/icon.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { SectionHeadComponent } from '../../../shared/section-head.component';

@Component({
  selector: 'app-coaches-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, LoadingComponent, EmptyComponent, SectionHeadComponent],
  template: `
    <section class="section coaches">
      <div class="container">
        <div class="row">
          <app-section-head
            [eyebrow]="i18n.t('homeCoaches.eyebrow')"
            [description]="i18n.t('homeCoaches.subtitle')"
          >
            {{ i18n.t('homeCoaches.title') }}
          </app-section-head>
          <a routerLink="/coaches" class="all-link">
            {{ i18n.t('homeCoaches.viewAll') }}
            <app-icon name="arrow-start" size="1rem" [flip]="true" />
          </a>
        </div>

        @if (loader.loading()) {
          <app-loading [label]="i18n.t('common.loading')" />
        } @else if (coaches().length === 0) {
          <app-empty [message]="i18n.t('coachesPage.empty')" />
        } @else {
          <div class="grid">
            @for (coach of coaches(); track coach.id) {
              <a class="coach-card" [routerLink]="['/coaches', coach.slug]">
                <span class="avatar" aria-hidden="true">
                  @if (coach.photoUrl) {
                    <img [src]="coach.photoUrl" [alt]="i18n.pick(coach)" loading="lazy" />
                  } @else {
                    <span class="initials">{{ initials(coach) }}</span>
                  }
                </span>
                <h3>{{ i18n.pick(coach) }}</h3>
                <p class="bio">{{ i18n.pick(coach, 'bioAr', 'bioEn') }}</p>
                <span class="link">
                  {{ i18n.t('homeActivities.more') }}
                  <app-icon name="arrow-start" size="0.9rem" [flip]="true" />
                </span>
              </a>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .coaches { background: var(--schedule-surface); }
    .row {
      display: flex; flex-direction: column; gap: 1.5rem;
      justify-content: space-between; align-items: flex-start;
      margin-bottom: 2.75rem;
      @media (min-width: 768px) { flex-direction: row; align-items: flex-end; }
    }
    .all-link {
      display: inline-flex; align-items: center; gap: .5rem;
      border: 1px solid rgba(245,245,247,.18); border-radius: 9999px;
      padding: .8rem 1.4rem; font-size: .88rem; font-weight: 700;
      transition: all 160ms var(--ease-out);
      &:hover { border-color: var(--primary); color: var(--primary); }
    }
    .grid {
      display: grid; gap: 1rem;
      @media (min-width: 640px) { grid-template-columns: repeat(2, 1fr); }
      @media (min-width: 1024px) { grid-template-columns: repeat(4, 1fr); }
    }
    .coach-card {
      border-radius: 24px; border: 1px solid rgba(245,245,247,.09);
      background: var(--card); padding: 1.5rem;
      transition: transform 200ms var(--ease-out), border-color 200ms var(--ease-out);
      display: flex; flex-direction: column;
      &:hover { transform: translateY(-4px); border-color: rgba(255,64,129,.4); }
      .avatar {
        width: 64px; height: 64px; border-radius: 20px; overflow: hidden;
        display: grid; place-items: center;
        background: linear-gradient(135deg, rgba(255,122,0,.35), rgba(255,64,129,.35), rgba(138,43,226,.35));
        margin-bottom: 1rem;
        img { width: 100%; height: 100%; object-fit: cover; }
        .initials { font-weight: 900; font-size: 1.3rem; color: #fff; }
      }
      h3 { font-size: 1.15rem; font-weight: 900; }
      .bio {
        margin-top: .5rem; font-size: .85rem; line-height: 1.7;
        color: rgba(245,245,247,.6);
        display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
      }
      .link {
        margin-top: 1.1rem; display: inline-flex; align-items: center; gap: .4rem;
        font-size: .85rem; font-weight: 700; color: #FF9B50;
      }
    }
  `,
})
export class CoachesSectionComponent {
  protected readonly i18n = inject(I18nService);
  private readonly publicService = inject(PublicService);

  @Input() content: Record<string, unknown> | null | undefined = null;

  protected readonly loader = createLoader<Coach[]>(() => this.publicService.coaches(), []);
  protected readonly coaches = computed(() => this.loader.data().filter((c) => c.active).slice(0, 4));

  protected initials(coach: Coach): string {
    const name = this.i18n.pick(coach);
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
  }
}
