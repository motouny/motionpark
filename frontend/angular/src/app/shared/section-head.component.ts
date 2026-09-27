import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-section-head',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head" [class.center]="center">
      <p class="eyebrow" [class.on-light]="onLight">{{ eyebrow }}</p>
      <h2><ng-content></ng-content></h2>
      @if (description) { <p class="desc">{{ description }}</p> }
    </div>
  `,
  styles: `
    .head { max-width: 640px; }
    .head.center { margin-inline: auto; text-align: center; }
    h2 {
      margin-top: 1rem;
      font-size: clamp(1.9rem, 4.5vw, 3rem);
      font-weight: 900;
      line-height: 1.18;
    }
    .desc { margin-top: 1.25rem; line-height: 1.9; opacity: .66; }
  `,
})
export class SectionHeadComponent {
  @Input() eyebrow = '';
  @Input() description = '';
  @Input() center = false;
  @Input() onLight = false;
}
