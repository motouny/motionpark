import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG, ApiConfig } from '../core/api-config';
import { Booking, CreateBookingResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly config = inject<ApiConfig>(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/account/bookings`;
  }

  create(scheduleId: string, idempotencyKey?: string): Observable<CreateBookingResponse> {
    return this.http.post<CreateBookingResponse>(this.base, { scheduleId, idempotencyKey });
  }

  cancel(id: string): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/cancel`, {});
  }

  list(status?: string): Observable<Booking[]> {
    const url = status ? `${this.base}?status=${encodeURIComponent(status)}` : this.base;
    return this.http.get<Booking[]>(url);
  }
}

/** Generate a UUID v4 idempotency key. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
