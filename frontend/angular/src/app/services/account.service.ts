import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG, ApiConfig } from '../core/api-config';
import {
  AccountMembership, Booking, Invoice, NotificationItem, Payment, QrResponse, Subscription,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly config = inject<ApiConfig>(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/account`;
  }

  membership(): Observable<AccountMembership> {
    return this.http.get<AccountMembership>(`${this.base}/membership`);
  }

  qr(): Observable<QrResponse> {
    return this.http.get<QrResponse>(`${this.base}/qr`);
  }

  bookings(status?: string): Observable<Booking[]> {
    const url = status ? `${this.base}/bookings?status=${encodeURIComponent(status)}` : `${this.base}/bookings`;
    return this.http.get<Booking[]>(url);
  }

  payments(): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.base}/payments`);
  }

  invoices(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.base}/invoices`);
  }

  notifications(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`${this.base}/notifications`);
  }

  markNotificationRead(id: string): Observable<unknown> {
    return this.http.post(`${this.base}/notifications/${id}/read`, {});
  }

  subscription(): Observable<Subscription> {
    return this.http.get<Subscription>(`${this.config.baseUrl}/account/subscription`);
  }

  cancelSubscription(id: string, reason?: string): Observable<unknown> {
    return this.http.post(`${this.config.baseUrl}/subscriptions/${id}/cancel`, { reason });
  }

  renewSubscription(id: string): Observable<unknown> {
    return this.http.post(`${this.config.baseUrl}/subscriptions/${id}/renew`, {});
  }
}
