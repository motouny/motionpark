import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toasts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="toast-region" aria-live="polite" aria-label="Notifications">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="'toast toast-' + toast.kind" role="status">
          <app-icon
            [name]="toast.kind === 'success' ? 'check' : toast.kind === 'error' ? 'alert' : 'bell'"
            size="1.15rem"
          />
          <div style="flex: 1;">
            <strong>{{ toast.title }}</strong>
            @if (toast.message) { <p>{{ toast.message }}</p> }
          </div>
          <button class="icon-btn" (click)="toastService.dismiss(toast.id)" [attr.aria-label]="'Close'">
            <app-icon name="close" size="0.9rem" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastsComponent {
  protected readonly toastService = inject(ToastService);
}
