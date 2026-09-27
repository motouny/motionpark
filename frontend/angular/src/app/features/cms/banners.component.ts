import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { Banner } from '../../models';
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
      <div><h1>{{ i18n.t('admin.banners') }}</h1></div>
      <button class="btn gradient-button btn-sm" (click)="startCreate()"><app-icon name="plus" size="0.95rem" /> {{ i18n.t('common.create') }}</button>
    </div>
    @if (formOpen()) {
      <div class="form-panel">
        <h3>{{ editing() ? i18n.t('common.edit') : i18n.t('common.create') }}</h3>
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="form-grid-2">
            <div><label class="form-label">titleAr *</label><input class="form-input" formControlName="titleAr" /></div>
            <div><label class="form-label">titleEn *</label><input class="form-input" formControlName="titleEn" /></div>
            <div><label class="form-label">subtitleAr</label><input class="form-input" formControlName="subtitleAr" /></div>
            <div><label class="form-label">subtitleEn</label><input class="form-input" formControlName="subtitleEn" /></div>
            <div><label class="form-label">imageUrl</label><input class="form-input" formControlName="imageUrl" /></div>
            <div><label class="form-label">ctaUrl</label><input class="form-input" formControlName="ctaUrl" /></div>
            <div><label class="checkbox-row"><input type="checkbox" formControlName="active" /> {{ i18n.t('common.active') }}</label></div>
          </div>
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
          <thead><tr><th>{{ i18n.t('common.title') }}</th><th>{{ i18n.t('common.status') }}</th><th class="table-actions">{{ i18n.t('common.actions') }}</th></tr></thead>
          <tbody>
            @for (b of items(); track b.id) {
              <tr>
                <td><strong>{{ b.titleAr }}</strong><br /><small style="color: var(--muted-foreground)">{{ b.titleEn }}</small></td>
                <td><span class="chip" [class]="'chip chip-' + (b.active ? 'success' : 'muted')">{{ b.active ? i18n.t('common.active') : i18n.t('common.inactive') }}</span></td>
                <td><div class="table-actions">
                  <button class="icon-btn" (click)="startEdit(b)" [attr.aria-label]="i18n.t('common.edit')"><app-icon name="edit" size="0.9rem" /></button>
                  <button class="icon-btn danger" (click)="remove(b)" [attr.aria-label]="i18n.t('common.delete')"><app-icon name="trash" size="0.9rem" /></button>
                </div></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class BannersComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly admin = inject(AdminService);
  protected readonly fb = inject(FormBuilder);
  protected readonly toast = inject(ToastService);

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Banner | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    titleAr: ['', Validators.required],
    titleEn: ['', Validators.required],
    subtitleAr: [''],
    subtitleEn: [''],
    imageUrl: [''],
    ctaUrl: [''],
    active: [true],
  });

  protected readonly loader = createLoader<Banner[]>(
    () => this.admin.banners().pipe(catchError(() => of([] as Banner[]))),
    [],
  );
  protected readonly items = computed(() => this.loader.data());

  protected startCreate(): void {
    this.editing.set(null);
    this.form.reset({ titleAr: '', titleEn: '', subtitleAr: '', subtitleEn: '', imageUrl: '', ctaUrl: '', active: true });
    this.formOpen.set(true);
  }

  protected startEdit(b: Banner): void {
    this.editing.set(b);
    this.form.patchValue(b);
    this.formOpen.set(true);
  }

  protected save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const payload = { titleAr: v.titleAr ?? '', titleEn: v.titleEn ?? '', subtitleAr: v.subtitleAr || undefined, subtitleEn: v.subtitleEn || undefined, imageUrl: v.imageUrl || undefined, ctaUrl: v.ctaUrl || undefined, active: v.active ?? true };
    const cur = this.editing();
    this.saving.set(true);
    (cur ? this.admin.updateBanner(cur.id, payload) : this.admin.createBanner(payload)).subscribe({
      next: () => { this.saving.set(false); this.formOpen.set(false); this.toast.success(this.i18n.t('common.saved')); this.loader.reload(); },
      error: () => { this.saving.set(false); this.toast.error(this.i18n.t('common.error')); },
    });
  }

  protected remove(b: Banner): void {
    if (!window.confirm(this.i18n.t('common.deleteConfirmBody'))) return;
    this.admin.deleteBanner(b.id).subscribe({ next: () => { this.toast.success(this.i18n.t('common.deleted')); this.loader.reload(); }, error: () => this.toast.error(this.i18n.t('common.error')) });
  }
}
