import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG, ApiConfig } from '../core/api-config';
import { OdooLogEntry, OdooStatus } from '../models';

/** Admin operations for the Odoo ERP integration. */
@Injectable({ providedIn: 'root' })
export class OdooIntegrationService {
  private readonly http = inject(HttpClient);
  private readonly config = inject<ApiConfig>(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin/integrations/odoo`;
  }

  status(): Observable<OdooStatus> {
    return this.http.get<OdooStatus>(this.base);
  }

  testConnection(): Observable<{ success?: boolean; message?: string }> {
    return this.http.post<{ success?: boolean; message?: string }>(`${this.base}/test`, {});
  }

  syncPlans(): Observable<{ success?: boolean; synced?: number; message?: string }> {
    return this.http.post<{ success?: boolean; synced?: number; message?: string }>(`${this.base}/sync-plans`, {});
  }

  retryFailed(): Observable<{ success?: boolean; retried?: number; message?: string }> {
    return this.http.post<{ success?: boolean; retried?: number; message?: string }>(`${this.base}/retry-failed`, {});
  }

  logs(): Observable<OdooLogEntry[]> {
    return this.http.get<OdooLogEntry[]>(`${this.base}/logs`);
  }
}
