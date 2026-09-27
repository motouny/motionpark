import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../../i18n/i18n.service';
import { CmsTextPipe } from '../../../shared/cms-text.pipe';
import { IconComponent } from '../../../shared/icon.component';
import { LeadDialogComponent } from '../../../shared/lead-dialog.component';

@Component({
  selector: 'app-hero-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, LeadDialogComponent],
  template: `
    <section class="hero" id="top">
      <div class="hero-art" aria-hidden="true">
        <div class="hero-grid"></div>
        <div class="orbit orbit-one"></div>
        <div class="orbit orbit-two"></div>
        <div class="blob blob-a"></div>
        <div class="blob blob-b"></div>
      </div>

      <div class="container hero-inner">
        <div class="hero-copy">
          <div class="badge">
            <span class="dot"></span>
            {{ badge() }}
          </div>
          <h1>
            {{ titleA() }}<br />
            <span class="gradient-text">{{ titleB() }}</span>
          </h1>
          <p class="subtitle">{{ subtitle() }}</p>
          <div class="ctas">
            <button class="btn gradient-button" (click)="leadOpen.set(true)">
              {{ i18n.t('hero.ctaPrimary') }}
              <app-icon name="arrow-start" size="1.05rem" [flip]="true" />
            </button>
            <button class="btn btn-ghost" (click)="scrollToActivities()">
              {{ i18n.t('hero.ctaSecondary') }}
              <app-icon name="chevron-down" size="1rem" />
            </button>
          </div>
          <dl class="stats">
            <div><dt>{{ i18n.t('hero.stat1v') }}</dt><dd>{{ i18n.t('hero.stat1l') }}</dd></div>
            <div><dt>{{ i18n.t('hero.stat2v') }}</dt><dd>{{ i18n.t('hero.stat2l') }}</dd></div>
            <div>
              <dt>{{ i18n.t('hero.stat3v') }}<span class="slash">/5</span></dt>
              <dd>{{ i18n.t('hero.stat3l') }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div class="scroll-hint" aria-hidden="true">
        <span>{{ i18n.t('hero.scroll') }}</span>
        <span class="line"></span>
      </div>
    </section>

    <app-lead-dialog [isOpen]="leadOpen()" (close)="leadOpen.set(false)" />
  `,
  styles: `
    .hero {
      position: relative;
      overflow: hidden;
      min-height: 780px;
      background: var(--background);
      padding-top: 76px;
    }
    .hero-art {
      position: absolute; inset: 0;
      .hero-grid {
        position: absolute; inset: 0; opacity: .5;
        background-image:
          linear-gradient(rgba(245,245,247,.055) 1px, transparent 1px),
          linear-gradient(90deg, rgba(245,245,247,.055) 1px, transparent 1px);
        background-size: 68px 68px;
        mask-image: linear-gradient(to left, black, transparent 68%);
      }
      .orbit {
        position: absolute; border-radius: 9999px; pointer-events: none;
      }
      .orbit-one {
        inset-inline-end: -70px; top: 155px;
        width: 500px; height: 500px;
        border: 1px solid rgba(255,255,255,.12);
        box-shadow: inset 0 0 120px rgba(255,64,129,.08);
        transform: rotate(-20deg);
        animation: drift 12s ease-in-out infinite alternate;
      }
      .orbit-two {
        inset-inline-end: 150px; bottom: -170px;
        width: 310px; height: 310px;
        border: 34px solid rgba(138,43,226,.18);
        animation: drift 9s ease-in-out infinite alternate-reverse;
      }
      .blob { position: absolute; border-radius: 50%; filter: blur(90px); }
      .blob-a { width: 420px; height: 420px; inset-inline-end: 8%; top: 22%; background: radial-gradient(circle, rgba(255,64,129,.24), transparent 65%); }
      .blob-b { width: 360px; height: 360px; inset-inline-end: 24%; top: 44%; background: radial-gradient(circle, rgba(138,43,226,.26), transparent 65%); }
    }
    @keyframes drift {
      from { transform: rotate(-20deg) translate3d(0, 0, 0); }
      to { transform: rotate(-8deg) translate3d(-10px, 12px, 0); }
    }
    .hero-inner {
      position: relative;
      display: flex;
      align-items: center;
      min-height: 704px;
      padding-block: 5rem;
    }
    .hero-copy { max-width: 640px; }
    .badge {
      display: inline-flex; align-items: center; gap: .55rem;
      border-radius: 9999px;
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(255,255,255,.06);
      padding: .55rem .95rem;
      font-size: .8rem; font-weight: 600;
      color: rgba(245,245,247,.8);
      backdrop-filter: blur(8px);
      .dot {
        width: .5rem; height: .5rem; border-radius: 50%;
        background: #FF7A00;
        box-shadow: 0 0 14px #FF4081;
      }
    }
    h1 {
      margin-top: 1.5rem;
      font-size: clamp(2.6rem, 7vw, 4.4rem);
      font-weight: 900;
      line-height: 1.12;
      letter-spacing: -0.5px;
      color: #fff;
    }
    .subtitle {
      margin-top: 1.75rem;
      max-width: 540px;
      font-size: clamp(1.05rem, 2vw, 1.25rem);
      line-height: 1.9;
      color: rgba(245,245,247,.72);
    }
    .ctas { margin-top: 2.25rem; display: flex; flex-wrap: wrap; gap: .75rem; }
    .stats {
      margin: 3.5rem 0 0;
      padding-top: 1.75rem;
      border-top: 1px solid rgba(245,245,247,.12);
      display: flex; flex-wrap: wrap; gap: 2rem;
      div { min-width: 100px; }
      dt { font-size: 1.5rem; font-weight: 900; color: #fff; }
      .slash { color: #FF7A00; font-size: 1.1rem; }
      dd { margin: .2rem 0 0; font-size: .88rem; color: rgba(245,245,247,.55); }
    }
    .scroll-hint {
      position: absolute; bottom: 1.75rem; inset-inline: 1.25rem;
      display: flex; align-items: center; justify-content: space-between;
      max-width: 1216px; margin-inline: auto;
      font-family: 'Sora', sans-serif;
      font-size: .72rem; letter-spacing: .1em;
      color: rgba(245,245,247,.4);
      .line { height: 1px; width: 6rem; background: linear-gradient(to left, #FF4081, transparent); }
    }
    @media (max-width: 640px) {
      .hero { min-height: 725px; }
      .orbit-one { width: 340px; height: 340px; top: 185px; inset-inline-end: -150px; }
      .orbit-two { inset-inline-end: -70px; bottom: -70px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .orbit { animation: none; }
    }
  `,
})
export class HeroSectionComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly leadOpen = signal(false);

  @Input() content: Record<string, unknown> | null | undefined = null;

  private readonly cms = inject(CmsTextPipe);

  protected readonly badge = computed(() => this.cms.transform(this.content, 'badge', this.i18n.t('hero.badge')));
  protected readonly titleA = computed(() => this.cms.transform(this.content, 'titleA', this.i18n.t('hero.titleA')));
  protected readonly titleB = computed(() => this.cms.transform(this.content, 'titleB', this.i18n.t('hero.titleB')));
  protected readonly subtitle = computed(() => this.cms.transform(this.content, 'subtitle', this.i18n.t('hero.subtitle')));

  protected scrollToActivities(): void {
    document.getElementById('activities')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
