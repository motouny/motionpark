import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { Coach } from '../../models';
import { PublicService } from '../../services/public.service';
import { EmptyComponent } from '../../shared/empty.component';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, LoadingComponent, EmptyComponent],
  template: `
    <section class="page-band">
      <div class="container">
        <p class="eyebrow">{{ i18n.t('nav.coaches') }}</p>
        <h1>{{ i18n.t('coachesPage.title') }}</h1>
        <p class="lead">{{ i18n.t('coachesPage.lead') }}</p>
      </div>
    </section>

    <section class="list-body">
      <div class="container">
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
                @if ((coach.certifications ?? []).length) {
                  <ul class="certs">
                    @for (cert of coach.certifications ?? []; track cert) {
                      <li>{{ cert }}</li>
                    }
                  </ul>
                }
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
    .list-body { padding: 64px 0 96px; background: var(--schedule-surface); min-height: 40vh; }
    .grid {
      display: grid; gap: 1.25rem;
      @media (min-width: 640px) { grid-template-columns: repeat(2, 1fr); }
      @media (min-width: 1024px) { grid-template-columns: repeat(3, 1fr); }
    }
    .coach-card {
      border-radius: 24px; border: 1px solid rgba(245,245,247,.09);
      background: var(--card); padding: 1.75rem;
      display: flex; flex-direction: column;
      transition: transform 200ms var(--ease-out), border-color 200ms var(--ease-out);
      &:hover { transform: translateY(-4px); border-color: rgba(255,64,129,.4); }
      .avatar {
        width: 76px; height: 76px; border-radius: 22px; overflow: hidden;
        display: grid; place-items: center; margin-bottom: 1.1rem;
        background: linear-gradient(135deg, rgba(255,122,0,.35), rgba(255,64,129,.35), rgba(138,43,226,.35));
        img { width: 100%; height: 100%; object-fit: cover; }
        .initials { font-weight: 900; font-size: 1.5rem; color: #fff; }
      }
      h3 { font-size: 1.25rem; font-weight: 900; }
      .bio { margin-top: .5rem; font-size: .88rem; line-height: 1.75; color: rgba(245,245,247,.6); }
      .certs { margin-top: .9rem; display: flex; flex-wrap: wrap; gap: .4rem; }
      .certs li {
        border-radius: 9999px; background: rgba(138,43,226,.15); color: #c084fc;
        font-size: .72rem; font-weight: 700; padding: .25rem .7rem;
      }
      .link { margin-top: 1.25rem; display: inline-flex; align-items: center; gap: .4rem; font-size: .88rem; font-weight: 700; color: #FF9B50; }
    }
  `,
})
export class CoachesComponent {
  protected readonly i18n = inject(I18nService);
  private readonly publicService = inject(PublicService);

  protected readonly loader = createLoader<Coach[]>(() => this.publicService.coaches(), []);
  protected readonly coaches = computed(() => this.loader.data().filter((c) => c.active));

  protected initials(coach: Coach): string {
    const name = this.i18n.pick(coach);
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
  }
}
