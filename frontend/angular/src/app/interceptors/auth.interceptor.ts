import { HttpBackend, HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { API_CONFIG, ApiConfig } from '../core/api-config';
import { AuthStore } from '../core/auth.store';
import { TokenStorage } from '../core/token-storage';

/**
 * Attaches `Authorization: Bearer <jwt>` and, on a 401 from a non-auth
 * endpoint, performs a single-flight refresh and retries the request once.
 */
export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const storage = inject(TokenStorage);
  const store = inject(AuthStore);
  const backend = inject(HttpBackend);
  const config = inject<ApiConfig>(API_CONFIG);
  const router = inject(Router);

  const token = storage.accessToken;
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !isAuthEndpoint(req.url)) {
        return refreshAndRetry(req, next, storage, store, backend, config, router);
      }
      return throwError(() => err);
    }),
  );
}

let refreshInFlight: Promise<string | null> | null = null;

function refreshAndRetry(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  storage: TokenStorage,
  store: AuthStore,
  backend: HttpBackend,
  config: ApiConfig,
  router: Router,
): Observable<HttpEvent<unknown>> {
  refreshInFlight ??= performRefresh(storage, store, backend, config, router).finally(() => {
    refreshInFlight = null;
  });

  return new Observable<HttpEvent<unknown>>((subscriber) => {
    refreshInFlight!.then((token) => {
      if (!token) {
        subscriber.error(new HttpErrorResponse({ status: 401, statusText: 'Session expired' }));
        return;
      }
      const retryReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      next(retryReq).subscribe({
        next: (event) => subscriber.next(event),
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });
    }).catch((err) => subscriber.error(err));
  });
}

/** Uses HttpBackend directly so the refresh call itself bypasses interceptors. */
function performRefresh(
  storage: TokenStorage,
  store: AuthStore,
  backend: HttpBackend,
  config: ApiConfig,
  router: Router,
): Promise<string | null> {
  const refreshToken = storage.refreshToken;
  if (!refreshToken) {
    store.clear();
    return Promise.resolve(null);
  }

  return new Promise<string | null>((resolve) => {
    let settled = false;
    const done = (token: string | null) => {
      if (!settled) {
        settled = true;
        resolve(token);
      }
    };
    const req = new HttpRequest('POST', `${config.baseUrl}/auth/refresh`, { refreshToken });
    backend.handle(req).subscribe({
      next: (event) => {
        const body = (event as { body?: { accessToken?: string; refreshToken?: string } }).body;
        if (body?.accessToken) {
          storage.save({ accessToken: body.accessToken, refreshToken: body.refreshToken ?? refreshToken });
          done(body.accessToken);
        }
      },
      error: () => {
        store.clear();
        store.markChecked();
        router.navigate(['/login']).catch(() => undefined);
        done(null);
      },
      complete: () => done(null),
    });
  });
}

function isAuthEndpoint(url: string): boolean {
  return /\/api\/auth\//.test(url);
}
