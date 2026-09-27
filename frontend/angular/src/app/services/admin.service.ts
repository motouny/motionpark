import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG, ApiConfig } from '../core/api-config';
import {
  Activity, AdminCustomer, AdminSettings, AuditLogEntry, Banner, Booking, Branch, BrandSettings,
  Coach, DashboardStats, Faq, HealthStatus, HomepageSection, Lead, MediaAsset, MembershipPlan,
  Role, ScheduleEntry, Testimonial, CmsPage,
} from '../models';

/** Full admin API surface (RBAC-guarded server-side). */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly config = inject<ApiConfig>(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin`;
  }

  // ---- dashboard & system ----
  dashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.base}/dashboard`);
  }

  health(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(`${this.base}/health`);
  }

  auditLogs(entity?: string, entityId?: string): Observable<AuditLogEntry[]> {
    const params: string[] = [];
    if (entity) params.push(`entity=${encodeURIComponent(entity)}`);
    if (entityId) params.push(`entityId=${encodeURIComponent(entityId)}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return this.http.get<AuditLogEntry[]>(`${this.base}/audit-logs${qs}`);
  }

  settings(): Observable<AdminSettings> {
    return this.http.get<AdminSettings>(`${this.base}/settings`);
  }

  updateSettings(settings: AdminSettings): Observable<AdminSettings> {
    return this.http.put<AdminSettings>(`${this.base}/settings`, settings);
  }

  brand(): Observable<BrandSettings> {
    return this.http.get<BrandSettings>(`${this.base}/brand`);
  }

  updateBrand(brand: BrandSettings): Observable<BrandSettings> {
    return this.http.put<BrandSettings>(`${this.base}/brand`, brand);
  }

  // ---- CMS ----
  homepageSections(): Observable<HomepageSection[]> {
    return this.http.get<HomepageSection[]>(`${this.base}/homepage/sections`);
  }

  updateHomepageSections(sections: HomepageSection[]): Observable<HomepageSection[]> {
    return this.http.put<HomepageSection[]>(`${this.base}/homepage/sections`, sections);
  }

  pages(): Observable<CmsPage[]> {
    return this.http.get<CmsPage[]>(`${this.base}/pages`);
  }

  createPage(page: Partial<CmsPage>): Observable<CmsPage> {
    return this.http.post<CmsPage>(`${this.base}/pages`, page);
  }

  updatePage(id: string, page: Partial<CmsPage>): Observable<CmsPage> {
    return this.http.put<CmsPage>(`${this.base}/pages/${id}`, page);
  }

  deletePage(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/pages/${id}`);
  }

  banners(): Observable<Banner[]> {
    return this.http.get<Banner[]>(`${this.base}/banners`);
  }

  createBanner(banner: Partial<Banner>): Observable<Banner> {
    return this.http.post<Banner>(`${this.base}/banners`, banner);
  }

  updateBanner(id: string, banner: Partial<Banner>): Observable<Banner> {
    return this.http.put<Banner>(`${this.base}/banners/${id}`, banner);
  }

  deleteBanner(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/banners/${id}`);
  }

  faqs(): Observable<Faq[]> {
    return this.http.get<Faq[]>(`${this.base}/faqs`);
  }

  createFaq(faq: Partial<Faq>): Observable<Faq> {
    return this.http.post<Faq>(`${this.base}/faqs`, faq);
  }

  updateFaq(id: string, faq: Partial<Faq>): Observable<Faq> {
    return this.http.put<Faq>(`${this.base}/faqs/${id}`, faq);
  }

  deleteFaq(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/faqs/${id}`);
  }

  testimonials(): Observable<Testimonial[]> {
    return this.http.get<Testimonial[]>(`${this.base}/testimonials`);
  }

  createTestimonial(t: Partial<Testimonial>): Observable<Testimonial> {
    return this.http.post<Testimonial>(`${this.base}/testimonials`, t);
  }

  updateTestimonial(id: string, t: Partial<Testimonial>): Observable<Testimonial> {
    return this.http.put<Testimonial>(`${this.base}/testimonials/${id}`, t);
  }

  deleteTestimonial(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/testimonials/${id}`);
  }

  // ---- media library ----
  media(search?: string, category?: string): Observable<MediaAsset[]> {
    const params: string[] = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return this.http.get<MediaAsset[]>(`${this.base}/media${qs}`);
  }

  uploadMedia(files: File[]): Observable<MediaAsset[]> {
    const form = new FormData();
    for (const file of files) form.append('files', file, file.name);
    return this.http.post<MediaAsset[]>(`${this.base}/media`, form);
  }

  replaceMedia(id: string, file: File): Observable<MediaAsset> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<MediaAsset>(`${this.config.baseUrl}/media/${id}/replace`, form);
  }

  updateMedia(id: string, meta: { altAr?: string; altEn?: string; title?: string; category?: string }): Observable<MediaAsset> {
    return this.http.put<MediaAsset>(`${this.base}/media/${id}`, meta);
  }

  deleteMedia(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/media/${id}`);
  }

  mediaFileUrl(id: string): string {
    return `${this.config.baseUrl}/media/${id}/file`;
  }

  // ---- content ----
  activities(): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.base}/activities`);
  }

  createActivity(a: Partial<Activity>): Observable<Activity> {
    return this.http.post<Activity>(`${this.base}/activities`, a);
  }

  updateActivity(id: string, a: Partial<Activity>): Observable<Activity> {
    return this.http.put<Activity>(`${this.base}/activities/${id}`, a);
  }

  deleteActivity(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/activities/${id}`);
  }

  coaches(): Observable<Coach[]> {
    return this.http.get<Coach[]>(`${this.base}/coaches`);
  }

  createCoach(c: Partial<Coach>): Observable<Coach> {
    return this.http.post<Coach>(`${this.base}/coaches`, c);
  }

  updateCoach(id: string, c: Partial<Coach>): Observable<Coach> {
    return this.http.put<Coach>(`${this.base}/coaches/${id}`, c);
  }

  deleteCoach(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/coaches/${id}`);
  }

  branches(): Observable<Branch[]> {
    return this.http.get<Branch[]>(`${this.base}/branches`);
  }

  createBranch(b: Partial<Branch>): Observable<Branch> {
    return this.http.post<Branch>(`${this.base}/branches`, b);
  }

  updateBranch(id: string, b: Partial<Branch>): Observable<Branch> {
    return this.http.put<Branch>(`${this.base}/branches/${id}`, b);
  }

  deleteBranch(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/branches/${id}`);
  }

  schedules(): Observable<ScheduleEntry[]> {
    return this.http.get<ScheduleEntry[]>(`${this.base}/schedules`);
  }

  createSchedule(s: Partial<ScheduleEntry>): Observable<ScheduleEntry> {
    return this.http.post<ScheduleEntry>(`${this.base}/schedules`, s);
  }

  updateSchedule(id: string, s: Partial<ScheduleEntry>): Observable<ScheduleEntry> {
    return this.http.put<ScheduleEntry>(`${this.base}/schedules/${id}`, s);
  }

  deleteSchedule(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/schedules/${id}`);
  }

  bookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.base}/bookings`);
  }

  updateBookingStatus(id: string, status: string): Observable<Booking> {
    return this.http.put<Booking>(`${this.base}/bookings/${id}`, { status });
  }

  // ---- membership display (prices stay Odoo-owned) ----
  membershipPlans(): Observable<MembershipPlan[]> {
    return this.http.get<MembershipPlan[]>(`${this.base}/membership-plans`);
  }

  updateMembershipPlan(id: string, display: Partial<MembershipPlan>): Observable<MembershipPlan> {
    return this.http.put<MembershipPlan>(`${this.base}/membership-plans/${id}`, display);
  }

  // ---- customers & leads ----
  customers(): Observable<AdminCustomer[]> {
    return this.http.get<AdminCustomer[]>(`${this.base}/customers`);
  }

  updateCustomer(id: string, c: Partial<AdminCustomer>): Observable<AdminCustomer> {
    return this.http.put<AdminCustomer>(`${this.base}/customers/${id}`, c);
  }

  leads(): Observable<Lead[]> {
    return this.http.get<Lead[]>(`${this.base}/leads`);
  }

  updateLead(id: string, l: Partial<Lead>): Observable<Lead> {
    return this.http.put<Lead>(`${this.base}/leads/${id}`, l);
  }

  // ---- roles ----
  roles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.base}/roles`);
  }

  updateRole(id: string, role: Partial<Role>): Observable<Role> {
    return this.http.put<Role>(`${this.base}/roles/${id}`, role);
  }
}
