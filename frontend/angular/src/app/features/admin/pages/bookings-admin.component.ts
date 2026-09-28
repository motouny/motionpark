import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { normalizeHttpError } from '../../../core/errors';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { Booking } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { EmptyComponent } from '../../../shared/empty.component';
import { ErrorStateComponent } from '../../../shared/error-state.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { ToastService } from '../../../shared/toast.service';

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
          <thead>
            <tr>
              <th>{{ i18n.t('common.date') }}</th>
              <th>{{ i18n.t('account.bookings.schedule') }}</th>
              <th>{{ i18n.t('admin.member') }}</th>
              <th>{{ i18n.t('common.status') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (b of items(); track b.id) {
              <tr>
                <td>{{ b.schedule?.date ?? '—' }} <small>{{ b.schedule?.startTime ?? '' }}</small></td>
                <td>
                  <strong>{{ i18n.pick(b.schedule, 'activityNameAr', 'activityNameEn') || '—' }}</strong><br />
                  <small style="color: var(--muted-foreground)">{{ i18n.pick(b.schedule, 'branchNameAr', 'branchNameEn') }}</small>
                </td>
                <td>{{ b.customerName || '—' }}<br /><small dir="ltr" style="color: var(--muted-foreground)">{{ b.customerPhone }}</small></td>
                <td>
                  @if (b.allowedStatuses?.length) {
                    <select class="form-select" [disabled]="saving() === b.id" (change)="setStatus(b, $event)">
                      <option [value]="b.status" selected>{{ statusLabel(b.status) }}</option>
                      @for (s of b.allowedStatuses; track s) { <option [value]="s">{{ statusLabel(s) }}</option> }
                    </select>
                  } @else {
                    <span class="chip chip-muted">{{ statusLabel(b.status) }}</span>
                  }
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
  protected readonly saving = signal<string | null>(null);

  protected readonly loader = createLoader<Booking[]>(
    () => this.admin.bookings().pipe(catchError(() => of([] as Booking[]))),
    [],
  );
  protected readonly items = computed(() => this.loader.data());

  protected setStatus(b: Booking, ev: Event): void {
    const select = ev.target as HTMLSelectElement;
    const status = select.value;
    if (status === b.status) return;
    this.saving.set(b.id);
    this.admin.updateBookingStatus(b.id, status).subscribe({
      next: () => { this.saving.set(null); this.toast.success(this.i18n.t('common.saved')); this.loader.reload(); },
      error: (err: unknown) => {
        this.saving.set(null);
        select.value = b.status;
        this.toast.error(this.i18n.t('common.error'), normalizeHttpError(err).message);
      },
    });
  }

  protected statusLabel(status: string): string {
    const key = `account.status.${status.toLowerCase()}`;
    const value = this.i18n.t(key);
    return value === key ? status : value;
  }
}
