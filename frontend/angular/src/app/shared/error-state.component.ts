import { ChangeDetectionStrategy, Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="error-wrap" role="alert">
      <app-icon name="alert" size="2.2rem" />
      <p>{{ message }}</p>
      @if (showRetry) {
        <button class="btn btn-ghost btn-sm" (click)="retry.emit()">
          <app-icon name="refresh" size="0.95rem" />
          {{ i18n.t('common.retry') }}
        </button>
      }
    </div>
  `,
})
export class ErrorStateComponent {
  private readonly i18nService = inject(I18nService);
  protected readonly i18n = this.i18nService;

  @Input() message = 'Something went wrong';
  @Input() showRetry = true;
  @Output() retry = new EventEmitter<void>();
}
