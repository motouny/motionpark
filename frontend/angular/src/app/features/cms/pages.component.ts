import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { CmsPage } from '../../models';
import { AdminService } from '../../services/admin.service';
import { EmptyComponent } from '../../shared/empty.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';
import { ToastService } from '../../shared/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, LoadingComponent, EmptyComponent, ErrorStateComponent],
  template: `
    <div class="admin-page-head">
      <div><h1>{{ i18n.t('admin.pages') }}</h1></div>
      <button class="btn gradient-button btn-sm" (click)="startCreate()"><app-icon name="plus" size="0.95rem" /> {{ i18n.t('common.create') }}</button>
    </div>
    @if (formOpen()) {
      <div class="form-panel">
        <h3>{{ editing() ? i18n.t('common.edit') : i18n.t('common.create') }}</h3>
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="form-grid-2">
            <div><label class="form-label">titleAr *</label><input class="form-input" formControlName="titleAr" /></div>
            <div><label class="form-label">titleEn *</label><input class="form-input" formControlName="titleEn" /></div>
            <div><label class="form-label">slug *</label><input class="form-input" formControlName="slug" /></div>
          </div>
          <label class="form-label">contentAr</label><textarea class="form-input" rows="3" formControlName="contentAr"></textarea>
          <label class="form-label">contentEn</label><textarea class="form-input" rows="3" formControlName="contentEn"></textarea>
          <div class="form-actions">
            <button class="btn btn-ghost" type="button" (click)="formOpen.set(false)">{{ i18n.t('common.cancel') }}</button>
            <button class="btn gradient-button" type="submit" [disabled]="form.invalid || saving()">{{ saving() ? i18n.t('common.saving') : i18n.t('common.save') }}</button>
          </div>
        </form>
      </div>
    }
    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else if (items().length === 0) {
      <app-empty [message]="i18n.t('common.noResults')" />
    } @else {
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>{{ i18n.t('common.title') }}</th><th>Slug</th><th class="table-actions">{{ i18n.t('common.actions') }}</th></tr></thead>
          <tbody>
            @for (p of items(); track p.id) {
              <tr>
                <td><strong>{{ p.titleAr }}</strong><br /><small style="color: var(--muted-foreground)">{{ p.titleEn }}</small></td>
                <td>{{ p.slug }}</td>
                <td><div class="table-actions">
                  <button class="icon-btn" (click)="startEdit(p)" [attr.aria-label]="i18n.t('common.edit')"><app-icon name="edit" size="0.9rem" /></button>
                  <button class="icon-btn danger" (click)="remove(p)" [attr.aria-label]="i18n.t('common.delete')"><app-icon name="trash" size="0.9rem" /></button>
                </div></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class CmsPagesComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly admin = inject(AdminService);
  protected readonly fb = inject(FormBuilder);
  protected readonly toast = inject(ToastService);

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<CmsPage | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    titleAr: ['', Validators.required],
    titleEn: ['', Validators.required],
    slug: ['', Validators.required],
    contentAr: [''],
    contentEn: [''],

  });

  protected readonly loader = createLoader<CmsPage[]>(
    () => this.admin.pages().pipe(catchError(() => of([] as CmsPage[]))),
    [],
  );
  protected readonly items = computed(() => this.loader.data());

  protected startCreate(): void {
    this.editing.set(null);
    this.form.reset({ titleAr: '', titleEn: '', slug: '', contentAr: '', contentEn: '' });
    this.formOpen.set(true);
  }

  protected startEdit(p: CmsPage): void {
    this.editing.set(p);
    this.form.patchValue(p);
    this.formOpen.set(true);
  }

  protected save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const payload = { titleAr: v.titleAr ?? '', titleEn: v.titleEn ?? '', slug: v.slug ?? '', contentAr: v.contentAr || undefined, contentEn: v.contentEn || undefined };
    const cur = this.editing();
    this.saving.set(true);
    (cur ? this.admin.updatePage(cur.id!, payload) : this.admin.createPage(payload)).subscribe({
      next: () => { this.saving.set(false); this.formOpen.set(false); this.toast.success(this.i18n.t('common.saved')); this.loader.reload(); },
      error: () => { this.saving.set(false); this.toast.error(this.i18n.t('common.error')); },
    });
  }

  protected remove(p: CmsPage): void {
    if (!window.confirm(this.i18n.t('common.deleteConfirmBody'))) return;
    this.admin.deletePage(p.id!).subscribe({ next: () => { this.toast.success(this.i18n.t('common.deleted')); this.loader.reload(); }, error: () => this.toast.error(this.i18n.t('common.error')) });
  }
}
