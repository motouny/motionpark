import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { HomepageSection } from '../../models';
import { AdminService } from '../../services/admin.service';
import { EmptyComponent } from '../../shared/empty.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';
import { ToastService } from '../../shared/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, LoadingComponent, EmptyComponent, ErrorStateComponent],
  template: `
    <div class="admin-page-head"><div><h1>{{ i18n.t('admin.homepageSections') }}</h1></div></div>
    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else if (items().length === 0) {
      <app-empty [message]="i18n.t('common.noResults')" />
    } @else {
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>{{ i18n.t('common.name') }}</th><th>{{ i18n.t('common.status') }}</th><th class="table-actions">{{ i18n.t('common.actions') }}</th></tr></thead>
          <tbody>
            @for (s of items(); track s.id) {
              <tr>
                <td><strong>{{ s.type }}</strong><br /><small style="color: var(--muted-foreground)">#{{ s.sortOrder }}</small></td>
                <td><span class="chip" [class]="'chip chip-' + (s.enabled ? 'success' : 'muted')">{{ s.enabled ? i18n.t('common.active') : i18n.t('common.inactive') }}</span></td>
                <td>
                  <div class="table-actions">
                    <button class="icon-btn" (click)="move(s, -1)" aria-label="up">↑</button>
                    <button class="icon-btn" (click)="move(s, 1)" aria-label="down">↓</button>
                    <button class="btn btn-ghost btn-sm" (click)="toggle(s)">{{ s.enabled ? i18n.t('common.inactive') : i18n.t('common.active') }}</button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class HomepageSectionsComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly admin = inject(AdminService);
  protected readonly toast = inject(ToastService);

  protected readonly loader = createLoader<HomepageSection[]>(
    () => this.admin.homepageSections().pipe(catchError(() => of([] as HomepageSection[]))),
    [],
  );
  protected readonly items = computed(() => this.loader.data());

  protected toggle(s: HomepageSection): void {
    this.persist(items => items.map(i => (i.id === s.id ? { ...i, enabled: !i.enabled } : i)));
  }

  protected move(s: HomepageSection, dir: -1 | 1): void {
    const arr = [...this.items()];
    const idx = arr.findIndex(i => i.id === s.id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= arr.length) return;
    const other = arr[target];
    const a = { ...s, sortOrder: other.sortOrder };
    const b = { ...other, sortOrder: s.sortOrder };
    this.persist(items => items.map(i => (i.id === a.id ? a : i.id === b.id ? b : i)));
  }

  private persist(mutate: (items: HomepageSection[]) => HomepageSection[]): void {
    const next = mutate([...this.items()]).sort((x, y) => x.sortOrder - y.sortOrder);
    this.admin.updateHomepageSections(next).subscribe({
      next: () => { this.toast.success(this.i18n.t('common.saved')); this.loader.reload(); },
      error: () => this.toast.error(this.i18n.t('common.error')),
    });
  }
}
