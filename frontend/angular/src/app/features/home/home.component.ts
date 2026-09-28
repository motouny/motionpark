import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { createLoader } from '../../core/loader';
import { HomepageSection } from '../../models';
import { PublicService } from '../../services/public.service';
import { LoadingComponent } from '../../shared/loading.component';
import { HeroSectionComponent } from './sections/hero-section.component';
import { ActivitiesSectionComponent } from './sections/activities-section.component';
import { ScheduleSectionComponent } from './sections/schedule-section.component';
import { StorySectionComponent } from './sections/story-section.component';
import { MembershipsSectionComponent } from './sections/memberships-section.component';
import { CoachesSectionComponent } from './sections/coaches-section.component';
import { TestimonialsSectionComponent } from './sections/testimonials-section.component';
import { FaqSectionComponent } from './sections/faq-section.component';
import { BranchesSectionComponent } from './sections/branches-section.component';
import { CtaSectionComponent } from './sections/cta-section.component';

/**
 * CMS-driven homepage: `/api/public/homepage` returns ordered enabled
 * sections; each section type maps to one section component. When the API
 * is unreachable, the approved default section list renders instead.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LoadingComponent,
    HeroSectionComponent,
    ActivitiesSectionComponent,
    ScheduleSectionComponent,
    StorySectionComponent,
    MembershipsSectionComponent,
    CoachesSectionComponent,
    TestimonialsSectionComponent,
    FaqSectionComponent,
    BranchesSectionComponent,
    CtaSectionComponent,
  ],
  template: `
    @if (loader.loading()) {
      <div style="min-height: 70vh; display: grid; place-items: center;">
        <app-loading />
      </div>
    } @else {
      @for (section of sections(); track section.type) {
        @switch (section.type) {
          @case ('hero') { <app-hero-section [content]="section.content" /> }
          @case ('activities') { <app-activities-section [content]="section.content" /> }
          @case ('schedule') { <app-schedule-section [content]="section.content" /> }
          @case ('story') { <app-story-section [content]="section.content" /> }
          @case ('about') { <app-story-section [content]="section.content" /> }
          @case ('memberships') { <app-memberships-section [content]="section.content" /> }
          @case ('coaches') { <app-coaches-section [content]="section.content" /> }
          @case ('testimonials') { <app-testimonials-section [content]="section.content" /> }
          @case ('faq') { <app-faq-section [content]="section.content" /> }
          @case ('facilities') { <app-faq-section [content]="section.content" /> }
          @case ('branches') { <app-branches-section [content]="section.content" /> }
          @case ('cta') { <app-cta-section [content]="section.content" /> }
        }
      }
    }
  `,
})
export class HomeComponent {
  private readonly publicService = inject(PublicService);

  protected readonly loader = createLoader<HomepageSection[]>(() => this.publicService.homepage(), []);
  protected readonly sections = computed(() =>
    [...this.loader.data()].filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder),
  );
}
