import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { Role } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { EmptyComponent } from '../../../shared/empty.component';
import { ErrorStateComponent } from '../../../shared/error-state.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { ToastService } from '../../../shared/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JsonPipe, LoadingComponent, EmptyComponent, ErrorStateComponent],
  template: `
    <div class="admin-page-head"><div><h1>{{ i18n.t('admin.roles') }}</h1></div></div>
    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else if (items().length === 0) {
      <app-empty [message]="i18n.t('common.noResults')" />
    } @else {
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>{{ i18n.t('common.name') }}</th><th>Permissions</th></tr></thead>
          <tbody>
            @for (r of items(); track r.id) {
              <tr>
                <td><strong>{{ r.name }}</strong></td>
                <td><code style="font-size: 0.8rem;">{{ r.permissions ?? [] | json }}</code></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class RolesAdminComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly admin = inject(AdminService);
  protected readonly toast = inject(ToastService);

  protected readonly loader = createLoader<Role[]>(
    () => this.admin.roles().pipe(catchError(() => of([] as Role[]))),
    [],
  );
  protected readonly items = computed(() => this.loader.data());
}
