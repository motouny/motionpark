import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard.component').then((m) => m.AdminDashboardComponent),
    title: 'Motion Park — Dashboard',
  },
  {
    path: 'cms/homepage',
    loadComponent: () => import('../cms/homepage-sections.component').then((m) => m.HomepageSectionsComponent),
    title: 'Motion Park — Homepage sections',
  },
  {
    path: 'cms/pages',
    loadComponent: () => import('../cms/pages.component').then((m) => m.CmsPagesComponent),
    title: 'Motion Park — Pages',
  },
  {
    path: 'cms/banners',
    loadComponent: () => import('../cms/banners.component').then((m) => m.BannersComponent),
    title: 'Motion Park — Banners',
  },
  {
    path: 'cms/faqs',
    loadComponent: () => import('../cms/faqs.component').then((m) => m.FaqsAdminComponent),
    title: 'Motion Park — FAQs',
  },
  {
    path: 'cms/testimonials',
    loadComponent: () => import('../cms/testimonials.component').then((m) => m.TestimonialsAdminComponent),
    title: 'Motion Park — Testimonials',
  },
  {
    path: 'media',
    loadComponent: () => import('./pages/media-library.component').then((m) => m.MediaLibraryComponent),
    title: 'Motion Park — Media library',
  },
  {
    path: 'activities',
    loadComponent: () => import('./pages/activities-admin.component').then((m) => m.ActivitiesAdminComponent),
    title: 'Motion Park — Activities',
  },
  {
    path: 'coaches',
    loadComponent: () => import('./pages/coaches-admin.component').then((m) => m.CoachesAdminComponent),
    title: 'Motion Park — Coaches',
  },
  {
    path: 'branches',
    loadComponent: () => import('./pages/branches-admin.component').then((m) => m.BranchesAdminComponent),
    title: 'Motion Park — Branches',
  },
  {
    path: 'schedules',
    loadComponent: () => import('./pages/schedules-admin.component').then((m) => m.SchedulesAdminComponent),
    title: 'Motion Park — Schedules',
  },
  {
    path: 'bookings',
    loadComponent: () => import('./pages/bookings-admin.component').then((m) => m.BookingsAdminComponent),
    title: 'Motion Park — Bookings',
  },
  {
    path: 'membership-plans',
    loadComponent: () => import('./pages/membership-plans.component').then((m) => m.MembershipPlansAdminComponent),
    title: 'Motion Park — Membership plans',
  },
  {
    path: 'customers',
    loadComponent: () => import('./pages/customers-admin.component').then((m) => m.CustomersAdminComponent),
    title: 'Motion Park — Customers',
  },
  {
    path: 'leads',
    loadComponent: () => import('./pages/leads-admin.component').then((m) => m.LeadsAdminComponent),
    title: 'Motion Park — Leads',
  },
  {
    path: 'integrations/odoo',
    loadComponent: () => import('./pages/odoo-integration.component').then((m) => m.OdooIntegrationComponent),
    title: 'Motion Park — Odoo',
  },
  {
    path: 'settings/brand',
    loadComponent: () => import('../settings/brand-settings.component').then((m) => m.BrandSettingsComponent),
    title: 'Motion Park — Brand settings',
  },
  {
    path: 'settings/system',
    loadComponent: () => import('../settings/system-settings.component').then((m) => m.SystemSettingsComponent),
    title: 'Motion Park — System settings',
  },
  {
    path: 'roles',
    loadComponent: () => import('./pages/roles.component').then((m) => m.RolesAdminComponent),
    title: 'Motion Park — Roles',
  },
  {
    path: 'audit-logs',
    loadComponent: () => import('./pages/audit-logs.component').then((m) => m.AuditLogsComponent),
    title: 'Motion Park — Audit logs',
  },
];
