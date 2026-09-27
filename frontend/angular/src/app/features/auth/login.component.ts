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
    <app-auth-card [title]="i18n.t('auth.loginTitle')" [subtitle]="i18n.t('auth.loginSubtitle')">
      <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
        <div>
          <label class="form-label" for="identifier">{{ i18n.t('auth.identifier') }}</label>
          <input id="identifier" class="form-input" formControlName="identifier" autocomplete="username" />
        </div>
        <div>
          <label class="form-label" for="password">{{ i18n.t('auth.password') }}</label>
          <input id="password" class="form-input" type="password" formControlName="password" autocomplete="current-password" />
        </div>
        <a routerLink="/forgot-password" class="forgot">{{ i18n.t('auth.forgot') }}</a>
        <button class="btn gradient-button btn-block" type="submit" [disabled]="form.invalid || submitting()">
          {{ submitting() ? i18n.t('common.submitting') : i18n.t('nav.login') }}
        </button>
      </form>

      <p class="switch">
        {{ i18n.t('auth.noAccount') }}
        <a routerLink="/register">{{ i18n.t('auth.registerNow') }}</a>
      </p>
    </app-auth-card>
  `,
})
export class LoginComponent {
  protected readonly i18n = inject(I18nService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly submitting = signal(false);

  protected readonly form = this.fb.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const { identifier, password } = this.form.getRawValue();
    this.auth.login(identifier ?? '', password ?? '').subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success(this.i18n.t('auth.loginSuccess'));
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') ? returnUrl : '/account').catch(() => undefined);
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error(this.i18n.t('auth.invalidCredentials'));
      },
    });
  }
}
