import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { BrandSettings } from '../../models';
import { AdminService } from '../../services/admin.service';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { LoadingComponent } from '../../shared/loading.component';
import { ToastService } from '../../shared/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, LoadingComponent, ErrorStateComponent],
  template: `
    <div class="admin-page-head"><div><h1>{{ i18n.t('admin.brand') }}</h1></div></div>
    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else {
      <div class="form-panel">
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="form-grid-2">
            <div><label class="form-label">logoPrimary</label><input class="form-input" formControlName="logoPrimary" /></div>
            <div><label class="form-label">logoDark</label><input class="form-input" formControlName="logoDark" /></div>
            <div><label class="form-label">logoLight</label><input class="form-input" formControlName="logoLight" /></div>
            <div><label class="form-label">favicon</label><input class="form-input" formControlName="favicon" /></div>
            <div><label class="form-label">primary color</label><input class="form-input" formControlName="colorPrimary" /></div>
            <div><label class="form-label">accent color</label><input class="form-input" formControlName="colorAccent" /></div>
          </div>
          <label class="form-label">contact phone</label><input class="form-input" formControlName="contactPhone" />
          <label class="form-label">contact email</label><input class="form-input" formControlName="contactEmail" />
          <div class="form-actions">
            <button class="btn gradient-button" type="submit" [disabled]="saving()">{{ saving() ? i18n.t('common.saving') : i18n.t('common.save') }}</button>
          </div>
        </form>
      </div>
    }
  `,
})
export class BrandSettingsComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly admin = inject(AdminService);
  protected readonly fb = inject(FormBuilder);
  protected readonly toast = inject(ToastService);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    logoPrimary: [''], logoDark: [''], logoLight: [''], favicon: [''],
    colorPrimary: [''], colorAccent: [''],
    contactPhone: [''], contactEmail: [''],
  });

  protected readonly loader = createLoader<BrandSettings>(
    () => this.admin.brand().pipe(catchError(() => of({} as BrandSettings))),
    {},
  );

  constructor() {
    effect(() => {
      const b = this.loader.data();
      if (!b) return;
      this.form.patchValue({
        logoPrimary: b.logoPrimary ?? '', logoDark: b.logoDark ?? '', logoLight: b.logoLight ?? '', favicon: b.favicon ?? '',
        colorPrimary: b.colors?.['primary'] ?? '', colorAccent: b.colors?.['accent'] ?? '',
        contactPhone: b.contact?.['phone'] ?? '', contactEmail: b.contact?.['email'] ?? '',
      });
    });
  }

  protected save(): void {
    const v = this.form.getRawValue();
    const payload: BrandSettings = {
      logoPrimary: v.logoPrimary || undefined,
      logoDark: v.logoDark || undefined,
      logoLight: v.logoLight || undefined,
      favicon: v.favicon || undefined,
      colors: { primary: v.colorPrimary || '', accent: v.colorAccent || '' },
      contact: { phone: v.contactPhone || '', email: v.contactEmail || '' },
    };
    this.saving.set(true);
    this.admin.updateBrand(payload).subscribe({
      next: () => { this.saving.set(false); this.toast.success(this.i18n.t('common.saved')); },
      error: () => { this.saving.set(false); this.toast.error(this.i18n.t('common.error')); },
    });
  }
}
