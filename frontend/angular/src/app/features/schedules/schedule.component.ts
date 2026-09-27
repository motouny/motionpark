import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { createLoader } from '../../core/loader';
import { normalizeHttpError } from '../../core/errors';
import { AuthStore } from '../../core/auth.store';
import { I18nService } from '../../i18n/i18n.service';
import { Branch, ScheduleEntry } from '../../models';
import { BookingService, newIdempotencyKey } from '../../services/booking.service';
import { PublicService } from '../../services/public.service';
import { EmptyComponent } from '../../shared/empty.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';
import { ToastService } from '../../shared/toast.service';
import { BookingDialogComponent } from '../booking/booking-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, IconComponent, LoadingComponent, EmptyComponent, ErrorStateComponent, BookingDialogComponent,
  ],
  template: `
    <section class="page-band">
      <div class="container">
        <p class="eyebrow">{{ i18n.t('nav.schedule') }}</p>
        <h1>{{ i18n.t('schedulePage.title') }}</h1>
        <p class="lead">{{ i18n.t('schedulePage.lead') }}</p>
      </div>
    </section>

    <section class="schedule-body">
      <div class="container">
        <div class="filters">
          <div class="day-pills" role="tablist">
            @for (day of days(); track day.date) {
              <button
                role="tab"
                [attr.aria-selected]="activeDay() === day.date"
                class="day-pill"
                [class.active]="activeDay() === day.date"
                (click)="selectDay(day.date)"
              >
                <small>{{ day.weekday }}</small>
                <strong>{{ day.dayNum }}</strong>
              </button>
            }
          </div>
          <label class="branch-filter">
            <span class="visually-hidden">{{ i18n.t('schedulePage.chooseBranch') }}</span>
            <select class="form-select" [value]="activeBranch()" (change)="selectBranch($any($event.target).value)">
              <option value="">{{ i18n.t('schedulePage.allBranches') }}</option>
              @for (b of branches(); track b.id) {
                <option [value]="b.id">{{ i18n.pick(b) }}</option>
              }
            </select>
          </label>
        </div>

        @if (loader.loading()) {
          <app-loading [label]="i18n.t('common.loading')" />
        } @else if (loader.error()) {
          <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
        } @else if (entries().length === 0) {
          <app-empty [message]="i18n.t('schedulePage.empty')" />
        } @else {
          <ul class="class-list">
            @for (entry of entries(); track entry.id) {
              <li class="class-row">
                <div class="time-block">
                  <strong>{{ entry.startTime }}</strong>
                  <span>{{ entry.endTime }}</span>
                </div>
                <div class="class-info">
                  <h3>{{ nameOf(entry) }}</h3>
                  <p>
                    <span><app-icon name="user" size="0.85rem" /> {{ coachOf(entry) }}</span>
                    <span><app-icon name="map-pin" size="0.85rem" /> {{ locationOf(entry) }}</span>
                    @if (entry.ageMin != null || entry.ageMax != null) {
                      <span><app-icon name="users" size="0.85rem" /> {{ ageLabel(entry) }}</span>
                    }
                  </p>
                </div>
                <div class="book-col">
                  <span class="seats" [class.full]="entry.seatsLeft <= 0">{{ seatsLabel(entry.seatsLeft) }}</span>
                  <button class="book-btn" [disabled]="entry.seatsLeft <= 0" (click)="startBooking(entry)">
                    {{ entry.seatsLeft <= 0 ? i18n.t('schedulePage.full') : i18n.t('schedulePage.book') }}
                  </button>
                </div>
              </li>
            }
          </ul>
        }
      </div>
    </section>

    <app-booking-dialog
      [entry]="pendingEntry()"
      (confirm)="confirmBooking()"
      (cancel)="pendingEntry.set(null)"
    />
  `,
  styles: `
    .schedule-body { padding: 56px 0 96px; background: var(--schedule-surface); min-height: 50vh; }
    .filters {
      display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between;
      margin-bottom: 2rem;
    }
    .day-pills { display: flex; gap: .5rem; overflow-x: auto; padding-bottom: .25rem; }
    .day-pill {
      display: grid; place-items: center; gap: .1rem;
      min-width: 64px; border-radius: 18px; padding: .6rem .8rem;
      border: 1px solid rgba(245,245,247,.14);
      color: rgba(245,245,247,.65);
      transition: all 160ms var(--ease-out);
      small { font-size: .68rem; }
      strong { font-size: 1.05rem; font-weight: 900; }
      &:hover { border-color: rgba(245,245,247,.4); }
      &.active { background: #fff; color: #1A1A1A; border-color: #fff; }
    }
    .branch-filter { min-width: 220px; }
    .class-list { display: grid; gap: .9rem; }
    .class-row {
      display: grid; gap: 1.1rem; align-items: center;
      grid-template-columns: 1fr;
      border-radius: 22px; border: 1px solid rgba(245,245,247,.09);
      background: var(--card); padding: 1.25rem 1.4rem;
      transition: border-color 180ms var(--ease-out);
      &:hover { border-color: rgba(255,64,129,.35); }
      @media (min-width: 860px) { grid-template-columns: 90px 1fr auto; }
    }
    .time-block {
      display: grid; place-content: center; text-align: center;
      border-radius: 16px; background: rgba(255,255,255,.05);
      padding: .7rem .5rem; min-width: 84px;
      strong { font-size: 1.2rem; font-weight: 900; }
      span { font-size: .74rem; color: var(--muted-foreground); }
    }
    .class-info h3 { font-size: 1.15rem; font-weight: 900; }
    .class-info p {
      margin-top: .5rem; display: flex; flex-wrap: wrap; gap: 1.1rem;
      color: rgba(245,245,247,.55); font-size: .85rem;
      span { display: inline-flex; align-items: center; gap: .35rem; }
    }
    .book-col { display: flex; align-items: center; gap: 1rem; justify-content: space-between; }
    .seats { font-size: .82rem; font-weight: 700; color: #FFB36B; &.full { color: #fca5a5; } }
    .book-btn {
      border-radius: 9999px; border: 1px solid rgba(245,245,247,.18);
      padding: .6rem 1.5rem; font-size: .85rem; font-weight: 800;
      transition: all 160ms var(--ease-out);
      &:hover:not(:disabled) { border-color: var(--primary); background: var(--primary); }
      &:disabled { opacity: .5; cursor: not-allowed; }
    }
  `,
})
export class ScheduleComponent {
  protected readonly i18n = inject(I18nService);
  private readonly publicService = inject(PublicService);
  private readonly bookingService = inject(BookingService);
  protected readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly activeDay = signal(this.today());
  protected readonly activeBranch = signal('');
  protected readonly pendingEntry = signal<ScheduleEntry | null>(null);
  protected readonly booking = signal(false);

  protected readonly days = computed(() => this.buildDays());

  protected readonly loader = createLoader<ScheduleEntry[]>(
    () => this.publicService.schedule(this.activeBranch() || undefined, this.activeDay()),
    [],
  );
  protected readonly entries = computed(() =>
    [...this.loader.data()].sort((a, b) => a.startTime.localeCompare(b.startTime)),
  );

  protected readonly branchesLoader = createLoader<Branch[]>(() => this.publicService.branches(), []);
  protected readonly branches = computed(() => this.branchesLoader.data().filter((b) => b.active));

  protected selectDay(date: string): void {
    this.activeDay.set(date);
    this.loader.reload();
  }

  protected selectBranch(id: string): void {
    this.activeBranch.set(id);
    this.loader.reload();
  }

  protected nameOf(entry: ScheduleEntry): string {
    return this.i18n.pick((entry.activity ?? { nameAr: entry.activityNameAr, nameEn: entry.activityNameEn }) as Record<string, unknown>) || '—';
  }

  protected coachOf(entry: ScheduleEntry): string {
    return this.i18n.pick((entry.coach ?? { nameAr: entry.coachNameAr, nameEn: entry.coachNameEn }) as Record<string, unknown>) || '—';
  }

  protected locationOf(entry: ScheduleEntry): string {
    return this.i18n.pick((entry.branch ?? { nameAr: entry.branchNameAr, nameEn: entry.branchNameEn }) as Record<string, unknown>) || '';
  }

  protected ageLabel(entry: ScheduleEntry): string {
    const min = entry.ageMin ?? 0;
    const max = entry.ageMax ?? '∞';
    return `${min} – ${max}`;
  }

  protected seatsLabel(n: number): string {
    if (n <= 0) return this.i18n.t('schedulePage.seatsFull');
    if (n === 1) return this.i18n.t('schedulePage.seatsOne');
    if (n === 2) return this.i18n.t('schedulePage.seatsTwo');
    return this.i18n.t('schedulePage.seatsFew', { n });
  }

  protected startBooking(entry: ScheduleEntry): void {
    if (!this.store.isAuthenticated()) {
      this.toast.info(this.i18n.t('schedulePage.loginToBook'));
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/schedule' } }).catch(() => undefined);
      return;
    }
    this.pendingEntry.set(entry);
  }

  protected confirmBooking(): void {
    const entry = this.pendingEntry();
    if (!entry || this.booking()) return;
    this.booking.set(true);
    this.bookingService.create(entry.id, newIdempotencyKey()).subscribe({
      next: (res) => {
        this.booking.set(false);
        this.pendingEntry.set(null);
        if (res.waitlisted || res.status === 'waitlisted') {
          this.toast.info(this.i18n.t('schedulePage.bookingWaiting'), this.nameOf(entry));
        } else {
          this.toast.success(this.i18n.t('schedulePage.bookingSuccess'), this.nameOf(entry));
        }
        this.loader.reload();
      },
      error: (err: unknown) => {
        this.booking.set(false);
        this.pendingEntry.set(null);
        const apiError = normalizeHttpError(err);
        this.toast.error(this.i18n.t('schedulePage.bookingFail'), apiError.message);
      },
    });
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private buildDays(): { date: string; weekday: string; dayNum: string }[] {
    const lang = this.i18n.lang();
    const weekdayFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short' });
    const numFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric' });
    const result: { date: string; weekday: string; dayNum: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      result.push({ date: d.toISOString().slice(0, 10), weekday: weekdayFmt.format(d), dayNum: numFmt.format(d) });
    }
    return result;
  }
}
