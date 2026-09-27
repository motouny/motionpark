import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { MediaAsset } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { EmptyComponent } from '../../../shared/empty.component';
import { ErrorStateComponent } from '../../../shared/error-state.component';
import { IconComponent } from '../../../shared/icon.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { ToastService } from '../../../shared/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, LoadingComponent, EmptyComponent, ErrorStateComponent],
  template: `
    <div class="admin-page-head">
      <div>
        <h1>{{ i18n.t('admin.mediaLibrary') }}</h1>
      </div>
      <label class="upload-btn btn gradient-button btn-sm">
        <app-icon name="upload" size="0.95rem" />
        {{ i18n.t('admin.media.upload') }}
        <input type="file" multiple hidden (change)="onUpload($event)" accept="image/*,.svg" />
      </label>
    </div>

    <form class="filters" [formGroup]="filters" (ngSubmit)="search()">
      <div class="search-box">
        <app-icon name="search" size="1rem" />
        <input class="form-input" formControlName="search" [placeholder]="i18n.t('admin.media.searchPlaceholder')" />
      </div>
      <input class="form-input cat-input" formControlName="category" [placeholder]="i18n.t('admin.media.category')" />
      <button class="btn btn-ghost btn-sm" type="submit">{{ i18n.t('common.search') }}</button>
    </form>
    <p class="hint">{{ i18n.t('admin.media.uploadHint') }}</p>

    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else if (items().length === 0) {
      <app-empty [message]="i18n.t('common.noResults')" />
    } @else {
      <div class="media-grid">
        @for (m of items(); track m.id) {
          <article class="media-tile">
            <button class="media-thumb" (click)="preview(m)" [style.backgroundImage]="thumb(m)" [attr.aria-label]="i18n.t('admin.media.preview')"></button>
            <div class="media-meta">
              <strong>{{ m.title || m.fileName || m.id }}</strong>
              <span class="muted">{{ m.category || i18n.t('admin.media.uncategorized') }}</span>
              <span class="muted alt">{{ m.altAr || '—' }} / {{ m.altEn || '—' }}</span>
              <div class="tile-actions">
                <button class="icon-btn" (click)="edit(m)" [attr.aria-label]="i18n.t('common.edit')"><app-icon name="edit" size="0.9rem" /></button>
                <label class="icon-btn" [attr.aria-label]="i18n.t('admin.media.replace')">
                  <app-icon name="upload" size="0.9rem" />
                  <input type="file" hidden (change)="onReplace(m, $event)" accept="image/*,.svg" />
                </label>
                <button class="icon-btn danger" (click)="remove(m)" [attr.aria-label]="i18n.t('common.delete')"><app-icon name="trash" size="0.9rem" /></button>
              </div>
            </div>
          </article>
        }
      </div>
    }

    @if (editing(); as m) {
      <div class="modal-backdrop" role="dialog" aria-modal="true" (click)="closeEdit($event)">
        <div class="modal-card modal-wide">
          <button class="modal-close" (click)="editing.set(null)" [attr.aria-label]="i18n.t('common.close')">
            <app-icon name="close" size="1rem" />
          </button>
          <h2 class="edit-title">{{ i18n.t('common.edit') }}</h2>
          <form [formGroup]="editForm" (ngSubmit)="saveEdit()" class="form-grid">
            <div>
              <label class="form-label">{{ i18n.t('admin.media.title') }}</label>
              <input class="form-input" formControlName="title" />
            </div>
            <div class="form-grid-2">
              <div>
                <label class="form-label">{{ i18n.t('admin.media.altAr') }}</label>
                <input class="form-input" formControlName="altAr" />
              </div>
              <div>
                <label class="form-label">{{ i18n.t('admin.media.altEn') }}</label>
                <input class="form-input" formControlName="altEn" />
              </div>
            </div>
            <div>
              <label class="form-label">{{ i18n.t('admin.media.category') }}</label>
              <input class="form-input" formControlName="category" />
            </div>
            <div class="form-actions">
              <button class="btn btn-ghost" type="button" (click)="editing.set(null)">{{ i18n.t('common.cancel') }}</button>
              <button class="btn gradient-button" type="submit" [disabled]="saving()">{{ i18n.t('common.save') }}</button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (previewing(); as m) {
      <div class="modal-backdrop" role="dialog" aria-modal="true" (click)="previewing.set(null)">
        <div class="modal-card" style="max-width: 560px;">
          <button class="modal-close" (click)="previewing.set(null)" [attr.aria-label]="i18n.t('common.close')">
            <app-icon name="close" size="1rem" />
          </button>
          <div class="preview-box" [style.backgroundImage]="thumb(m)"></div>
          <p class="muted" style="margin-top: 1rem;">{{ m.title || m.fileName }} · {{ m.mimeType }}</p>
          @if (m.altAr || m.altEn) {
            <p class="muted alt-line">ALT: {{ m.altAr || '—' }} / {{ m.altEn || '—' }}</p>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .upload-btn { cursor: pointer; }
    .filters { display: flex; gap: .75rem; flex-wrap: wrap; margin-bottom: .5rem; }
    .search-box { position: relative; flex: 1; min-width: 240px; display: flex; align-items: center; }
    .search-box app-icon { position: absolute; inset-inline-start: .9rem; color: var(--muted-foreground); }
    .search-box .form-input { padding-inline-start: 2.6rem; }
    .cat-input { max-width: 220px; }
    .hint { color: var(--muted-foreground); font-size: .8rem; margin-bottom: 1.5rem; }
    .media-thumb { display: block; width: 100%; border: 0; cursor: zoom-in; background-size: cover; background-position: center; }
    .tile-actions { display: flex; gap: .4rem; margin-top: .35rem; }
    .muted { color: var(--muted-foreground); font-size: .74rem; }
    .alt { direction: ltr; text-align: end; }
    .edit-title { font-size: 1.3rem; font-weight: 900; margin-bottom: 1.25rem; }
    .preview-box { width: 100%; aspect-ratio: 4/3; border-radius: 16px; background-size: contain; background-position: center; background-repeat: no-repeat; background-color: #101014; }
    .alt-line { font-size: .8rem; margin-top: .35rem; }
  `,
})
export class MediaLibraryComponent {
  protected readonly i18n = inject(I18nService);
  private readonly admin = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly editing = signal<MediaAsset | null>(null);
  protected readonly previewing = signal<MediaAsset | null>(null);
  protected readonly saving = signal(false);

  protected readonly filters = this.fb.group({ search: [''], category: [''] });

  protected readonly editForm = this.fb.group({
    title: [''],
    altAr: [''],
    altEn: [''],
    category: [''],
  });

  protected readonly loader = createLoader<MediaAsset[]>(() => this.load(), []);
  protected readonly items = computed(() => this.loader.data());

  private load() {
    const { search, category } = this.filters.getRawValue();
    return this.admin.media(search || undefined, category || undefined).pipe(catchError(() => of([] as MediaAsset[])));
  }

  protected thumb(m: MediaAsset): string {
    return m.url ? `url('${m.url}')` : `url('${this.admin.mediaFileUrl(m.id)}')`;
  }

  protected search(): void {
    this.loader.reload();
  }

  protected onUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    this.admin.uploadMedia(files).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('common.saved'));
        this.loader.reload();
      },
      error: () => this.toast.error(this.i18n.t('common.error')),
    });
  }

  protected onReplace(m: MediaAsset, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.admin.replaceMedia(m.id, file).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('common.saved'));
        this.loader.reload();
      },
      error: () => this.toast.error(this.i18n.t('common.error')),
    });
  }

  protected edit(m: MediaAsset): void {
    this.editing.set(m);
    this.editForm.patchValue({
      title: m.title ?? '',
      altAr: m.altAr ?? '',
      altEn: m.altEn ?? '',
      category: m.category ?? '',
    });
  }

  protected saveEdit(): void {
    const m = this.editing();
    if (!m) return;
    this.saving.set(true);
    const value = this.editForm.getRawValue();
    this.admin.updateMedia(m.id, {
      title: value.title ?? undefined,
      altAr: value.altAr ?? undefined,
      altEn: value.altEn ?? undefined,
      category: value.category ?? undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
        this.toast.success(this.i18n.t('common.saved'));
        this.loader.reload();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.i18n.t('common.error'));
      },
    });
  }

  protected remove(m: MediaAsset): void {
    if (!window.confirm(this.i18n.t('common.deleteConfirmBody'))) return;
    this.admin.deleteMedia(m.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('common.deleted'));
        this.loader.reload();
      },
      error: () => this.toast.error(this.i18n.t('common.error')),
    });
  }

  protected preview(m: MediaAsset): void {
    this.previewing.set(m);
  }

  protected closeEdit(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.editing.set(null);
  }
}
