import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../i18n/i18n.service';
import { CmsTextPipe } from '../../../shared/cms-text.pipe';
import { IconComponent } from '../../../shared/icon.component';
import { SectionHeadComponent } from '../../../shared/section-head.component';

interface StoryValue {
  title: string;
  desc: string;
}

@Component({
  selector: 'app-story-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, SectionHeadComponent],
  template: `
    <section id="story" class="light-surface section">
      <div class="container grid">
        <div class="visual">
          <div class="art">
            <picture>
              <source type="image/webp" srcset="assets/images/motion-park-group-640.webp 640w, assets/images/motion-park-group-1040.webp 1040w" sizes="(min-width: 1024px) 560px, 100vw" />
              <img src="assets/images/motion-park-group-1040.jpg"
                srcset="assets/images/motion-park-group-640.jpg 640w, assets/images/motion-park-group-1040.jpg 1040w"
                sizes="(min-width: 1024px) 560px, 100vw" width="1040" height="1300" loading="lazy" decoding="async"
                [alt]="i18n.t('homeStory.photoAlt')" />
            </picture>
            <div class="art-shade" aria-hidden="true"></div>
            <div class="float-card" aria-hidden="true">
              <span class="float-icon"><app-icon name="heart" size="1.25rem" /></span>
              <span>
                <strong>{{ i18n.t('homeStory.cardTitle') }}</strong>
                <small>{{ i18n.t('homeStory.cardSubtitle') }}</small>
              </span>
            </div>
          </div>
          <div class="spark"><app-icon name="sparkles" size="1.25rem" /></div>
          <div class="tag">{{ tagText() }}</div>
        </div>

        <div class="copy">
          <app-section-head [eyebrow]="i18n.t('homeStory.eyebrow')" [onLight]="true">
            {{ titleA() }}<br />{{ titleB() }}
            <span class="accent">{{ titleC() }}</span>
          </app-section-head>
          <p class="body">{{ i18n.t('homeStory.body') }}</p>

          <ul class="values">
            @for (v of values(); track v.title) {
              <li>
                <h3>{{ v.title }}</h3>
                <p>{{ v.desc }}</p>
              </li>
            }
          </ul>

          <a routerLink="/about" class="more-link">
            {{ i18n.t('homeStory.link') }}
            <app-icon name="arrow-start" size="1rem" [flip]="true" />
          </a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .grid {
      display: grid; gap: 3.5rem; align-items: center;
      @media (min-width: 1024px) { grid-template-columns: 1.05fr .95fr; }
    }
    .visual { position: relative; max-width: 560px; margin-inline: auto; width: 100%; }
    .art {
      position: relative; aspect-ratio: 4/5; overflow: hidden;
      border-radius: 34px;
      background:
        radial-gradient(circle at 80% 20%, rgba(255,64,129,.3), transparent 45%),
        radial-gradient(circle at 20% 85%, rgba(138,43,226,.35), transparent 45%),
        linear-gradient(30deg, rgba(18,18,24,.1), rgba(18,18,24,.78)),
        linear-gradient(150deg, #2a1a3e, #12121a 70%);
      picture, img { position: absolute; inset: 0; width: 100%; height: 100%; }
      img { object-fit: cover; object-position: center 35%; }
      .art-shade {
        position: absolute; inset: 0;
        background: linear-gradient(0deg, rgba(18,18,24,.75) 0%, rgba(18,18,24,0) 45%);
      }
      .float-card {
        position: absolute; inset-inline: 1.5rem; bottom: 1.5rem;
        display: flex; align-items: center; gap: .8rem;
        border-radius: 18px; border: 1px solid rgba(255,255,255,.15);
        background: rgba(18,18,24,.8);
        color: #fff; padding: 1rem;
        backdrop-filter: blur(16px);
        strong { display: block; font-size: .88rem; }
        small { display: block; margin-top: .2rem; font-size: .74rem; color: rgba(245,245,247,.55); }
      }
      .float-icon {
        display: grid; place-items: center;
        width: 2.5rem; height: 2.5rem; border-radius: 12px;
        background: rgba(255,255,255,.1); color: var(--primary);
        flex-shrink: 0;
      }
    }
    .spark {
      position: absolute; top: 25%; inset-inline-start: -1.75rem;
      display: grid; place-items: center;
      width: 3rem; height: 3rem; border-radius: 16px;
      background: #1A1A1A; color: #FF7A00;
      box-shadow: 0 20px 40px rgba(0,0,0,.2);
    }
    .tag {
      position: absolute; bottom: 3.5rem; inset-inline-end: -1.25rem;
      background: var(--primary); color: #fff;
      border-radius: 14px; padding: .7rem 1rem;
      font-size: .88rem; font-weight: 900;
      box-shadow: 0 16px 35px rgba(255,64,129,.35);
    }
    .accent { color: var(--accent); }
    .body { margin-top: 1.5rem; max-width: 520px; font-size: 1.05rem; line-height: 1.9; color: rgba(26,26,26,.7); }
    .values {
      margin-top: 2rem;
      display: grid; gap: 1.25rem;
      @media (min-width: 640px) { grid-template-columns: 1fr 1fr; }
      li { border-inline-start: 2px solid var(--primary); padding-inline-start: 1rem; }
      h3 { font-weight: 900; }
      p { margin-top: .35rem; font-size: .88rem; line-height: 1.7; color: rgba(26,26,26,.6); }
    }
    .more-link {
      margin-top: 2.25rem; display: inline-flex; align-items: center; gap: .5rem;
      font-weight: 700; transition: color 160ms var(--ease-out);
      &:hover { color: var(--primary); }
    }
  `,
})
export class StorySectionComponent {
  protected readonly i18n = inject(I18nService);
  private readonly cms = inject(CmsTextPipe);

  @Input() content: Record<string, unknown> | null | undefined = null;

  protected readonly titleA = computed(() => this.cms.transform(this.content, 'titleA', this.i18n.t('homeStory.titleA')));
  protected readonly titleB = computed(() => this.cms.transform(this.content, 'titleB', this.i18n.t('homeStory.titleB')));
  protected readonly titleC = computed(() => this.cms.transform(this.content, 'titleC', this.i18n.t('homeStory.titleC')));

  protected readonly values = computed<StoryValue[]>(() => {
    const result: StoryValue[] = [];
    for (let i = 0; i < 4; i++) {
      result.push({
        title: this.i18n.t(`homeStory.values.${i}.title`),
        desc: this.i18n.t(`homeStory.values.${i}.desc`),
      });
    }
    return result;
  });

  protected readonly tagText = computed(() =>
    this.i18n.lang() === 'ar' ? 'مساحتك. قوتك.' : 'Your space. Your strength.',
  );
}
