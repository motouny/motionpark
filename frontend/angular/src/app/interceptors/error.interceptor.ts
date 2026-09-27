import { HttpContextToken, HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { normalizeHttpError } from '../core/errors';
import { ToastService } from '../shared/toast.service';

/** Set on a request to opt out of the global error toast. */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/**
 * Normalizes HTTP failures into friendly toasts. 401s are handled by the
 * auth interceptor (refresh flow), so they are skipped here.
 */
export function errorInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && !req.context.get(SKIP_ERROR_TOAST)) {
        if (err.status === 401) {
          // The auth interceptor owns the refresh/login-redirect flow.
        } else if (err.status === 402) {
          // Payment-not-configured is handled by the calling feature (clear in-UI state).
        } else if (err.status === 0) {
          toast.error('Network error', 'The server is unreachable. Showing fallback content where possible.');
        } else if (err.status >= 500) {
          const normalized = normalizeHttpError(err);
          toast.error('Server error', normalized.message);
        } else if (err.status !== 404) {
          const normalized = normalizeHttpError(err);
          toast.error(normalized.code || 'Request failed', normalized.message);
        }
      }
      return throwError(() => err);
    }),
  );
}
