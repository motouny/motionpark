import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { AdminSettings } from '../../models';
import { AdminService } from '../../services/admin.service';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { LoadingComponent } from '../../shared/loading.component';
import { ToastService } from '../../shared/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, LoadingComponent, ErrorStateComponent],
  template: `
    <div class="admin-page-head"><div><h1>{{ i18n.t('admin.system') }}</h1></div></div>
    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else {
      <div class="form-panel">
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="form-grid-2">
            <div><label class="form-label">defaultLanguage</label><input class="form-input" formControlName="defaultLanguage" /></div>
            <div><label class="form-label">timezone</label><input class="form-input" formControlName="timezone" /></div>
            <div><label class="form-label">currency</label><input class="form-input" formControlName="currency" /></div>
            <div><label class="form-label">maintenanceMode</label><input type="checkbox" formControlName="maintenanceMode" /></div>
          </div>
          <div class="form-actions">
            <button class="btn gradient-button" type="submit" [disabled]="saving()">{{ saving() ? i18n.t('common.saving') : i18n.t('common.save') }}</button>
          </div>
        </form>
      </div>
    }
  `,
})
export class SystemSettingsComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly admin = inject(AdminService);
  protected readonly fb = inject(FormBuilder);
  protected readonly toast = inject(ToastService);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    defaultLanguage: ['ar'],
    timezone: ['Asia/Riyadh'],
    currency: ['SAR'],
    maintenanceMode: [false],
  });

  protected readonly loader = createLoader<AdminSettings>(
    () => this.admin.settings().pipe(catchError(() => of({} as AdminSettings))),
    {},
  );

  constructor() {
    effect(() => {
      const s = this.loader.data();
      if (!s) return;
      this.form.patchValue({
        defaultLanguage: String(s['defaultLanguage'] ?? 'ar'),
        timezone: String(s['timezone'] ?? 'Asia/Riyadh'),
        currency: String(s['currency'] ?? 'SAR'),
        maintenanceMode: Boolean(s['maintenanceMode'] ?? false),
      });
    });
  }

  protected save(): void {
    const v = this.form.getRawValue();
    const payload: AdminSettings = {
      defaultLanguage: v.defaultLanguage,
      timezone: v.timezone,
      currency: v.currency,
      maintenanceMode: v.maintenanceMode,
    };
    this.saving.set(true);
    this.admin.updateSettings(payload).subscribe({
      next: () => { this.saving.set(false); this.toast.success(this.i18n.t('common.saved')); },
      error: () => { this.saving.set(false); this.toast.error(this.i18n.t('common.error')); },
    });
  }
}
