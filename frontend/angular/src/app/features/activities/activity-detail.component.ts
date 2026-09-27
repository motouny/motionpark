import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { Coach, ScheduleEntry } from '../../models';
import { PublicService } from '../../services/public.service';
import { EmptyComponent } from '../../shared/empty.component';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';
import { ToastService } from '../../shared/toast.service';
import { LeadDialogComponent } from '../../shared/lead-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, IconComponent, LoadingComponent, EmptyComponent, LeadDialogComponent],
  template: `
    @if (loader.loading()) {
      <div style="min-height: 60vh; display: grid; place-items: center;"><app-loading /></div>
    } @else if (!activity()) {
      <section class="page-band"><div class="container"><app-empty [message]="i18n.t('common.notFoundBody')" /></div></section>
    } @else {
      <section class="detail-band">
        <div class="glow" aria-hidden="true"></div>
        <div class="container inner">
          <a routerLink="/activities" class="back-link">
            <app-icon name="arrow-start" size="1rem" />
            {{ i18n.t('activityDetail.back') }}
          </a>
          <div class="head">
            <span class="latin">{{ i18n.pick(activity(), 'nameEn', 'nameAr') }}</span>
            <h1>{{ i18n.pick(activity()) }}</h1>
            <p class="lead">{{ i18n.pick(activity(), 'descriptionAr', 'descriptionEn') }}</p>
            <button class="btn gradient-button" (click)="leadOpen.set(true)">
              {{ i18n.t('hero.ctaPrimary') }}
              <app-icon name="arrow-start" size="1rem" [flip]="true" />
            </button>
          </div>
        </div>
      </section>

      <section class="body-section">
        <div class="container cols">
          <div>
            <h2>{{ i18n.t('activitiesPage.coachesTitle') }}</h2>
            @if (coaches().length === 0) {
              <app-empty [message]="i18n.t('coachesPage.empty')" />
            } @else {
              <ul class="coach-list">
                @for (c of coaches(); track c.id) {
                  <li>
                    <a [routerLink]="['/coaches', c.slug]">
                      <span class="mini-avatar">{{ initials(c) }}</span>
                      <span class="names">
                        <strong>{{ i18n.pick(c) }}</strong>
                        <small>{{ (c.certifications ?? []).join(' · ') }}</small>
                      </span>
                      <app-icon name="arrow-start" size="1rem" [flip]="true" />
                    </a>
                  </li>
                }
              </ul>
            }
          </div>
          <div>
            <h2>{{ i18n.t('activitiesPage.scheduleTitle') }}</h2>
            @if (schedule().length === 0) {
              <app-empty [message]="i18n.t('schedulePage.empty')" />
            } @else {
              <ul class="schedule-list">
                @for (s of schedule(); track s.id) {
                  <li>
                    <span class="when">
                      <strong>{{ s.startTime }}</strong>
                      <small>{{ s.date | date: 'mediumDate' }}</small>
                    </span>
                    <span class="what">
                      <strong>{{ nameOf(s) }}</strong>
                      <small>{{ coachOf(s) }}</small>
                    </span>
                    <span class="seats" [class.full]="s.seatsLeft <= 0">{{ seatsLabel(s.seatsLeft) }}</span>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      </section>
    }
    <app-lead-dialog [isOpen]="leadOpen()" (close)="leadOpen.set(false)" />
  `,
  styles: `
    .detail-band {
      position: relative; overflow: hidden;
      padding: 150px 0 72px;
      background:
        radial-gradient(circle at 80% 30%, rgba(255,64,129,.2), transparent 40%),
        radial-gradient(circle at 65% 70%, rgba(138,43,226,.18), transparent 40%),
        var(--background);
      .glow { position: absolute; inset-inline-end: -6rem; top: 8rem; width: 20rem; height: 20rem; border-radius: 50%; background: rgba(255,122,0,.12); filter: blur(90px); }
    }
    .inner { position: relative; }
    .back-link {
      display: inline-flex; align-items: center; gap: .5rem;
      font-size: .88rem; font-weight: 700; color: rgba(245,245,247,.6);
      &:hover { color: #fff; }
    }
    .head { margin-top: 1.75rem; max-width: 640px; }
    .latin {
      font-family: 'Sora', sans-serif;
      font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .16em;
      color: #FF9B50;
    }
    h1 { margin-top: .5rem; font-size: clamp(2.2rem, 6vw, 3.4rem); font-weight: 900; }
    .lead { margin-top: 1rem; color: rgba(245,245,247,.68); line-height: 1.9; }
    .head .btn { margin-top: 1.75rem; }
    .body-section { padding: 72px 0 96px; background: var(--background); }
    .cols { display: grid; gap: 3rem; @media (min-width: 1024px) { grid-template-columns: 1fr 1fr; } }
    h2 { font-size: 1.4rem; font-weight: 900; margin-bottom: 1.25rem; }
    .coach-list, .schedule-list { display: grid; gap: .75rem; }
    .coach-list a {
      display: flex; align-items: center; gap: 1rem;
      border: 1px solid var(--border); border-radius: 18px; background: var(--card);
      padding: 1rem 1.25rem;
      transition: border-color 160ms var(--ease-out);
      &:hover { border-color: rgba(255,64,129,.4); }
      .mini-avatar {
        display: grid; place-items: center;
        width: 2.75rem; height: 2.75rem; border-radius: 12px; flex-shrink: 0;
        background: linear-gradient(135deg, rgba(255,122,0,.3), rgba(255,64,129,.3), rgba(138,43,226,.3));
        font-weight: 900;
      }
      .names { flex: 1; }
      .names strong { display: block; }
      .names small { color: var(--muted-foreground); font-size: .76rem; }
    }
    .schedule-list li {
      display: grid; grid-template-columns: 90px 1fr auto; gap: 1rem; align-items: center;
      border: 1px solid var(--border); border-radius: 18px; background: var(--card);
      padding: 1rem 1.25rem;
      .when strong { display: block; font-size: 1.05rem; font-weight: 900; }
      .when small, .what small { color: var(--muted-foreground); font-size: .74rem; }
      .what strong { display: block; font-size: .92rem; }
      .seats { font-size: .74rem; font-weight: 700; color: #FFB36B; &.full { color: #fca5a5; } }
    }
  `,
})
export class ActivityDetailComponent {
  protected readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly publicService = inject(PublicService);
  private readonly toast = inject(ToastService);

  protected readonly leadOpen = signal(false);
  protected readonly slug = signal(this.route.snapshot.paramMap.get('slug') ?? '');

  protected readonly loader = createLoader(() => this.publicService.activity(this.slug()), null);
  protected readonly activity = computed(() => this.loader.data());

  protected readonly coachesLoader = createLoader<Coach[]>(() => this.publicService.coaches(), []);
  protected readonly coaches = computed(() => {
    const all = this.coachesLoader.data();
    const current = this.activity();
    if (!current) return [];
    return all.filter((c) => (c.activities ?? []).some((a) => a.id === current.id || a.nameEn === current.nameEn));
  });

  protected readonly scheduleLoader = createLoader<ScheduleEntry[]>(() => this.publicService.schedule(), []);
  protected readonly schedule = computed(() => {
    const all = this.scheduleLoader.data();
    const current = this.activity();
    if (!current) return [];
    return all
      .filter((s) => s.activityId === current.id || s.activityNameEn === current.nameEn)
      .slice(0, 5);
  });

  protected nameOf(s: ScheduleEntry): string {
    return this.i18n.pick((s.activity ?? { nameAr: s.activityNameAr, nameEn: s.activityNameEn }) as Record<string, unknown>) || '—';
  }

  protected coachOf(s: ScheduleEntry): string {
    return this.i18n.pick((s.coach ?? { nameAr: s.coachNameAr, nameEn: s.coachNameEn }) as Record<string, unknown>) || '—';
  }

  protected seatsLabel(n: number): string {
    if (n <= 0) return this.i18n.t('schedulePage.seatsFull');
    if (n === 1) return this.i18n.t('schedulePage.seatsOne');
    if (n === 2) return this.i18n.t('schedulePage.seatsTwo');
    return this.i18n.t('schedulePage.seatsFew', { n });
  }

  protected initials(c: Coach): string {
    const name = this.i18n.pick(c);
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
  }
}
