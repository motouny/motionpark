import { LookupRef } from './api.models';

export interface MembershipPlan {
  id: string;
  odooProductId?: number | null;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  price: number;
  vat?: number;
  currency: string;
  duration: number;
  durationUnit: 'month' | 'year' | string;
  sessionLimit: number;
  branches: LookupRef[];
  activities: LookupRef[];
  featured: boolean;
  featuresAr?: string[];
  featuresEn?: string[];
  sortOrder: number;
  active: boolean;
}

export interface CustomerMembership {
  id: string;
  plan: MembershipPlan;
  status: string;
  startDate?: string;
  endDate?: string;
  remainingSessions?: number | null;
  autoRenew?: boolean;
}

export interface Subscription {
  id: string;
  plan: MembershipPlan | null;
  status: string;
  startDate?: string;
  endDate?: string;
  nextBillingDate?: string;
  billingCycle?: string;
  remainingSessions?: number | null;
  autoRenew?: boolean;
  paymentStatus?: string;
}

export interface QrResponse {
  qrToken: string;
}

/** `402 PAYMENT_CREDENTIALS_REQUIRED` — payment provider not configured server-side. */
export const PAYMENT_CREDENTIALS_REQUIRED = 'PAYMENT_CREDENTIALS_REQUIRED';
