import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Shared card shell for auth screens (dark panel over gradient backdrop). */
@Component({
  selector: 'app-auth-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="auth-page">
      <div class="bg" aria-hidden="true"></div>
      <div class="card">
        <img src="assets/brand/motion-park-symbol-256.png" alt="Motion Park" width="52" height="52" />
        <h1>{{ title }}</h1>
        @if (subtitle) { <p class="subtitle">{{ subtitle }}</p> }
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    .auth-page {
      position: relative; min-height: 100vh;
      display: grid; place-items: center;
      padding: 110px 20px 60px;
      background: var(--background);
    }
    .bg {
      position: absolute; inset: 0;
      background:
        radial-gradient(circle at 20% 25%, rgba(255,122,0,.12), transparent 40%),
        radial-gradient(circle at 80% 70%, rgba(138,43,226,.14), transparent 40%);
    }
    .card {
      position: relative;
      width: 100%; max-width: 440px;
      border-radius: 28px; border: 1px solid var(--border);
      background: #1b1b22;
      padding: 2.5rem;
      box-shadow: 0 30px 80px rgba(0,0,0,.4);
    }
    h1 { margin-top: 1.25rem; font-size: 1.7rem; font-weight: 900; }
    .subtitle { margin-top: .5rem; color: rgba(245,245,247,.55); font-size: .92rem; }
    .grid { display: grid; gap: 1rem; margin-top: 1.75rem; }
    .forgot { font-size: .82rem; color: #FF9B50; font-weight: 700; &:hover { text-decoration: underline; } }
    .switch { margin-top: 1.5rem; text-align: center; font-size: .88rem; color: rgba(245,245,247,.55); }
    .switch a { color: var(--primary); font-weight: 700; &:hover { text-decoration: underline; } }
  `,
})
export class AuthCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
