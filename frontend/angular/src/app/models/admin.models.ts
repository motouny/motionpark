export interface DashboardStats {
  totalCustomers?: number;
  totalBookings?: number;
  totalLeads?: number;
  activeMemberships?: number;
  pendingBookings?: number;
  newLeads?: number;
  [key: string]: number | string | boolean | undefined;
}

export interface HealthStatus {
  status?: string;
  checks?: Record<string, unknown>;
  lastSyncAt?: string | null;
  failedJobs?: number;
}

export interface OdooStatus {
  connected: boolean;
  lastSuccessAt?: string | null;
  lastPlanSyncAt?: string | null;
  lastCustomerSyncAt?: string | null;
  failedJobs: number;
  pendingQueue: number;
}

export interface OdooLogEntry {
  id?: string;
  jobType?: string;
  status?: string;
  message?: string;
  createdAt?: string;
  retryCount?: number;
}

export interface AdminCustomer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string;
  preferredLanguage?: string;
  createdAt?: string;
  isActive?: boolean;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  type?: string;
  status?: string;
  message?: string;
  createdAt?: string;
}

export interface AuditLogEntry {
  id: string;
  entity?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  userName?: string;
  createdAt?: string;
  changes?: unknown;
}

export interface Role {
  id: string;
  name: string;
  permissions?: string[];
}

export interface AdminSettings {
  [key: string]: unknown;
}

export interface BrandSettings {
  logoPrimary?: string;
  logoDark?: string;
  logoLight?: string;
  favicon?: string;
  colors?: Record<string, string>;
  gradients?: Record<string, string>;
  typography?: Record<string, string>;
  contact?: Record<string, string>;
  socials?: Record<string, string>;
}
