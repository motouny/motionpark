import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { Booking } from '../../models';
import { AccountService } from '../../services/account.service';
import { BookingService } from '../../services/booking.service';
import { EmptyComponent } from '../../shared/empty.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';
import { ToastService } from '../../shared/toast.service';

/** The API's schedule is flat (`activityNameAr`, `branchNameEn`, ...); build a `{ nameAr, nameEn }` pair from it. */
function flat(b: Booking, prefix: 'activity' | 'coach' | 'branch'): Record<string, unknown> | null {
  const s = b.schedule as Record<string, unknown> | null | undefined;
  if (!s) return null;
  return { nameAr: s[`${prefix}NameAr`], nameEn: s[`${prefix}NameEn`] };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, IconComponent, LoadingComponent, EmptyComponent, ErrorStateComponent],
  template: `
    <h2 class="page-title">{{ i18n.t('account.bookings.title') }}</h2>

    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else if (bookings().length === 0) {
      <div class="card empty-card">
        <app-icon name="calendar" size="2.4rem" />
        <p>{{ i18n.t('account.bookings.empty') }}</p>
        <a routerLink="/schedule" class="btn gradient-button">{{ i18n.t('account.bookings.bookCta') }}</a>
      </div>
    } @else {
      <div class="table-card">
        <ul class="booking-list">
          @for (b of bookings(); track b.id) {
            <li class="booking-row">
              <div class="when">
                <strong>{{ timeOf(b) }}</strong>
                <span>{{ dateOf(b) | date: 'mediumDate' }}</span>
              </div>
              <div class="what">
                <h3>{{ activityOf(b) }}</h3>
                <p>
                  @if (coachOf(b)) { <span>{{ i18n.t('schedulePage.coach') }} {{ coachOf(b) }}</span> }
                  @if (branchOf(b)) { <span>{{ branchOf(b) }}</span> }
                </p>
              </div>
              <span class="chip" [class]="'chip chip-' + statusKind(b.status)">{{ statusLabel(b.status) }}</span>
              @if (isCancellable(b)) {
                <button class="btn btn-ghost btn-sm" (click)="cancel(b)" [disabled]="cancellingId() === b.id">
                  {{ i18n.t('account.bookings.cancel') }}
                </button>
              }
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: `
    .page-title { font-size: 1.3rem; font-weight: 900; margin-bottom: 1.5rem; }
    .table-card { border: 1px solid var(--border); border-radius: 20px; background: var(--card); overflow: hidden; }
    .booking-list { display: grid; }
    .booking-row {
      display: grid; gap: 1rem; align-items: center;
      grid-template-columns: 1fr;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(245,245,247,.06);
      &:last-child { border-bottom: 0; }
      @media (min-width: 860px) { grid-template-columns: 120px 1fr auto auto; }
      .when strong { display: block; font-size: 1.05rem; font-weight: 900; }
      .when span { font-size: .8rem; color: var(--muted-foreground); }
      .what h3 { font-size: 1.05rem; font-weight: 800; }
      .what p { margin-top: .3rem; display: flex; gap: 1rem; font-size: .82rem; color: var(--muted-foreground); }
    }
    .empty-card { display: grid; justify-items: center; gap: 1rem; color: var(--muted-foreground); padding: 3.5rem 2rem; }
    .chip-success { background: rgba(34,197,94,.16); color: #4ade80; }
    .chip-warning { background: rgba(251,146,60,.16); color: #fdba74; }
    .chip-muted { background: rgba(245,245,247,.08); color: rgba(245,245,247,.75); }
    .chip-danger { background: rgba(239,68,68,.16); color: #fca5a5; }
  `,
})
export class BookingsComponent {
  protected readonly i18n = inject(I18nService);
  private readonly account = inject(AccountService);
  private readonly bookingService = inject(BookingService);
  private readonly toast = inject(ToastService);

  protected readonly cancellingId = signal<string | null>(null);

  protected readonly loader = createLoader<Booking[]>(
    () => this.account.bookings().pipe(catchError(() => of([] as Booking[]))),
    [],
  );
  protected readonly bookings = computed(() =>
    [...this.loader.data()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
  );

  protected timeOf(b: Booking): string {
    const t = b.schedule?.startTime ?? b.startTime ?? '';
    const end = b.schedule?.endTime ?? b.endTime ?? '';
    return end ? `${t} – ${end}` : t;
  }

  protected dateOf(b: Booking): string | null {
    return b.schedule?.date ?? b.scheduleDate ?? null;
  }

  protected activityOf(b: Booking): string {
    return this.i18n.pick(b.activity ?? b.schedule?.activity ?? flat(b, 'activity')) || this.i18n.t('account.bookings.schedule');
  }

  protected coachOf(b: Booking): string {
    return this.i18n.pick(b.coach ?? b.schedule?.coach ?? flat(b, 'coach'));
  }

  protected branchOf(b: Booking): string {
    return this.i18n.pick(b.branch ?? b.schedule?.branch ?? flat(b, 'branch'));
  }

  protected statusLabel(status: string): string {
    const key = `account.status.${status.toLowerCase()}`;
    const value = this.i18n.t(key);
    return value === key ? status : value;
  }

  protected statusKind(status: string): string {
    switch (status.toLowerCase()) {
      case 'confirmed': case 'reserved': case 'checkedin': case 'completed': case 'active': case 'paid': return 'success';
      case 'pending': case 'pending_payment': case 'waitlisted': case 'waitinglist': return 'warning';
      case 'noshow': return 'danger';
      case 'cancelled': case 'failed': return 'danger';
      default: return 'muted';
    }
  }

  protected isCancellable(b: Booking): boolean {
    // API statuses: Reserved, Confirmed, CheckedIn, Cancelled, NoShow, WaitingList.
    return ['reserved', 'confirmed', 'waitinglist', 'pending', 'waitlisted'].includes(b.status.toLowerCase());
  }

  protected cancel(b: Booking): void {
    if (!window.confirm(this.i18n.t('account.bookings.cancelConfirm'))) return;
    this.cancellingId.set(b.id);
    this.bookingService.cancel(b.id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.toast.success(this.i18n.t('account.bookings.cancelSuccess'));
        this.loader.reload();
      },
      error: () => this.cancellingId.set(null),
    });
  }
}
