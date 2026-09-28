import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loading-wrap" role="status" aria-live="polite">
      <span class="spinner"></span>
      <span>{{ label }}</span>
    </div>
  `,
})
export class LoadingComponent {
  @Input() label = 'Loading…';
}
