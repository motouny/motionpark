import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, ApiErrorBody } from '../models';

/** Normalize an HttpErrorResponse into a stable ApiError shape. */
export function normalizeHttpError(err: unknown): ApiError {
  if (err instanceof HttpErrorResponse) {
    const body = (err.error ?? null) as ApiErrorBody | null;
    const rawCode = (typeof err.error === 'object' && err.error !== null && 'code' in err.error)
      ? String((err.error as { code?: unknown }).code ?? '') : '';
    const rawMessage = (typeof err.error === 'object' && err.error !== null && 'message' in err.error)
      ? String((err.error as { message?: unknown }).message ?? '') : '';
    return {
      status: err.status,
      code: (body?.error?.code ?? rawCode) || httpStatusCode(err.status),
      message: (body?.error?.message ?? rawMessage) || err.message,
    };
  }
  return { status: 0, code: 'UNKNOWN', message: err instanceof Error ? err.message : 'Unknown error' };
}

function httpStatusCode(status: number): string {
  switch (status) {
    case 0: return 'NETWORK_ERROR';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 402: return 'PAYMENT_REQUIRED';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'VALIDATION';
    case 429: return 'RATE_LIMITED';
    case 500: return 'SERVER_ERROR';
    default: return status >= 500 ? 'SERVER_ERROR' : 'REQUEST_ERROR';
  }
}
