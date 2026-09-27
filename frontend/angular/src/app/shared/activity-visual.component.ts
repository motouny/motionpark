import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconComponent } from './icon.component';

/**
 * Activity card artwork: the approved campaign photos for swimming and group classes,
 * on-brand gradient art for the rest (no stock imagery).
 */
@Component({
  selector: 'app-activity-visual',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="visual" [class]="'visual visual-' + variant + (photo ? ' visual-' + variant + '-photo' : '')" aria-hidden="true">
      @if (photo; as p) {
        <picture class="photo">
          <source type="image/webp" [attr.srcset]="p + '-640.webp 640w, ' + p + '-1040.webp 1040w'" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
          <img [src]="p + '-640.jpg'" [attr.srcset]="p + '-640.jpg 640w, ' + p + '-1040.jpg 1040w'"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" width="1040" height="1300" alt="" loading="lazy" decoding="async" />
        </picture>
      }
      <span class="glow"></span>
      <span class="ring"></span>
      <span class="chip"><app-icon [name]="icon" size="1.35rem" /></span>
    </div>
  `,
  styles: `
    .visual {
      position: absolute;
      inset: 0;
      overflow: hidden;
      border-radius: inherit;

      .glow {
        position: absolute;
        width: 240px; height: 240px;
        border-radius: 50%;
        filter: blur(70px);
        opacity: .5;
        inset-inline-start: -60px;
        top: -60px;
        transition: transform 500ms var(--ease-out);
      }

      .ring {
        position: absolute;
        width: 240px; height: 240px;
        border: 20px solid rgba(255, 255, 255, .1);
        border-radius: 50%;
        inset-inline-start: -85px;
        bottom: -90px;
        transform: rotate(35deg);
      }

      .chip {
        position: absolute;
        top: 1.25rem;
        inset-inline-start: 1.25rem;
        display: grid;
        place-items: center;
        width: 2.9rem; height: 2.9rem;
        border-radius: 1rem;
        border: 1px solid rgba(255, 255, 255, .2);
        background: rgba(255, 255, 255, .1);
        backdrop-filter: blur(8px);
        color: #fff;
      }
    }

    .photo {
      position: absolute; inset: 0;
      img {
        width: 100%; height: 100%; object-fit: cover; object-position: center 40%;
        transition: transform 700ms var(--ease-out);
      }
    }
    :host-context(a:hover) .photo img, :host-context(a:focus-visible) .photo img { transform: scale(1.05); }
    .visual-swim-photo .ring, .visual-group-photo .ring { display: none; }
    .visual-swim-photo .glow, .visual-group-photo .glow { opacity: .22; }

    .visual-swim {
      background: linear-gradient(160deg, #0e3a4d 0%, #14657d 45%, #12121c 100%);
      .glow { background: #22d3ee; }
    }
    .visual-fitness {
      background: linear-gradient(150deg, #65214b, #2c1b32 61%, #121218);
      .glow { background: #FF4081; }
    }
    .visual-football {
      background: linear-gradient(150deg, #55352d, #1c3528 58%, #121218);
      .glow { background: #4ade80; }
    }
    .visual-group {
      background: linear-gradient(160deg, #6b2a12 0%, #a33b52 52%, #241531 100%);
      .glow { background: #fb923c; }
    }
    .visual-default {
      background: linear-gradient(160deg, #3b1f52, #1d1d24 60%, #121218);
      .glow { background: #8A2BE2; }
    }

    :host-context([dir='rtl']) .ring { transform: rotate(-35deg); }
  `,
})
export class ActivityVisualComponent {
  @Input() slug = '';
  @Input() icon = 'sparkles';

  /** Base path of the campaign photo for this activity, when there is one. */
  get photo(): string | null {
    const v = this.variant;
    return v === 'swim' || v === 'group' ? `assets/images/motion-park-${v}` : null;
  }

  get variant(): string {
    if (this.slug.includes('swim')) return 'swim';
    if (this.slug.includes('fitness') || this.slug.includes('gym')) return 'fitness';
    if (this.slug.includes('football') || this.slug.includes('soccer')) return 'football';
    if (this.slug.includes('group')) return 'group';
    return 'default';
  }
}
