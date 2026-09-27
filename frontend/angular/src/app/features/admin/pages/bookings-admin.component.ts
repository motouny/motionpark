import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { Booking } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { EmptyComponent } from '../../../shared/empty.component';
import { ErrorStateComponent } from '../../../shared/error-state.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { ToastService } from '../../../shared/toast.service';

const STATUSES = ['Reserved', 'Confirmed', 'CheckedIn', 'Cancelled', 'NoShow', 'WaitingList'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingComponent, EmptyComponent, ErrorStateComponent],
  template: `
    <div class="admin-page-head"><div><h1>{{ i18n.t('admin.bookings') }}</h1></div></div>
    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else if (items().length === 0) {
      <app-empty [message]="i18n.t('common.noResults')" />
    } @else {
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>{{ i18n.t('common.date') }}</th><th>Activity</th><th>Member</th><th>{{ i18n.t('common.status') }}</th></tr></thead>
          <tbody>
            @for (b of items(); track b.id) {
              <tr>
                <td>{{ b.scheduleDate ?? b.schedule?.date ?? '-' }} {{ b.startTime ?? b.schedule?.startTime ?? '' }}</td>
                <td>{{ b.activity?.nameEn ?? b.schedule?.activity?.nameEn ?? '-' }}</td>
                <td>{{ b.branch?.nameEn ?? b.schedule?.branch?.nameEn ?? '-' }}</td>
                <td>
                  <select class="form-select" [value]="b.status" (change)="setStatus(b, $event)">
                    @for (s of statuses; track s) { <option [value]="s" [selected]="s === b.status">{{ s }}</option> }
                  </select>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class BookingsAdminComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly admin = inject(AdminService);
  protected readonly toast = inject(ToastService);
  protected readonly statuses = STATUSES;

  protected readonly loader = createLoader<Booking[]>(
    () => this.admin.bookings().pipe(catchError(() => of([] as Booking[]))),
    [],
  );
  protected readonly items = computed(() => this.loader.data());

  protected setStatus(b: Booking, ev: Event): void {
    const status = (ev.target as HTMLSelectElement).value;
    this.admin.updateBookingStatus(b.id, status).subscribe({
      next: () => { this.toast.success(this.i18n.t('common.saved')); this.loader.reload(); },
      error: () => this.toast.error(this.i18n.t('common.error')),
    });
  }
}
