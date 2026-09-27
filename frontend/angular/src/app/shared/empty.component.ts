import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-empty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="empty-wrap">
      <app-icon name="alert" size="2.2rem" />
      <p>{{ message }}</p>
      <ng-content></ng-content>
    </div>
  `,
})
export class EmptyComponent {
  @Input() message = 'Nothing here yet.';
}
