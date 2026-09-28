import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { AuthService } from '../../services/auth.service';
import { IconComponent } from '../../shared/icon.component';
import { ToastService } from '../../shared/toast.service';
import { AuthCardComponent } from './auth-card.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, AuthCardComponent],
  template: `
    <app-auth-card [title]="i18n.t('auth.registerTitle')" [subtitle]="i18n.t('auth.registerSubtitle')">
      <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
        <div>
          <label class="form-label" for="r-name">{{ i18n.t('auth.name') }}</label>
          <input id="r-name" class="form-input" formControlName="name" autocomplete="name" />
        </div>
        <div>
          <label class="form-label" for="r-phone">{{ i18n.t('auth.phone') }}</label>
          <input id="r-phone" class="form-input" type="tel" formControlName="phone" [placeholder]="i18n.t('auth.phoneHint')" autocomplete="tel" />
        </div>
        <div>
          <label class="form-label" for="r-email">{{ i18n.t('auth.emailOptional') }}</label>
          <input id="r-email" class="form-input" type="email" formControlName="email" autocomplete="email" />
        </div>
        <div>
          <label class="form-label" for="r-password">{{ i18n.t('auth.password') }}</label>
          <input id="r-password" class="form-input" type="password" formControlName="password" autocomplete="new-password" />
          @if (form.controls.password.touched && form.controls.password.hasError('minlength')) {
            <p class="field-error">{{ i18n.t('auth.passwordMin') }}</p>
          }
        </div>
        <div>
          <label class="form-label" for="r-lang">{{ i18n.t('auth.preferredLanguage') }}</label>
          <select id="r-lang" class="form-select" formControlName="preferredLanguage">
            <option value="ar">{{ i18n.lang() === 'ar' ? 'العربية' : 'Arabic' }}</option>
            <option value="en">{{ i18n.lang() === 'ar' ? 'الإنجليزية' : 'English' }}</option>
          </select>
        </div>
        <button class="btn gradient-button btn-block" type="submit" [disabled]="form.invalid || submitting()">
          {{ submitting() ? i18n.t('common.submitting') : i18n.t('auth.registerNow') }}
        </button>
        <p class="agree">{{ i18n.t('auth.agreeNote') }}</p>
      </form>

      <p class="switch">
        {{ i18n.t('auth.haveAccount') }}
        <a routerLink="/login">{{ i18n.t('auth.loginNow') }}</a>
      </p>
    </app-auth-card>
  `,
})
export class RegisterComponent {
  protected readonly i18n = inject(I18nService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly submitting = signal(false);

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^(\+?966|0)?5\d{8}$/)]],
    email: ['', Validators.email],
    password: ['', [Validators.required, Validators.minLength(8)]],
    preferredLanguage: ['ar'],
  });

  protected submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const value = this.form.getRawValue();
    this.auth.register({
      name: value.name ?? '',
      phone: value.phone ?? '',
      email: value.email || undefined,
      password: value.password ?? '',
      preferredLanguage: value.preferredLanguage ?? 'ar',
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success(this.i18n.t('auth.registerSuccess'));
        this.router.navigate(['/account']).catch(() => undefined);
      },
      error: (err) => {
        this.submitting.set(false);
        const message = err?.error?.error?.message;
        this.toast.error(typeof message === 'string' && message ? message : this.i18n.t('common.error'));
      },
    });
  }
}
