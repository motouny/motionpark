import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';
import { ScheduleEntry } from '../../models';
import { IconComponent } from '../../shared/icon.component';

/** Confirmation dialog shown before creating a booking. */
@Component({
  selector: 'app-booking-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (entry) {
      <div class="modal-backdrop" role="dialog" aria-modal="true" (click)="backdrop($event)">
        <div class="modal-card">
          <button class="modal-close" (click)="cancel.emit()" [attr.aria-label]="i18n.t('common.close')">
            <app-icon name="close" size="1rem" />
          </button>
          <img src="assets/brand/motion-park-symbol.svg" alt="" width="44" height="44" />
          <h2 class="title">{{ i18n.t('schedulePage.confirmTitle') }}</h2>
          <p class="body">{{ i18n.t('schedulePage.confirmBody') }}</p>

          <div class="summary">
            <div><span>{{ i18n.t('schedulePage.location') }}</span><strong>{{ title() }}</strong></div>
            <div><span>{{ i18n.t('common.date') }}</span><strong>{{ date() }}</strong></div>
            <div><span>{{ i18n.t('common.time') }}</span><strong>{{ time() }}</strong></div>
            <div><span>{{ i18n.t('schedulePage.seatsLeft', { n: entry!.seatsLeft }) }}</span><strong>{{ seats() }}</strong></div>
          </div>

          <div class="actions">
            <button class="btn btn-ghost" (click)="cancel.emit()">{{ i18n.t('common.cancel') }}</button>
            <button class="btn gradient-button" (click)="confirm.emit()">
              {{ i18n.t('schedulePage.book') }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .title { margin-top: 1rem; font-size: 1.4rem; font-weight: 900; }
    .body { margin-top: .5rem; color: rgba(245,245,247,.6); font-size: .9rem; }
    .summary {
      margin-top: 1.5rem; display: grid; gap: .6rem;
      border: 1px solid var(--border); border-radius: 16px; padding: 1rem 1.25rem;
      div { display: flex; justify-content: space-between; gap: 1rem; font-size: .88rem; }
      span { color: var(--muted-foreground); }
    }
    .actions { margin-top: 1.5rem; display: flex; gap: .75rem; justify-content: flex-end; }
  `,
})
export class BookingDialogComponent {
  protected readonly i18n = inject(I18nService);

  @Input() entry: ScheduleEntry | null = null;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  protected readonly title = computed(() => {
    const e = this.entry;
    if (!e) return '';
    return this.i18n.pick((e.activity ?? { nameAr: e.activityNameAr, nameEn: e.activityNameEn }) as Record<string, unknown>) || '—';
  });

  protected readonly date = computed(() => {
    const e = this.entry;
    if (!e) return '';
    return new Intl.DateTimeFormat(this.i18n.lang() === 'ar' ? 'ar-SA' : 'en-US', { dateStyle: 'medium' }).format(new Date(e.date));
  });

  protected readonly time = computed(() => {
    const e = this.entry;
    return e ? `${e.startTime} – ${e.endTime}` : '';
  });

  protected readonly seats = computed(() => {
    const e = this.entry;
    if (!e) return '';
    const n = e.seatsLeft;
    if (n <= 0) return this.i18n.t('schedulePage.full');
    if (n === 1) return this.i18n.t('schedulePage.seatsOne');
    if (n === 2) return this.i18n.t('schedulePage.seatsTwo');
    return this.i18n.t('schedulePage.seatsFew', { n });
  });

  protected backdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.cancel.emit();
  }
}
