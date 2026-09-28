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
import { ErrorStateComponent } from '../../shared/error-state.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, IconComponent, LoadingComponent, EmptyComponent, ErrorStateComponent],
  template: `
    @if (loader.loading()) {
      <div style="min-height: 60vh; display: grid; place-items: center;"><app-loading /></div>
    } @else if (!coach()) {
      <section class="page-band"><div class="container"><app-error-state [message]="i18n.t('common.notFoundBody')" [showRetry]="false" /></div></section>
    } @else {
      <section class="detail-band">
        <div class="glow" aria-hidden="true"></div>
        <div class="container inner">
          <a routerLink="/coaches" class="back-link">
            <app-icon name="arrow-start" size="1rem" />
            {{ i18n.t('nav.coaches') }}
          </a>
          <div class="head">
            <span class="avatar" aria-hidden="true">
              @if (coach()!.photoUrl) {
                <img [src]="coach()!.photoUrl" [alt]="i18n.pick(coach()!)" />
              } @else {
                <span class="initials">{{ initials(coach()!) }}</span>
              }
            </span>
            <div>
              <h1>{{ i18n.pick(coach()!) }}</h1>
              <p class="lead">{{ i18n.pick(coach()!, 'bioAr', 'bioEn') }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="body-section">
        <div class="container cols">
          <div class="card">
            <h2>{{ i18n.t('coachesPage.certifications') }}</h2>
            @if ((coach()!.certifications ?? []).length === 0) {
              <p class="muted">—</p>
            } @else {
              <ul class="certs">
                @for (c of coach()!.certifications ?? []; track c) {
                  <li><app-icon name="check" size="0.85rem" /> {{ c }}</li>
                }
              </ul>
            }
            <h2>{{ i18n.t('coachesPage.activities') }}</h2>
            @if ((coach()!.activities ?? []).length === 0) {
              <p class="muted">—</p>
            } @else {
              <ul class="certs">
                @for (a of coach()!.activities ?? []; track a.id) {
                  <li><app-icon name="sparkles" size="0.85rem" /> {{ i18n.pick(a) }}</li>
                }
              </ul>
            }
            <h2>{{ i18n.t('coachesPage.branches') }}</h2>
            @if ((coach()!.branches ?? []).length === 0) {
              <p class="muted">—</p>
            } @else {
              <ul class="certs">
                @for (b of coach()!.branches ?? []; track b.id) {
                  <li><app-icon name="map-pin" size="0.85rem" /> {{ i18n.pick(b) }}</li>
                }
              </ul>
            }
          </div>

          <div class="card">
            <h2>{{ i18n.t('activitiesPage.scheduleTitle') }}</h2>
            @if (schedule().length === 0) {
              <app-empty [message]="i18n.t('schedulePage.empty')" />
            } @else {
              <ul class="sched">
                @for (s of schedule(); track s.id) {
                  <li>
                    <strong>{{ s.startTime }}</strong>
                    <span>{{ activityName(s) }}</span>
                    <small>{{ s.date | date: 'mediumDate' }}</small>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      </section>
    }
  `,
  styles: `
    .detail-band {
      position: relative; overflow: hidden; padding: 150px 0 72px;
      background:
        radial-gradient(circle at 80% 30%, rgba(138,43,226,.2), transparent 40%),
        var(--background);
      .glow { position: absolute; inset-inline-end: -6rem; top: 8rem; width: 20rem; height: 20rem; border-radius: 50%; background: rgba(255,64,129,.14); filter: blur(90px); }
    }
    .inner { position: relative; }
    .back-link { display: inline-flex; align-items: center; gap: .5rem; font-size: .88rem; font-weight: 700; color: rgba(245,245,247,.6); &:hover { color: #fff; } }
    .head { margin-top: 1.75rem; display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
    .avatar {
      width: 96px; height: 96px; border-radius: 28px; overflow: hidden;
      display: grid; place-items: center;
      background: linear-gradient(135deg, rgba(255,122,0,.4), rgba(255,64,129,.4), rgba(138,43,226,.4));
      img { width: 100%; height: 100%; object-fit: cover; }
      .initials { font-size: 2rem; font-weight: 900; color: #fff; }
    }
    h1 { font-size: clamp(2rem, 5vw, 3rem); font-weight: 900; }
    .lead { margin-top: .5rem; max-width: 560px; color: rgba(245,245,247,.68); line-height: 1.85; }
    .body-section { padding: 72px 0 96px; background: var(--background); }
    .cols { display: grid; gap: 1.5rem; @media (min-width: 1024px) { grid-template-columns: 1fr 1fr; align-items: start; } }
    .card { padding: 2rem; }
    h2 { font-size: 1.15rem; font-weight: 900; margin-bottom: 1rem; &:not(:first-child) { margin-top: 1.75rem; } }
    .muted { color: var(--muted-foreground); }
    .certs { display: grid; gap: .6rem; }
    .certs li { display: flex; align-items: center; gap: .55rem; color: rgba(245,245,247,.8); font-size: .92rem; }
    .sched { display: grid; gap: .75rem; }
    .sched li {
      display: grid; grid-template-columns: 70px 1fr auto; gap: 1rem; align-items: center;
      border: 1px solid var(--border); border-radius: 14px; padding: .9rem 1.1rem;
      strong { font-weight: 900; }
      small { color: var(--muted-foreground); }
    }
  `,
})
export class CoachDetailComponent {
  protected readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly publicService = inject(PublicService);

  protected readonly slug = signal(this.route.snapshot.paramMap.get('slug') ?? '');

  protected readonly loader = createLoader(() => this.publicService.coach(this.slug()), null);
  protected readonly coach = computed(() => this.loader.data());

  protected readonly scheduleLoader = createLoader<ScheduleEntry[]>(() => this.publicService.schedule(), []);
  protected readonly schedule = computed(() => {
    const all = this.scheduleLoader.data();
    const current = this.coach();
    if (!current) return [];
    return all.filter((s) => s.coachId === current.id || s.coachNameEn === current.nameEn).slice(0, 6);
  });

  protected activityName(s: ScheduleEntry): string {
    return this.i18n.pick((s.activity ?? { nameAr: s.activityNameAr, nameEn: s.activityNameEn }) as Record<string, unknown>) || '—';
  }

  protected initials(c: Coach): string {
    const name = this.i18n.pick(c);
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
  }
}
