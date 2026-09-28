import { MembershipPlan } from './membership.models';
import { LookupRef } from './api.models';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  preferredLanguage?: 'ar' | 'en' | string;
  roles?: string[];
  createdAt?: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface ProfileUpdate {
  name?: string;
  email?: string;
  phone?: string;
  preferredLanguage?: string;
}

export interface AccountMembership {
  membership: CustomerMembershipLike | null;
  plan: MembershipPlan | null;
}

export interface CustomerMembershipLike {
  id: string;
  status: string;
  startDate?: string;
  endDate?: string;
  remainingSessions?: number | null;
  autoRenew?: boolean;
}

export interface Booking {
  id: string;
  scheduleId: string;
  status: string;
  createdAt?: string;
  schedule?: ScheduleSummary | null;
  scheduleDate?: string;
  startTime?: string;
  endTime?: string;
  activity?: LookupRef | null;
  branch?: LookupRef | null;
  coach?: LookupRef | null;
  /** admin list only */
  customerName?: string;
  customerPhone?: string;
  allowedStatuses?: string[];
}

export interface ScheduleSummary {
  id: string;
  activityNameAr?: string;
  activityNameEn?: string;
  branchNameAr?: string;
  branchNameEn?: string;
  coachNameAr?: string;
  coachNameEn?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  activity?: LookupRef | null;
  branch?: LookupRef | null;
  coach?: LookupRef | null;
}

export interface CreateBookingResponse extends Booking {
  waitlisted?: boolean;
}

export interface Payment {
  id: string;
  amount: number;
  currency?: string;
  status?: string;
  method?: string;
  createdAt?: string;
  description?: string;
}

export interface Invoice {
  id: string;
  number?: string;
  date?: string;
  amount?: number;
  vat?: number;
  total?: number;
  status?: string;
  pdfUrl?: string | null;
}

export interface NotificationItem {
  id: string;
  titleAr?: string;
  titleEn?: string;
  bodyAr?: string;
  bodyEn?: string;
  title?: string;
  body?: string;
  read?: boolean;
  createdAt?: string;
  type?: string;
}

export interface LeadPayload {
  name: string;
  phone: string;
  email?: string;
  type: 'contact' | 'callback' | 'trial' | 'membership_interest';
  branchId?: string;
  activityId?: string;
  membershipPlanId?: string;
  message?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
}
