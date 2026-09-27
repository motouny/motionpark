import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { MembershipPlan } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { EmptyComponent } from '../../../shared/empty.component';
import { ErrorStateComponent } from '../../../shared/error-state.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { ToastService } from '../../../shared/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingComponent, EmptyComponent, ErrorStateComponent],
  template: `
    <div class="admin-page-head"><div><h1>{{ i18n.t('admin.membershipPlans') }}</h1></div></div>
    <p style="color: var(--muted-foreground); margin-bottom: 1rem;">Price &amp; VAT are managed in Odoo and synced — only display, sorting and featuring are edited here.</p>
    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else if (items().length === 0) {
      <app-empty [message]="i18n.t('common.noResults')" />
    } @else {
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>{{ i18n.t('common.name') }}</th><th>Price</th><th>Odoo ID</th><th>Featured</th><th>{{ i18n.t('common.status') }}</th><th class="table-actions">{{ i18n.t('common.actions') }}</th></tr></thead>
          <tbody>
            @for (p of items(); track p.id) {
              <tr>
                <td><strong>{{ p.nameEn }}</strong><br /><small style="color: var(--muted-foreground)">{{ p.nameAr }}</small></td>
                <td>{{ p.price }} {{ p.currency }}</td>
                <td>{{ p.odooProductId ?? '-' }}</td>
                <td>{{ p.featured ? '★' : '' }}</td>
                <td><span class="chip" [class]="'chip chip-' + (p.active ? 'success' : 'muted')">{{ p.active ? i18n.t('common.active') : i18n.t('common.inactive') }}</span></td>
                <td><div class="table-actions">
                  <button class="btn btn-ghost btn-sm" (click)="toggleFeatured(p)">{{ p.featured ? 'Unfeature' : 'Feature' }}</button>
                </div></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class MembershipPlansAdminComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly admin = inject(AdminService);
  protected readonly toast = inject(ToastService);

  protected readonly loader = createLoader<MembershipPlan[]>(
    () => this.admin.membershipPlans().pipe(catchError(() => of([] as MembershipPlan[]))),
    [],
  );
  protected readonly items = computed(() => this.loader.data());

  protected toggleFeatured(p: MembershipPlan): void {
    this.admin.updateMembershipPlan(p.id, { featured: !p.featured }).subscribe({
      next: () => { this.toast.success(this.i18n.t('common.saved')); this.loader.reload(); },
      error: () => this.toast.error(this.i18n.t('common.error')),
    });
  }
}
