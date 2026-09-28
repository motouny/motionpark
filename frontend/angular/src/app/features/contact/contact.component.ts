import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { Branch } from '../../models';
import { PublicService } from '../../services/public.service';
import { EmptyComponent } from '../../shared/empty.component';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';
import { ToastService } from '../../shared/toast.service';
import { HoursPipe } from '../../shared/hours.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HoursPipe, ReactiveFormsModule, IconComponent, LoadingComponent, EmptyComponent],
  template: `
    <section class="page-band">
      <div class="container">
        <p class="eyebrow">{{ i18n.t('nav.contact') }}</p>
        <h1>{{ i18n.t('contactPage.title') }}</h1>
        <p class="lead">{{ i18n.t('contactPage.lead') }}</p>
      </div>
    </section>

    <section class="contact-body">
      <div class="container cols">
        <form class="card form-card" [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-grid">
            <div>
              <label class="form-label" for="c-name">{{ i18n.t('contactPage.name') }}</label>
              <input id="c-name" class="form-input" formControlName="name" />
            </div>
            <div>
              <label class="form-label" for="c-phone">{{ i18n.t('contactPage.phone') }}</label>
              <input id="c-phone" class="form-input" type="tel" formControlName="phone" />
            </div>
            <div>
              <label class="form-label" for="c-email">{{ i18n.t('contactPage.email') }}</label>
              <input id="c-email" class="form-input" type="email" formControlName="email" />
            </div>
            <div>
              <label class="form-label" for="c-message">{{ i18n.t('contactPage.message') }}</label>
              <textarea
                id="c-message"
                class="form-textarea"
                rows="5"
                formControlName="message"
                [placeholder]="i18n.t('contactPage.messagePlaceholder')"
              ></textarea>
            </div>
            <button class="btn gradient-button btn-block" type="submit" [disabled]="form.invalid || submitting()">
              {{ submitting() ? i18n.t('common.submitting') : i18n.t('contactPage.submit') }}
            </button>
          </div>
        </form>

        <aside class="side">
          <div class="card info-card">
            <h2>{{ i18n.t('contactPage.infoTitle') }}</h2>
            <ul class="facts">
              <li><app-icon name="mail" size="1rem" /> hello&#64;motionpark.sa</li>
              <li><app-icon name="phone" size="1rem" /> +966 11 000 0000</li>
              <li><app-icon name="map-pin" size="1rem" /> {{ i18n.t('footer.address') }}</li>
            </ul>
          </div>

          <div class="card branches-card">
            <h2>{{ i18n.t('nav.branches') }}</h2>
            @if (branches().length === 0) {
              <app-empty [message]="i18n.t('branchesPage.empty')" />
            } @else {
              <ul class="branch-list">
                @for (b of branches(); track b.id) {
                  <li>
                    <strong>{{ i18n.pick(b) }}</strong>
                    <span>{{ b.operatingHours | hours:i18n.lang() }}</span>
                  </li>
                }
              </ul>
            }
          </div>
        </aside>
      </div>
    </section>
  `,
  styles: `
    .contact-body { padding: 64px 0 96px; background: var(--background); }
    .cols { display: grid; gap: 1.5rem; @media (min-width: 1024px) { grid-template-columns: 1.2fr .8fr; align-items: start; } }
    .form-card, .info-card, .branches-card { padding: 2rem; }
    h2 { font-size: 1.15rem; font-weight: 900; margin-bottom: 1.25rem; }
    .facts { display: grid; gap: .9rem; }
    .facts li { display: flex; align-items: center; gap: .6rem; color: rgba(245,245,247,.75); font-size: .92rem; }
    .side { display: grid; gap: 1.5rem; }
    .branch-list { display: grid; gap: .75rem; }
    .branch-list li {
      display: grid; gap: .15rem;
      border: 1px solid var(--border); border-radius: 14px; padding: .9rem 1.1rem;
      strong { font-weight: 800; }
      span { font-size: .8rem; color: var(--muted-foreground); }
    }
  `,
})
export class ContactComponent {
  protected readonly i18n = inject(I18nService);
  private readonly fb = inject(FormBuilder);
  private readonly publicService = inject(PublicService);
  private readonly toast = inject(ToastService);

  protected readonly submitting = signal(false);

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    phone: ['', [Validators.required]],
    email: ['', Validators.email],
    message: ['', Validators.required],
  });

  protected readonly branchesLoader = createLoader<Branch[]>(() => this.publicService.branches(), []);
  protected readonly branches = computed(() => this.branchesLoader.data().filter((b) => b.active).slice(0, 4));

  protected submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const value = this.form.getRawValue();
    this.publicService.leads({
      name: value.name ?? '',
      phone: value.phone ?? '',
      email: value.email || undefined,
      type: 'contact',
      message: value.message ?? '',
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.form.reset();
        this.toast.success(this.i18n.t('contactPage.success'), this.i18n.t('contactPage.successDesc'));
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error(this.i18n.t('common.error'));
      },
    });
  }
}
