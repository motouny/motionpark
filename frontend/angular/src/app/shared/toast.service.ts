import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSignal = signal<Toast[]>([]);
  private seq = 0;

  readonly toasts = this.toastsSignal.asReadonly();

  success(title: string, message?: string): void {
    this.push('success', title, message);
  }

  error(title: string, message?: string): void {
    this.push('error', title, message);
  }

  info(title: string, message?: string): void {
    this.push('info', title, message);
  }

  dismiss(id: number): void {
    this.toastsSignal.update((items) => items.filter((t) => t.id !== id));
  }

  private push(kind: ToastKind, title: string, message?: string): void {
    const id = ++this.seq;
    this.toastsSignal.update((items) => [...items, { id, kind, title, message }]);
    setTimeout(() => this.dismiss(id), 5200);
  }
}
