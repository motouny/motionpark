import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { AuditLogEntry } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { EmptyComponent } from '../../../shared/empty.component';
import { ErrorStateComponent } from '../../../shared/error-state.component';
import { LoadingComponent } from '../../../shared/loading.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JsonPipe, LoadingComponent, EmptyComponent, ErrorStateComponent],
  template: `
    <div class="admin-page-head"><div><h1>{{ i18n.t('admin.auditLogs') }}</h1></div></div>
    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else if (items().length === 0) {
      <app-empty [message]="i18n.t('common.noResults')" />
    } @else {
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>{{ i18n.t('common.date') }}</th><th>Entity</th><th>Action</th><th>User</th><th>Changes</th></tr></thead>
          <tbody>
            @for (a of items(); track a.id) {
              <tr>
                <td>{{ a.createdAt ?? '-' }}</td>
                <td>{{ a.entity ?? '-' }} <small style="color: var(--muted-foreground)">{{ a.entityId ?? '' }}</small></td>
                <td>{{ a.action ?? '-' }}</td>
                <td>{{ a.userName ?? a.userId ?? '-' }}</td>
                <td><code style="font-size: 0.75rem; max-width: 320px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ a.changes ?? null | json }}</code></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class AuditLogsComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly admin = inject(AdminService);

  protected readonly loader = createLoader<AuditLogEntry[]>(
    () => this.admin.auditLogs().pipe(catchError(() => of([] as AuditLogEntry[]))),
    [],
  );
  protected readonly items = computed(() => this.loader.data());
}
