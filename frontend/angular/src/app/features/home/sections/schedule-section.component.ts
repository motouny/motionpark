import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';
import { PublicService } from '../../../services/public.service';
import { CmsTextPipe } from '../../../shared/cms-text.pipe';
import { IconComponent } from '../../../shared/icon.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { EmptyComponent } from '../../../shared/empty.component';
import { createLoader } from '../../../core/loader';
import { ScheduleEntry } from '../../../models';
import { localDate } from '../../../core/dates';
import { LeadDialogComponent } from '../../../shared/lead-dialog.component';

/** Day pill model for the homepage schedule preview. */
export interface DayOption {
  key: string;
  date: string;
  label: string;
}

@Component({
  selector: 'app-schedule-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LeadDialogComponent, RouterLink, IconComponent, LoadingComponent, EmptyComponent],
  template: `
    <section id="schedule" class="schedule-section">
      <div class="glow" aria-hidden="true"></div>
      <div class="container inner">
        <div class="head">
          <p class="eyebrow">{{ i18n.t('homeSchedule.eyebrow') }}</p>
          <h2>
            {{ i18n.t('homeSchedule.titleA') }}<br />{{ i18n.t('homeSchedule.titleB') }}
          </h2>
          <p class="sub">{{ i18n.t('homeSchedule.subtitle') }}</p>
          <div class="day-pills" role="tablist" [attr.aria-label]="i18n.t('nav.schedule')">
            @for (day of days(); track day.key) {
              <button
                role="tab"
                [attr.aria-selected]="activeDay() === day.key"
                class="day-pill"
                [class.active]="activeDay() === day.key"
                (click)="selectDay(day)"
              >
                {{ day.label }}
              </button>
            }
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <span>{{ i18n.t('homeSchedule.scheduleFor', { day: activeLabel() }) }}</span>
            <a routerLink="/schedule" class="cal-link">
              {{ i18n.t('homeSchedule.viewCalendar') }}
              <app-icon name="calendar" size="0.9rem" />
            </a>
          </div>

          @if (loader.loading()) {
            <app-loading [label]="i18n.t('common.loading')" />
          } @else if (loader.error()) {
            <app-empty [message]="i18n.t('common.error')" />
          } @else if (entries().length === 0) {
            <div class="soon">
              <app-icon name="calendar" size="1.6rem" />
              <strong>{{ i18n.t('homeSchedule.soonTitle') }}</strong>
              <p>{{ i18n.t('homeSchedule.soonText') }}</p>
              <button class="btn gradient-button" (click)="openTrial()">{{ i18n.t('nav.bookTrial') }}</button>
            </div>
          } @else {
            <ul class="class-list">
              @for (entry of entries(); track entry.id) {
                <li class="class-row">
                  <div class="time-col">
                    <strong>{{ entry.startTime }}</strong>
                    <span>{{ locationOf(entry) }}</span>
                  </div>
                  <div class="info-col">
                    <strong>{{ activityName(entry) }}</strong>
                    <span>{{ i18n.t('schedulePage.coach') }} {{ coachName(entry) }}</span>
                  </div>
                  <div class="action-col">
                    <span class="seats" [class.full]="entry.seatsLeft <= 0">{{ seatsLabel(entry.seatsLeft) }}</span>
                    <button class="book-btn" (click)="book(entry)">{{ i18n.t('homeSchedule.book') }}</button>
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </div>
    </section>

    <app-lead-dialog [interest]="leadInterest()" [isOpen]="leadOpen()" (close)="leadOpen.set(false)" />
  `,
  styles: `
    .soon {
      display: grid; justify-items: center; gap: .75rem;
      padding: 2.5rem 1.5rem; text-align: center;
      color: var(--mp-muted);
      app-icon { color: var(--mp-orange); }
      strong { font-size: 1.15rem; color: var(--mp-white); }
      p { max-width: 360px; font-size: 1rem; }
      .btn { margin-top: .5rem; }
    }
    .schedule-section { position: relative; overflow: hidden; background: var(--schedule-surface); padding: 96px 0; }
    .glow {
      position: absolute; top: 4rem; inset-inline-end: -8rem;
      width: 18rem; height: 18rem; border-radius: 50%;
      background: rgba(138, 43, 226, .15); filter: blur(100px);
    }
    .inner { position: relative; display: grid; gap: 2.5rem; }
    @media (min-width: 1024px) {
      .inner { grid-template-columns: .82fr 1.18fr; align-items: end; }
    }
    h2 { margin-top: 1rem; font-size: clamp(1.9rem, 4.5vw, 3rem); font-weight: 900; line-height: 1.2; }
    .sub { margin-top: 1.25rem; max-width: 420px; color: rgba(245,245,247,.62); line-height: 1.9; }
    .day-pills { margin-top: 2rem; display: flex; flex-wrap: wrap; gap: .5rem; }
    .day-pill {
      border-radius: 9999px; padding: .6rem 1.1rem;
      font-size: .88rem; font-weight: 700;
      border: 1px solid rgba(245,245,247,.15);
      color: rgba(245,245,247,.65);
      transition: all 160ms var(--ease-out);
      &:hover { border-color: rgba(245,245,247,.4); }
      &.active { background: #fff; color: #1A1A1A; border-color: #fff; }
    }
    .panel {
      border-radius: 28px; border: 1px solid rgba(245,245,247,.1);
      background: rgba(245,245,247,.045);
      padding: .75rem;
      box-shadow: 0 24px 80px rgba(0,0,0,.28);
      backdrop-filter: blur(4px);
    }
    .panel-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: .6rem .6rem .8rem; font-size: .9rem; font-weight: 700;
    }
    .cal-link { color: #FF9B50; font-size: .78rem; font-weight: 700; display: inline-flex; align-items: center; gap: .3rem; }
    .class-list { display: grid; gap: .5rem; }
    .class-row {
      display: grid; gap: .9rem;
      border-radius: 18px; border: 1px solid transparent;
      background: var(--card); padding: 1rem 1.1rem;
      transition: border-color 180ms var(--ease-out);
      &:hover { border-color: rgba(255, 64, 129, .45); }
      @media (min-width: 640px) { grid-template-columns: 100px 1fr auto; align-items: center; }
    }
    .time-col strong { font-size: 1.1rem; font-weight: 900; display: block; }
    .time-col span, .info-col span { font-size: .74rem; color: rgba(245,245,247,.45); display: block; margin-top: .2rem; }
    .info-col strong { font-weight: 700; }
    .action-col { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .seats { font-size: .74rem; font-weight: 700; color: #FFB36B; &.full { color: #fca5a5; } }
    .book-btn {
      border-radius: 9999px; border: 1px solid rgba(245,245,247,.18);
      padding: .45rem 1rem; font-size: .76rem; font-weight: 700;
      transition: all 160ms var(--ease-out);
      &:hover { border-color: var(--primary); background: var(--primary); }
    }
  `,
})
export class ScheduleSectionComponent {
  protected readonly i18n = inject(I18nService);
  private readonly publicService = inject(PublicService);

  @Input() content: Record<string, unknown> | null | undefined = null;

  protected readonly activeDay = signal('');
  protected readonly activeLabel = signal('');

  protected readonly days = computed(() => this.buildDays());

  protected readonly loader = createLoader<ScheduleEntry[]>(
    () => this.publicService.schedule(undefined, this.activeDay() || undefined),
    [],
  );

  /** Only real classes are listed; a day with none published invites a trial request instead. */
  protected readonly entries = computed(() => this.loader.data());

  constructor() {
    this.selectDay(this.days()[0]);
  }

  protected selectDay(day: DayOption): void {
    this.activeDay.set(day.date);
    this.activeLabel.set(day.label);
    this.loader.reload();
  }

  protected activityName(entry: ScheduleEntry): string {
    return this.i18n.pick((entry.activity ?? { nameAr: entry.activityNameAr, nameEn: entry.activityNameEn })) || '—';
  }

  protected coachName(entry: ScheduleEntry): string {
    return this.i18n.pick((entry.coach ?? { nameAr: entry.coachNameAr, nameEn: entry.coachNameEn })) || '—';
  }

  protected locationOf(entry: ScheduleEntry): string {
    return this.i18n.pick((entry.branch ?? { nameAr: entry.branchNameAr, nameEn: entry.branchNameEn })) || '';
  }

  protected seatsLabel(n: number): string {
    if (n <= 0) return this.i18n.t('homeSchedule.seatsFull');
    if (n === 1) return this.i18n.t('homeSchedule.seatsOne');
    if (n === 2) return this.i18n.t('homeSchedule.seatsTwo');
    return this.i18n.t('homeSchedule.seatsFew', { n });
  }

  protected readonly leadOpen = signal(false);
  protected readonly leadInterest = signal<string | null>(null);

  /** Visitors book through the "start today" form; members book from the full schedule page. */
  protected openTrial(): void {
    this.leadInterest.set(null);
    this.leadOpen.set(true);
  }

  protected book(entry: ScheduleEntry): void {
    this.leadInterest.set(this.activityName(entry));
    this.leadOpen.set(true);
  }

  private buildDays(): DayOption[] {
    const days: DayOption[] = [];
    const fmt = new Intl.DateTimeFormat(this.i18n.lang() === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long' });
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const label = i === 0
        ? this.i18n.lang() === 'ar' ? 'اليوم' : 'Today'
        : i === 1
          ? this.i18n.lang() === 'ar' ? 'غداً' : 'Tomorrow'
          : fmt.format(d);
      days.push({ key: d.toISOString(), date: localDate(d), label });
    }
    return days;
  }
}
