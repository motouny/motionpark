import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { NotificationItem } from '../../models';
import { AccountService } from '../../services/account.service';
import { EmptyComponent } from '../../shared/empty.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent, LoadingComponent, EmptyComponent, ErrorStateComponent],
  template: `
    <div class="head-row">
      <h2 class="page-title">{{ i18n.t('account.notifications.title') }}</h2>
      @if (unreadCount() > 0) {
        <button class="btn btn-ghost btn-sm" (click)="markAll()">
          {{ i18n.t('account.notifications.markAll') }}
        </button>
      }
    </div>

    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else if (items().length === 0) {
      <div class="card empty-card">
        <app-icon name="bell" size="2.4rem" />
        <p>{{ i18n.t('account.notifications.empty') }}</p>
      </div>
    } @else {
      <ul class="notif-list">
        @for (n of items(); track n.id) {
          <li class="notif" [class.unread]="!n.read">
            <span class="dot" aria-hidden="true"></span>
            <div class="body">
              <strong>{{ titleOf(n) }}</strong>
              @if (bodyOf(n)) { <p>{{ bodyOf(n) }}</p> }
              <small>{{ n.createdAt | date: 'medium' }}</small>
            </div>
            @if (!n.read) {
              <button class="btn btn-ghost btn-sm" (click)="markRead(n)">
                {{ i18n.t('account.notifications.markRead') }}
              </button>
            }
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .head-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .page-title { font-size: 1.3rem; font-weight: 900; margin-bottom: 1.5rem; }
    .notif-list { display: grid; gap: .75rem; }
    .notif {
      display: flex; align-items: flex-start; gap: 1rem;
      border: 1px solid var(--border); border-radius: 18px; background: var(--card);
      padding: 1.1rem 1.35rem;
      .dot { width: .6rem; height: .6rem; border-radius: 50%; background: var(--border); margin-top: .45rem; flex-shrink: 0; }
      &.unread .dot { background: var(--primary); box-shadow: 0 0 10px rgba(255,64,129,.6); }
      .body { flex: 1; }
      .body strong { font-size: .95rem; }
      .body p { margin-top: .25rem; color: rgba(245,245,247,.65); font-size: .86rem; line-height: 1.7; }
      .body small { display: block; margin-top: .4rem; color: var(--muted-foreground); font-size: .74rem; }
    }
    .empty-card { display: grid; justify-items: center; gap: 1rem; color: var(--muted-foreground); padding: 3.5rem 2rem; }
  `,
})
export class NotificationsComponent {
  protected readonly i18n = inject(I18nService);
  private readonly account = inject(AccountService);

  protected readonly loader = createLoader<NotificationItem[]>(
    () => this.account.notifications().pipe(catchError(() => of([] as NotificationItem[]))),
    [],
  );
  protected readonly items = computed(() =>
    [...this.loader.data()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
  );
  protected readonly unreadCount = computed(() => this.items().filter((n) => !n.read).length);

  protected titleOf(n: NotificationItem): string {
    const direct = this.i18n.lang() === 'ar' ? (n.titleAr ?? n.title) : (n.titleEn ?? n.title);
    return direct ?? '';
  }

  protected bodyOf(n: NotificationItem): string {
    return this.i18n.lang() === 'ar' ? (n.bodyAr ?? n.body ?? '') : (n.bodyEn ?? n.body ?? '');
  }

  protected markRead(n: NotificationItem): void {
    n.read = true;
    this.account.markNotificationRead(n.id).subscribe();
  }

  protected markAll(): void {
    for (const n of this.items()) {
      if (!n.read) this.markRead(n);
    }
  }
}
