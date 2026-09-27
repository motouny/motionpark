import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore } from '../../core/auth.store';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { IconComponent } from '../../shared/icon.component';
import { ToastService } from '../../shared/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe, IconComponent],
  template: `
    <div class="card profile-card">
      <h2>{{ i18n.t('account.profile.title') }}</h2>
      <p class="subtitle">{{ i18n.t('account.profile.subtitle') }}</p>

      <form [formGroup]="form" (ngSubmit)="save()" class="form-grid">
        <div>
          <label class="form-label" for="p-name">{{ i18n.t('common.name') }}</label>
          <input id="p-name" class="form-input" formControlName="name" />
        </div>
        <div>
          <label class="form-label" for="p-phone">{{ i18n.t('common.phone') }}</label>
          <input id="p-phone" class="form-input" formControlName="phone" />
        </div>
        <div>
          <label class="form-label" for="p-email">{{ i18n.t('common.email') }}</label>
          <input id="p-email" class="form-input" type="email" formControlName="email" />
        </div>
        <div>
          <label class="form-label" for="p-lang">{{ i18n.t('auth.preferredLanguage') }}</label>
          <select id="p-lang" class="form-select" formControlName="preferredLanguage">
            <option value="ar">{{ i18n.lang() === 'ar' ? 'العربية' : 'Arabic' }}</option>
            <option value="en">{{ i18n.lang() === 'ar' ? 'الإنجليزية' : 'English' }}</option>
          </select>
        </div>
        <div class="actions">
          <button class="btn gradient-button" type="submit" [disabled]="form.invalid || saving() || form.pristine">
            {{ saving() ? i18n.t('common.saving') : i18n.t('common.save') }}
          </button>
        </div>
      </form>

      @if (store.user()?.createdAt) {
        <p class="since">
          <app-icon name="calendar" size="0.95rem" />
          {{ i18n.t('account.profile.memberSince', { date: (store.user()!.createdAt | date: 'mediumDate')! }) }}
        </p>
      }
    </div>
  `,
  styles: `
    .profile-card { max-width: 640px; padding: 2rem; }
    h2 { font-size: 1.3rem; font-weight: 900; }
    .subtitle { margin-top: .35rem; color: var(--muted-foreground); font-size: .9rem; }
    .form-grid { margin-top: 1.5rem; }
    .actions { margin-top: .5rem; }
    .since { margin-top: 1.5rem; display: flex; align-items: center; gap: .5rem; color: var(--muted-foreground); font-size: .84rem; }
  `,
})
export class ProfileComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly store = inject(AuthStore);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
    email: [''],
    preferredLanguage: ['ar'],
  });

  constructor() {
    const user = this.store.user();
    if (user) {
      this.form.patchValue({
        name: user.name,
        phone: user.phone,
        email: user.email ?? '',
        preferredLanguage: user.preferredLanguage ?? 'ar',
      });
      this.form.markAsPristine();
    }
  }

  protected save(): void {
    if (this.form.invalid || this.form.pristine) return;
    this.saving.set(true);
    const value = this.form.getRawValue();
    this.auth.updateProfile({
      name: value.name ?? undefined,
      phone: value.phone ?? undefined,
      email: value.email || undefined,
      preferredLanguage: value.preferredLanguage ?? undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.markAsPristine();
        this.toast.success(this.i18n.t('common.saved'));
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.i18n.t('common.error'));
      },
    });
  }
}
