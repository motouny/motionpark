import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { Branch } from '../../../models';
import { PublicService } from '../../../services/public.service';
import { EmptyComponent } from '../../../shared/empty.component';
import { IconComponent } from '../../../shared/icon.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { SectionHeadComponent } from '../../../shared/section-head.component';
import { HoursPipe } from '../../../shared/hours.pipe';

@Component({
  selector: 'app-branches-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HoursPipe, RouterLink, IconComponent, LoadingComponent, EmptyComponent, SectionHeadComponent],
  template: `
    <section class="light-surface section branches">
      <div class="container">
        <app-section-head
          [eyebrow]="i18n.t('homeBranches.eyebrow')"
          [description]="i18n.t('homeBranches.subtitle')"
          [onLight]="true"
        >
          {{ i18n.t('homeBranches.title') }}
        </app-section-head>

        @if (loader.loading()) {
          <app-loading [label]="i18n.t('common.loading')" />
        } @else if (branches().length === 0) {
          <app-empty [message]="i18n.t('branchesPage.empty')" />
        } @else {
          <div class="grid">
            @for (b of branches(); track b.id) {
              <a class="branch-card" [routerLink]="['/branches', b.slug]">
                <span class="pin"><app-icon name="map-pin" size="1.3rem" /></span>
                <h3>{{ i18n.pick(b) }}</h3>
                <p class="addr">{{ b.address }}</p>
                <p class="hours">{{ b.operatingHours | hours:i18n.lang() }}</p>
              </a>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .branches { padding-bottom: 80px; }
    .grid {
      margin-top: 3rem;
      display: grid; gap: 1rem;
      @media (min-width: 640px) { grid-template-columns: repeat(2, 1fr); }
      @media (min-width: 1024px) { grid-template-columns: repeat(4, 1fr); }
    }
    .branch-card {
      border-radius: 24px; border: 1px solid rgba(26,26,26,.1);
      background: #fff; padding: 1.5rem;
      transition: transform 200ms var(--ease-out), border-color 200ms var(--ease-out);
      &:hover { transform: translateY(-4px); border-color: var(--primary); }
      .pin {
        display: grid; place-items: center;
        width: 2.9rem; height: 2.9rem; border-radius: 14px;
        background: rgba(255,64,129,.1); color: var(--primary);
        margin-bottom: 1rem;
      }
      h3 { font-size: 1.1rem; font-weight: 900; }
      .addr { margin-top: .4rem; font-size: .85rem; color: rgba(26,26,26,.6); }
      .hours { margin-top: .6rem; font-size: .78rem; color: var(--accent); font-weight: 700; }
    }
  `,
})
export class BranchesSectionComponent {
  protected readonly i18n = inject(I18nService);
  private readonly publicService = inject(PublicService);

  @Input() content: Record<string, unknown> | null | undefined = null;

  protected readonly loader = createLoader<Branch[]>(() => this.publicService.branches(), []);
  protected readonly branches = computed(() => this.loader.data().filter((b) => b.active).slice(0, 4));
}
