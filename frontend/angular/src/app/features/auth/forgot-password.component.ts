import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { AuthService } from '../../services/auth.service';
import { IconComponent } from '../../shared/icon.component';
import { ToastService } from '../../shared/toast.service';
import { AuthCardComponent } from './auth-card.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, AuthCardComponent],
  template: `
    <app-auth-card [title]="i18n.t('auth.forgotTitle')" [subtitle]="i18n.t('auth.forgotSubtitle')">
      <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
        <div>
          <label class="form-label" for="f-id">{{ i18n.t('auth.identifier') }}</label>
          <input id="f-id" class="form-input" formControlName="identifier" />
        </div>
        <button class="btn gradient-button btn-block" type="submit" [disabled]="form.invalid || submitting()">
          {{ submitting() ? i18n.t('common.submitting') : i18n.t('auth.forgotSubmit') }}
        </button>
        @if (sent()) {
          <p class="sent" role="status">{{ i18n.t('auth.forgotSuccess') }}</p>
        }
      </form>

      <p class="switch">
        <a routerLink="/login">{{ i18n.t('auth.loginNow') }}</a>
      </p>
    </app-auth-card>
  `,
})
export class ForgotPasswordComponent {
  protected readonly i18n = inject(I18nService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);

  protected readonly form = this.fb.group({
    identifier: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.auth.forgotPassword(this.form.getRawValue().identifier ?? '').subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error(this.i18n.t('common.error'));
      },
    });
  }
}
