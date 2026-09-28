import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map, Observable, of } from 'rxjs';
import { AuthStore } from '../core/auth.store';
import { AuthService } from '../services/auth.service';

function redirectToLogin(router: Router): UrlTree {
  const returnUrl = router.routerState.snapshot.url;
  return router.createUrlTree(['/login'], { queryParams: returnUrl && returnUrl !== '/' ? { returnUrl } : {} });
}

/** Requires an authenticated session; redirects to /login with a returnUrl. */
export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const store = inject(AuthStore);
  const auth = inject(AuthService);
  const router = inject(Router);

  if (store.user()) {
    return of(true);
  }
  if (store.hasSession()) {
    return auth.loadProfile().pipe(
      map((ok) => (ok ? true : redirectToLogin(router))),
    );
  }
  store.markChecked();
  return of(redirectToLogin(router));
};

/** Requires any of the given roles (e.g. roleGuard(['admin'])). */
export function roleGuard(requiredRoles: string[]): CanActivateFn {
  return (): Observable<boolean | UrlTree> => {
    const store = inject(AuthStore);
    const auth = inject(AuthService);
    const router = inject(Router);

    const allowed = () => (store.hasAnyRole(requiredRoles) ? true : router.createUrlTree(['/']));
    const resolve = () => of(allowed());

    if (store.user()) return resolve();
    if (store.hasSession()) {
      return auth.loadProfile().pipe(map(() => allowed()));
    }
    store.markChecked();
    return of(router.createUrlTree(['/login']));
  };
}
