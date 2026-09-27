import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';
import { API_CONFIG, ApiConfig } from '../core/api-config';
import {
  FALLBACK_ACTIVITIES, FALLBACK_BRANCHES, FALLBACK_COACHES, FALLBACK_FAQS,
  FALLBACK_HOMEPAGE_SECTIONS, FALLBACK_PLANS, FALLBACK_SCHEDULE, FALLBACK_TESTIMONIALS,
} from '../core/fallback-data';
import {
  Activity, Banner, Branch, Coach, Faq, HomepageSection, LeadPayload,
  MembershipPlan, ScheduleEntry, Testimonial,
} from '../models';

/**
 * Public (no-auth) API surface. Every read degrades gracefully to the
 * approved on-brand fallback content when the backend is unreachable,
 * and records the degraded state so the UI can disclose it.
 */
@Injectable({ providedIn: 'root' })
export class PublicService {
  private readonly http = inject(HttpClient);
  private readonly config = inject<ApiConfig>(API_CONFIG);

  /** True when the last public read fell back to default content. */
  readonly degraded = signal(false);

  private get base(): string {
    return `${this.config.baseUrl}/public`;
  }

  private degrade<T>(fallback: T): (err: unknown) => Observable<T> {
    return (err) => {
      this.degraded.set(true);
      return of(fallback);
    };
  }

  membershipPlans(): Observable<MembershipPlan[]> {
    return this.http.get<MembershipPlan[]>(`${this.base}/membership-plans`).pipe(
      catchError(this.degrade(FALLBACK_PLANS)),
    );
  }

  activities(): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.base}/activities`).pipe(
      catchError(this.degrade(FALLBACK_ACTIVITIES)),
    );
  }

  activity(slug: string): Observable<Activity | null> {
    return this.http.get<Activity>(`${this.base}/activities/${slug}`).pipe(
      catchError(() => of(FALLBACK_ACTIVITIES.find((a) => a.slug === slug) ?? null)),
    );
  }

  coaches(): Observable<Coach[]> {
    return this.http.get<Coach[]>(`${this.base}/coaches`).pipe(
      catchError(this.degrade(FALLBACK_COACHES)),
    );
  }

  coach(slug: string): Observable<Coach | null> {
    return this.http.get<Coach>(`${this.base}/coaches/${slug}`).pipe(
      catchError(() => of(FALLBACK_COACHES.find((c) => c.slug === slug) ?? null)),
    );
  }

  branches(): Observable<Branch[]> {
    return this.http.get<Branch[]>(`${this.base}/branches`).pipe(
      catchError(this.degrade(FALLBACK_BRANCHES)),
    );
  }

  branch(slug: string): Observable<Branch | null> {
    return this.http.get<Branch>(`${this.base}/branches/${slug}`).pipe(
      catchError(() => of(FALLBACK_BRANCHES.find((b) => b.slug === slug) ?? null)),
    );
  }

  schedule(branchId?: string, date?: string): Observable<ScheduleEntry[]> {
    let url = `${this.base}/schedule`;
    const params: string[] = [];
    if (branchId) params.push(`branchId=${encodeURIComponent(branchId)}`);
    if (date) params.push(`date=${encodeURIComponent(date)}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<ScheduleEntry[]>(url).pipe(
      catchError(this.degrade(FALLBACK_SCHEDULE)),
    );
  }

  page(slug: string): Observable<{ slug: string; titleAr: string; titleEn: string; contentAr: string; contentEn: string } | null> {
    return this.http.get<{ slug: string; titleAr: string; titleEn: string; contentAr: string; contentEn: string }>(
      `${this.base}/pages/${slug}`,
    ).pipe(catchError(() => of(null)));
  }

  faqs(): Observable<Faq[]> {
    return this.http.get<Faq[]>(`${this.base}/faqs`).pipe(
      catchError(this.degrade(FALLBACK_FAQS)),
    );
  }

  testimonials(): Observable<Testimonial[]> {
    return this.http.get<Testimonial[]>(`${this.base}/testimonials`).pipe(
      catchError(this.degrade(FALLBACK_TESTIMONIALS)),
    );
  }

  banners(): Observable<Banner[]> {
    return this.http.get<Banner[]>(`${this.base}/banners`).pipe(catchError(this.degrade([])));
  }

  homepage(): Observable<HomepageSection[]> {
    return this.http.get<HomepageSection[]>(`${this.base}/homepage`).pipe(
      tap((sections) => {
        const enabled = sections.filter((s) => s.enabled);
        if (!enabled.length) this.degraded.set(true);
      }),
      catchError(this.degrade(FALLBACK_HOMEPAGE_SECTIONS)),
    );
  }

  leads(payload: LeadPayload): Observable<unknown> {
    return this.http.post(`${this.base}/leads`, payload);
  }
}
