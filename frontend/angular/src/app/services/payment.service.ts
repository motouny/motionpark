import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG, ApiConfig } from '../core/api-config';

/** `POST /api/payments/checkout` — settings for the browser payment form (amount in halalas). */
export interface PaymentCheckout {
  provider: string;
  publishableKey: string | null;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string | null;
  idempotencyKey: string;
  metadata: Record<string, string>;
}

/** Saved before the payment form may redirect for 3-D Secure; read back on the callback page. */
export interface PendingCheckout {
  planId: string;
  planSlug: string;
  idempotencyKey: string;
}

interface MoyasarGlobal { init(config: Record<string, unknown>): void }

const MOYASAR_VERSION = '1.14.0';
const MOYASAR_CDN = `https://cdn.moyasar.com/mpf/${MOYASAR_VERSION}`;
const PENDING_KEY = 'mp.pendingCheckout';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly config = inject<ApiConfig>(API_CONFIG);
  private readonly document = inject(DOCUMENT);
  private moyasarLoading?: Promise<MoyasarGlobal>;

  checkout(membershipPlanId: string): Observable<PaymentCheckout> {
    return this.http.post<PaymentCheckout>(`${this.config.baseUrl}/payments/checkout`, { membershipPlanId });
  }

  savePending(pending: PendingCheckout): void {
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending)); } catch { /* storage blocked: webhook still completes it */ }
  }

  takePending(): PendingCheckout | null {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      sessionStorage.removeItem(PENDING_KEY);
      return raw ? (JSON.parse(raw) as PendingCheckout) : null;
    } catch {
      return null;
    }
  }

  /**
   * Render Moyasar's payment form (mada, Visa/Mastercard, Apple Pay) into `selector`.
   * Card details go straight from the browser to Moyasar; afterwards Moyasar redirects to the
   * callback page with `?id=…&status=…`, which confirms the subscription with the API.
   */
  async mountMoyasarForm(selector: string, checkout: PaymentCheckout, lang: 'ar' | 'en'): Promise<void> {
    const moyasar = await this.loadMoyasar();
    const callbackUrl = checkout.callbackUrl || `${this.document.location.origin}/account/payments/callback`;
    moyasar.init({
      element: selector,
      amount: checkout.amount,
      currency: checkout.currency,
      description: checkout.description,
      publishable_api_key: checkout.publishableKey,
      callback_url: callbackUrl,
      language: lang,
      methods: ['creditcard', 'applepay'],
      supported_networks: ['mada', 'visa', 'mastercard'],
      apple_pay: {
        country: 'SA',
        label: 'Motion Park',
        validate_merchant_url: 'https://api.moyasar.com/v1/applepay/initiate',
      },
      metadata: checkout.metadata,
    });
  }

  private loadMoyasar(): Promise<MoyasarGlobal> {
    const win = this.document.defaultView as (Window & { Moyasar?: MoyasarGlobal }) | null;
    if (win?.Moyasar) return Promise.resolve(win.Moyasar);
    this.moyasarLoading ??= new Promise<MoyasarGlobal>((resolve, reject) => {
      const css = this.document.createElement('link');
      css.rel = 'stylesheet';
      css.href = `${MOYASAR_CDN}/moyasar.css`;
      this.document.head.appendChild(css);

      const script = this.document.createElement('script');
      script.src = `${MOYASAR_CDN}/moyasar.js`;
      script.async = true;
      script.onload = () => (win?.Moyasar ? resolve(win.Moyasar) : reject(new Error('Moyasar failed to load')));
      script.onerror = () => {
        this.moyasarLoading = undefined;
        reject(new Error('Moyasar failed to load'));
      };
      this.document.head.appendChild(script);
    });
    return this.moyasarLoading;
  }
}
