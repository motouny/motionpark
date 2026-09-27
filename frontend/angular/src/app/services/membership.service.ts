import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG, ApiConfig } from '../core/api-config';
import { MembershipPlan, Subscription } from '../models';

@Injectable({ providedIn: 'root' })
export class MembershipService {
  private readonly http = inject(HttpClient);
  private readonly config = inject<ApiConfig>(API_CONFIG);

  /** Auth-aware alias of the public read model. */
  plans(): Observable<MembershipPlan[]> {
    return this.http.get<MembershipPlan[]>(`${this.config.baseUrl}/memberships`);
  }

  /**
   * Create a subscription. May fail with `402 PAYMENT_CREDENTIALS_REQUIRED`
   * when no payment provider is configured — callers must handle that code.
   */
  subscribe(membershipPlanId: string, branchId?: string, paymentMethodId?: string, idempotencyKey?: string): Observable<Subscription> {
    return this.http.post<Subscription>(`${this.config.baseUrl}/subscriptions`, {
      membershipPlanId,
      branchId,
      paymentMethodId,
      idempotencyKey,
    });
  }
}
