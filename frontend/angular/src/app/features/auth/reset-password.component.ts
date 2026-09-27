import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { AuthService } from '../../services/auth.service';
import { IconComponent } from '../../shared/icon.component';
import { ToastService } from '../../shared/toast.service';
import { AuthCardComponent } from './auth-card.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, AuthCardComponent],
  template: `
    <app-auth-card [title]="i18n.t('auth.resetTitle')" subtitle="">
      <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
        <div>
          <label class="form-label" for="rp-password">{{ i18n.t('auth.password') }}</label>
          <input id="rp-password" class="form-input" type="password" formControlName="newPassword" autocomplete="new-password" />
          @if (form.controls.newPassword.touched && form.controls.newPassword.hasError('minlength')) {
            <p class="field-error">{{ i18n.t('auth.passwordMin') }}</p>
          }
        </div>
        <div>
          <label class="form-label" for="rp-confirm">{{ i18n.t('auth.password') }}</label>
          <input id="rp-confirm" class="form-input" type="password" formControlName="confirm" autocomplete="new-password" />
          @if (form.errors?.['mismatch'] && form.controls.confirm.touched) {
            <p class="field-error">{{ i18n.t('auth.passwordMin') }}</p>
          }
        </div>
        <button class="btn gradient-button btn-block" type="submit" [disabled]="form.invalid || submitting()">
          {{ submitting() ? i18n.t('common.submitting') : i18n.t('auth.resetSubmit') }}
        </button>
      </form>

      <p class="switch">
        <a routerLink="/login">{{ i18n.t('auth.loginNow') }}</a>
      </p>
    </app-auth-card>
  `,
})
export class ResetPasswordComponent {
  protected readonly i18n = inject(I18nService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly submitting = signal(false);

  protected readonly form = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required],
    },
    { validators: [this.matchValidator] },
  );

  protected submit(): void {
    if (this.form.invalid) return;
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.toast.error(this.i18n.t('common.error'));
      return;
    }
    this.submitting.set(true);
    this.auth.resetPassword(token, this.form.getRawValue().newPassword ?? '').subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success(this.i18n.t('auth.resetSuccess'));
        this.router.navigate(['/login']).catch(() => undefined);
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error(this.i18n.t('common.error'));
      },
    });
  }

  private matchValidator(group: import('@angular/forms').AbstractControl): import('@angular/forms').ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirm = group.get('confirm')?.value;
    return newPassword && confirm && newPassword !== confirm ? { mismatch: true } : null;
  }
}
