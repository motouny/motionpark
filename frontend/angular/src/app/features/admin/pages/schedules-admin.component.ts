import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { ScheduleEntry } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { EmptyComponent } from '../../../shared/empty.component';
import { ErrorStateComponent } from '../../../shared/error-state.component';
import { IconComponent } from '../../../shared/icon.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { ToastService } from '../../../shared/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, LoadingComponent, EmptyComponent, ErrorStateComponent],
  template: `
    <div class="admin-page-head"><div><h1>{{ i18n.t('admin.schedules') }}</h1></div></div>
    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else if (items().length === 0) {
      <app-empty [message]="i18n.t('common.noResults')" />
    } @else {
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>{{ i18n.t('common.date') }}</th><th>Time</th><th>Activity</th><th>Coach</th><th>{{ i18n.t('common.status') }}</th><th class="table-actions">{{ i18n.t('common.actions') }}</th></tr></thead>
          <tbody>
            @for (s of items(); track s.id) {
              <tr>
                <td>{{ s.date }}</td>
                <td>{{ s.startTime }} - {{ s.endTime }}</td>
                <td>{{ s.activityNameEn ?? s.activity?.nameEn ?? s.activityId ?? '-' }}</td>
                <td>{{ s.coachNameEn ?? s.coach?.nameEn ?? '-' }}</td>
                <td><span class="chip chip-success">{{ i18n.t('common.active') }}</span></td>
                <td><div class="table-actions">
                  <button class="icon-btn danger" (click)="remove(s)" [attr.aria-label]="i18n.t('common.delete')"><app-icon name="trash" size="0.9rem" /></button>
                </div></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class SchedulesAdminComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly admin = inject(AdminService);
  protected readonly toast = inject(ToastService);

  protected readonly loader = createLoader<ScheduleEntry[]>(
    () => this.admin.schedules().pipe(catchError(() => of([] as ScheduleEntry[]))),
    [],
  );
  protected readonly items = computed(() => this.loader.data());

  protected remove(s: ScheduleEntry): void {
    if (!window.confirm(this.i18n.t('common.deleteConfirmBody'))) return;
    this.admin.deleteSchedule(s.id).subscribe({
      next: () => { this.toast.success(this.i18n.t('common.deleted')); this.loader.reload(); },
      error: () => this.toast.error(this.i18n.t('common.error')),
    });
  }
}
