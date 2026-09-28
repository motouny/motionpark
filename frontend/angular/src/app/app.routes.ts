import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
    title: 'Motion Park — مجمع رياضي ورفاهي للنساء والفتيات',
  },
  {
    path: 'activities',
    loadComponent: () => import('./features/activities/activities.component').then((m) => m.ActivitiesComponent),
    title: 'Motion Park — الأنشطة',
  },
  {
    path: 'activities/:slug',
    loadComponent: () => import('./features/activities/activity-detail.component').then((m) => m.ActivityDetailComponent),
  },
  {
    path: 'memberships',
    loadComponent: () => import('./features/memberships/memberships.component').then((m) => m.MembershipsComponent),
    title: 'Motion Park — العضويات',
  },
  {
    path: 'memberships/:slug',
    loadComponent: () => import('./features/memberships/membership-detail.component').then((m) => m.MembershipDetailComponent),
  },
  {
    path: 'schedule',
    loadComponent: () => import('./features/schedules/schedule.component').then((m) => m.ScheduleComponent),
    title: 'Motion Park — جدول الحصص',
  },
  {
    path: 'coaches',
    loadComponent: () => import('./features/coaches/coaches.component').then((m) => m.CoachesComponent),
    title: 'Motion Park — المدربات',
  },
  {
    path: 'coaches/:slug',
    loadComponent: () => import('./features/coaches/coach-detail.component').then((m) => m.CoachDetailComponent),
  },
  {
    path: 'branches',
    loadComponent: () => import('./features/branches/branches.component').then((m) => m.BranchesComponent),
    title: 'Motion Park — الفروع',
  },
  {
    path: 'branches/:slug',
    loadComponent: () => import('./features/branches/branch-detail.component').then((m) => m.BranchDetailComponent),
  },
  {
    path: 'about',
    loadComponent: () => import('./features/pages/cms-page.component').then((m) => m.CmsPageComponent),
    data: { slug: 'about' },
    title: 'Motion Park — عنّا',
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact.component').then((m) => m.ContactComponent),
    title: 'Motion Park — تواصلي معنا',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
    title: 'Motion Park — تسجيل الدخول',
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent),
    title: 'Motion Park — حساب جديد',
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
    title: 'Motion Park — استعادة كلمة المرور',
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
    title: 'Motion Park — كلمة مرور جديدة',
  },
  {
    path: 'privacy',
    loadComponent: () => import('./features/pages/cms-page.component').then((m) => m.CmsPageComponent),
    data: { slug: 'privacy' },
    title: 'Motion Park — سياسة الخصوصية',
  },
  {
    path: 'terms',
    loadComponent: () => import('./features/pages/cms-page.component').then((m) => m.CmsPageComponent),
    data: { slug: 'terms' },
    title: 'Motion Park — شروط الاستخدام',
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/account-shell.component').then((m) => m.AccountShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'profile' },
      {
        path: 'profile',
        loadComponent: () => import('./features/account/profile.component').then((m) => m.ProfileComponent),
        title: 'Motion Park — الملف الشخصي',
      },
      {
        path: 'membership',
        loadComponent: () => import('./features/account/membership.component').then((m) => m.MembershipComponent),
        title: 'Motion Park — عضويتي',
      },
      {
        path: 'bookings',
        loadComponent: () => import('./features/account/bookings.component').then((m) => m.BookingsComponent),
        title: 'Motion Park — حجوزاتي',
      },
      {
        path: 'payments/callback',
        loadComponent: () => import('./features/account/payment-callback.component').then((m) => m.PaymentCallbackComponent),
        title: 'Motion Park — تأكيد الدفع',
      },
      {
        path: 'payments',
        loadComponent: () => import('./features/account/payments.component').then((m) => m.PaymentsComponent),
        title: 'Motion Park — مدفوعاتي',
      },
      {
        path: 'invoices',
        loadComponent: () => import('./features/account/invoices.component').then((m) => m.InvoicesComponent),
        title: 'Motion Park — الفواتير',
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications.component').then((m) => m.NotificationsComponent),
        title: 'Motion Park — الإشعارات',
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['SuperAdmin', 'ContentManager', 'Marketing', 'MembershipManager', 'ScheduleManager', 'BranchManager', 'CustomerService', 'FinanceViewer', 'admin', 'manager'])],
    loadComponent: () => import('./features/admin/admin-shell.component').then((m) => m.AdminShellComponent),
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: '404 — Motion Park',
  },
];
