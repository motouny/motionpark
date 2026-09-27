import { ChangeDetectionStrategy, Component, Input, effect, inject, signal } from '@angular/core';
import { toDataURL } from 'qrcode';
import { AccountService } from '../services/account.service';

/** Renders the rotating entry QR token from `/api/account/qr`. */
@Component({
  selector: 'app-qr-display',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qr-box">
      @if (loading()) {
        <span class="spinner"></span>
      } @else if (dataUrl()) {
        <img [src]="dataUrl()" alt="Entry QR code" width="180" height="180" />
      } @else {
        <span class="err">—</span>
      }
    </div>
  `,
  styles: `
    .qr-box {
      display: grid;
      place-items: center;
      width: 208px;
      height: 208px;
      border-radius: 24px;
      background: #fff;
      padding: 12px;

      img { border-radius: 12px; }
      .err { color: #333; font-size: 2rem; }
    }
  `,
})
export class QrDisplayComponent {
  private readonly account = inject(AccountService);

  @Input() refreshTrigger: unknown = null;

  protected readonly dataUrl = signal<string | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    effect(() => {
      void this.refreshTrigger;
      this.loading.set(true);
      this.account.qr()
        .subscribe({
          next: ({ qrToken }) => {
            toDataURL(qrToken, { width: 180, margin: 1, color: { dark: '#121218', light: '#ffffff' } })
              .then((url: string) => {
                this.dataUrl.set(url);
                this.loading.set(false);
              })
              .catch(() => this.loading.set(false));
          },
          error: () => this.loading.set(false),
        });
    });
  }
}
