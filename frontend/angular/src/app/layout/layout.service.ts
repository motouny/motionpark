import { Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Tracks whether the current route belongs to the admin area (no public chrome). */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly adminArea = signal(false);

  readonly isAdminArea = this.adminArea.asReadonly();

  constructor(router: Router) {
    router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.adminArea.set(e.urlAfterRedirects.startsWith('/admin')));
  }
}
