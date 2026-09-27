import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { I18nService } from '../i18n/i18n.service';
import { PublicService } from '../services/public.service';
import { ToastService } from './toast.service';
import { IconComponent } from './icon.component';

/** "Book your first session" lead-capture modal. Posts to `/api/public/leads`. */
@Component({
  selector: 'app-lead-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent],
  template: `
    @if (open()) {
      <div class="modal-backdrop" role="dialog" aria-modal="true" (click)="backdrop($event)">
        <div class="modal-card">
          <button class="modal-close" (click)="close.emit()" [attr.aria-label]="i18n.t('common.close')">
            <app-icon name="close" size="1rem" />
          </button>

          <img src="assets/brand/symbol.svg" alt="" width="48" height="48" />
          <p class="badge">{{ i18n.t('leadDialog.badge') }}</p>
          <h2 class="title">{{ i18n.t('leadDialog.title') }}</h2>
          <p class="subtitle">{{ i18n.t('leadDialog.subtitle') }}</p>

          <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
            <input
              class="form-input"
              formControlName="name"
              [attr.aria-label]="i18n.t('leadDialog.name')"
              [placeholder]="i18n.t('leadDialog.name')"
            />
            <input
              class="form-input"
              type="tel"
              formControlName="phone"
              [attr.aria-label]="i18n.t('leadDialog.phone')"
              [placeholder]="i18n.t('leadDialog.phone')"
            />
            <select class="form-select" formControlName="activity" [attr.aria-label]="i18n.t('leadDialog.activity')">
              <option value="">{{ i18n.t('leadDialog.activityPlaceholder') }}</option>
              @for (a of activityOptions(); track a) {
                <option [value]="a">{{ a }}</option>
              }
            </select>
            <button class="btn gradient-button btn-block" type="submit" [disabled]="form.invalid || submitting()">
              {{ submitting() ? i18n.t('common.submitting') : i18n.t('leadDialog.submit') }}
              <app-icon name="arrow-start" size="1rem" [flip]="true" />
            </button>
          </form>

          <p class="privacy">
            <app-icon name="shield" size="1rem" />
            {{ i18n.t('leadDialog.privacyNote') }}
          </p>
        </div>
      </div>
    }
  `,
  styles: `
    .grid { display: grid; gap: .75rem; margin-top: 1.5rem; }
    .badge { margin-top: 1.25rem; color: #FF9B50; font-size: .88rem; font-weight: 700; }
    .title { margin-top: .5rem; font-size: 1.7rem; font-weight: 900; }
    .subtitle { margin-top: .75rem; color: rgba(245,245,247,.58); font-size: .9rem; }
    .privacy {
      margin-top: 1rem; display: flex; align-items: center; gap: .5rem;
      color: rgba(245,245,247,.4); font-size: .78rem;
    }
  `,
})
export class LeadDialogComponent {
  protected readonly i18n = inject(I18nService);
  private readonly fb = inject(FormBuilder);
  private readonly publicService = inject(PublicService);
  private readonly toast = inject(ToastService);

  @Input() set isOpen(value: boolean) {
    this.open.set(value);
    if (value) this.form.reset({ name: '', phone: '', activity: '' });
  }
  @Output() close = new EventEmitter<void>();

  protected readonly open = signal(false);
  protected readonly submitting = signal(false);

  protected readonly activityOptions = computed(() => {
    const opts: string[] = [];
    for (let i = 0; i < 4; i++) {
      opts.push(this.i18n.t(`leadDialog.activities.${i}`));
    }
    return opts;
  });

  protected readonly form = this.fb.group({
    name: ['', [Validators.required]],
    phone: ['', [Validators.required, Validators.pattern(/^(\+?966|0)?5\d{8}$/)]],
    activity: [''],
  });

  protected backdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close.emit();
  }

  protected submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const value = this.form.getRawValue();
    this.publicService.leads({
      name: value.name ?? '',
      phone: value.phone ?? '',
      type: 'trial',
      message: value.activity ? `Activity of interest: ${value.activity}` : undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.close.emit();
        this.toast.success(this.i18n.t('leadDialog.success'), this.i18n.t('leadDialog.successDesc'));
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error(this.i18n.t('common.error'));
      },
    });
  }
}
