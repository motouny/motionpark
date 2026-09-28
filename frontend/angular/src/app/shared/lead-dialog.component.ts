import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, Output, computed, inject, signal } from '@angular/core';
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
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="lead-dialog-title" (click)="backdrop($event)" (keydown)="trapTab($event)">
        <div class="modal-card">
          <button class="modal-close" (click)="close.emit()" [attr.aria-label]="i18n.t('common.close')">
            <app-icon name="close" size="1rem" />
          </button>

          <img src="assets/brand/motion-park-symbol-256.png" alt="" width="48" height="48" />
          <p class="badge">{{ i18n.t('leadDialog.badge') }}</p>
          <h2 class="title" id="lead-dialog-title">{{ i18n.t('leadDialog.title') }}</h2>
          <p class="subtitle">{{ i18n.t('leadDialog.subtitle') }}</p>

          <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
            <label class="field">
              <span>{{ i18n.t('leadDialog.name') }}</span>
              <input class="form-input" formControlName="name" autocomplete="name" />
            </label>
            <label class="field">
              <span>{{ i18n.t('leadDialog.phone') }}</span>
              <input class="form-input" type="tel" formControlName="phone" autocomplete="tel" dir="ltr" placeholder="05xxxxxxxx" />
            </label>
            <label class="field">
              <span>{{ i18n.t('leadDialog.activity') }}</span>
            <select class="form-select" formControlName="activity">
              <option value="">{{ i18n.t('leadDialog.activityPlaceholder') }}</option>
              @for (a of activityOptions(); track a) {
                <option [value]="a">{{ a }}</option>
              }
            </select>
            </label>
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
    .grid { display: grid; gap: .9rem; margin-top: 1.5rem; }
    .field { display: grid; gap: .4rem; }
    .field > span { font-size: .9rem; font-weight: 700; color: var(--mp-white); }
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

  /** Preselects "the activity I'm interested in" (a class being booked, a membership being chosen). */
  @Input() interest: string | null = null;

  @Input() set isOpen(value: boolean) {
    const wasOpen = this.open();
    this.open.set(value);
    if (value && !wasOpen) {
      // Move focus into the dialog; give it back to the button that opened it on close.
      this.returnFocus = document.activeElement as HTMLElement | null;
      setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('input')?.focus());
    } else if (!value && wasOpen) {
      this.returnFocus?.focus();
      this.returnFocus = null;
    }
    if (value) {
      this.interestSignal.set(this.interest);
      this.form.reset({ name: '', phone: '', activity: this.interest ?? '' });
    }
  }
  @Output() close = new EventEmitter<void>();

  protected readonly open = signal(false);
  private readonly interestSignal = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly activityOptions = computed(() => {
    const opts: string[] = [];
    for (let i = 0; i < 4; i++) {
      opts.push(this.i18n.t(`leadDialog.activities.${i}`));
    }
    const interest = this.interestSignal();
    return interest && !opts.includes(interest) ? [interest, ...opts] : opts;
  });

  protected readonly form = this.fb.group({
    name: ['', [Validators.required]],
    phone: ['', [Validators.required, Validators.pattern(/^(\+?966|0)?5\d{8}$/)]],
    activity: [''],
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private returnFocus: HTMLElement | null = null;

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.close.emit();
  }

  /** Keep Tab / Shift+Tab inside the dialog while it is open. */
  protected trapTab(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const items = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input, select, textarea, a[href]'));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
    else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
  }

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
        this.toast.success(`${this.i18n.t('leadDialog.success')} — ${this.i18n.t('leadDialog.successDesc')}`);
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error(this.i18n.t('common.error'));
      },
    });
  }
}
