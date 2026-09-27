import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../../i18n/i18n.service';
import { CmsTextPipe } from '../../../shared/cms-text.pipe';
import { IconComponent } from '../../../shared/icon.component';
import { LeadDialogComponent } from '../../../shared/lead-dialog.component';

interface HeroStat { value: string; outOf: string; label: string }

@Component({
  selector: 'app-hero-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, LeadDialogComponent],
  template: `
    <section class="hero" id="top">
      <picture class="hero-media" aria-hidden="true">
        <source type="image/webp"
          srcset="assets/images/motion-park-hero-800.webp 800w, assets/images/motion-park-hero-1440.webp 1440w, assets/images/motion-park-hero-2560.webp 2560w"
          sizes="100vw" />
        <img
          src="assets/images/motion-park-hero-1440.jpg"
          srcset="assets/images/motion-park-hero-800.jpg 800w, assets/images/motion-park-hero-1440.jpg 1440w, assets/images/motion-park-hero-2560.jpg 2560w"
          sizes="100vw" width="2560" height="1440" alt="" fetchpriority="high" decoding="async" />
      </picture>
      <div class="hero-shade" aria-hidden="true"></div>
      <div class="hero-glow" aria-hidden="true"></div>

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
            @for (stat of stats(); track $index) {
              <div>
                <dt>{{ stat.value }}@if (stat.outOf) {<span class="slash">{{ stat.outOf }}</span>}</dt>
                <dd>{{ stat.label }}</dd>
              </div>
            }
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
      min-height: min(100svh, 920px);
      background: var(--mp-ink);
      padding-top: 76px;
      isolation: isolate;
    }
    /* The athlete sits on the physical right of the photo; the copy always takes the dark left side. */
    .hero-media {
      position: absolute; inset: 0; z-index: -2;
      img {
        width: 100%; height: 100%;
        object-fit: cover; object-position: 72% 30%;
        animation: hero-in 1.6s var(--ease-out) both;
      }
    }
    .hero-shade {
      position: absolute; inset: 0; z-index: -1;
      background:
        linear-gradient(90deg, rgba(18,18,24,.92) 0%, rgba(18,18,24,.7) 34%, rgba(18,18,24,.12) 62%, transparent 78%),
        linear-gradient(0deg, var(--mp-ink) 0%, rgba(18,18,24,0) 28%),
        linear-gradient(180deg, rgba(18,18,24,.65) 0%, rgba(18,18,24,0) 22%);
    }
    .hero-glow {
      position: absolute; z-index: -1; pointer-events: none;
      width: 520px; height: 520px; left: -160px; bottom: -220px;
      border-radius: 50%; filter: blur(110px); opacity: .35;
      background: var(--mp-gradient);
    }
    @keyframes hero-in {
      from { opacity: 0; transform: scale(1.06); }
      to { opacity: 1; transform: scale(1); }
    }
    .hero-inner {
      position: relative;
      display: flex;
      align-items: center;
      /* physical left in both directions (the photo's negative space) */
      justify-content: flex-end;
      min-height: calc(min(100svh, 920px) - 76px);
      padding-block: 5rem 6.5rem;
    }
    :host-context([dir='ltr']) .hero-inner { justify-content: flex-start; }
    .hero-copy { max-width: 600px; animation: copy-in .9s .15s var(--ease-out) both; }
    @keyframes copy-in {
      from { opacity: 0; transform: translateY(18px); }
      to { opacity: 1; transform: none; }
    }
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
    /* Phones: the photo takes the top of the screen and the copy sits below it on ink. */
    @media (max-width: 767px) {
      .hero { min-height: 0; }
      .hero-media { bottom: auto; height: 480px; }
      .hero-media { top: 36px; }
      .hero-media img { object-position: 76% 0%; }
      .hero-shade {
        bottom: auto; height: 480px;
        background: linear-gradient(0deg, var(--mp-ink) 0%, rgba(18,18,24,.35) 38%, rgba(18,18,24,.1) 65%, rgba(18,18,24,.6) 100%);
      }
      .hero-inner { min-height: 0; align-items: flex-start; padding-block: 330px 4.5rem; }
      .stats { gap: 1.25rem; margin-top: 2.5rem; }
      .scroll-hint { display: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .hero-media img, .hero-copy { animation: none; }
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

  /** CMS `stats: [{ value, labelAr, labelEn }]` (editable in the admin homepage sections), else the defaults. */
  protected readonly stats = computed<HeroStat[]>(() => {
    const lang = this.i18n.lang();
    const raw = this.content?.['stats'];
    if (Array.isArray(raw) && raw.length) {
      return raw
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((x) => {
          const [value, outOf] = String(x['value'] ?? '').split('/');
          const label = String((lang === 'en' ? x['labelEn'] || x['labelAr'] : x['labelAr'] || x['labelEn']) ?? '');
          return { value, outOf: outOf ? `/${outOf}` : '', label };
        });
    }
    return [
      { value: this.i18n.t('hero.stat1v'), outOf: '', label: this.i18n.t('hero.stat1l') },
      { value: this.i18n.t('hero.stat2v'), outOf: '', label: this.i18n.t('hero.stat2l') },
      { value: this.i18n.t('hero.stat3v'), outOf: '/5', label: this.i18n.t('hero.stat3l') },
    ];
  });

  protected scrollToActivities(): void {
    document.getElementById('activities')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
