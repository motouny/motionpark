import { signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

/** Signal-based data loader: `const { data, loading, error, reload } = createLoader(() => svc.list(), [])` */
export function createLoader<T>(fetcher: () => Observable<T>, initial: T): {
  data: ReturnType<typeof signal<T>>;
  loading: ReturnType<typeof signal<boolean>>;
  error: ReturnType<typeof signal<boolean>>;
  reload: () => void;
} {
  const data = signal<T>(initial);
  const loading = signal(true);
  const error = signal(false);

  let inFlight: Subscription | undefined;

  // A reload cancels the previous request, so a slow earlier response can never overwrite newer data.
  const load = (): void => {
    inFlight?.unsubscribe();
    loading.set(true);
    error.set(false);
    inFlight = fetcher().subscribe({
      next: (value) => {
        data.set(value);
        loading.set(false);
      },
      error: () => {
        loading.set(false);
        error.set(true);
      },
    });
  };

  load();
  return { data, loading, error, reload: load };
}
