import { signal } from '@angular/core';
import { Observable } from 'rxjs';

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

  const load = (): void => {
    loading.set(true);
    error.set(false);
    fetcher().subscribe({
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
