import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { Coach } from '../../../models';
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
        <h1>{{ i18n.t('admin.coaches') }}</h1>
      </div>
      <button class="btn gradient-button btn-sm" (click)="startCreate()">
        <app-icon name="plus" size="0.95rem" /> {{ i18n.t('common.create') }}
      </button>
    </div>

    @if (formOpen()) {
      <div class="form-panel">
        <h3>{{ editing() ? i18n.t('common.edit') : i18n.t('common.create') }}</h3>
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="form-grid-2">
            <div>
              <label class="form-label">nameAr *</label>
              <input class="form-input" formControlName="nameAr" />
            </div>
            <div>
              <label class="form-label">nameEn *</label>
              <input class="form-input" formControlName="nameEn" />
            </div>
            <div>
              <label class="form-label">slug *</label>
              <input class="form-input" formControlName="slug" />
            </div>
            <div>
              <label class="form-label">photoUrl</label>
              <input class="form-input" formControlName="photoUrl" placeholder="https://" />
            </div>
            <div>
              <label class="form-label">bioAr</label>
              <input class="form-input" formControlName="bioAr" />
            </div>
            <div>
              <label class="form-label">bioEn</label>
              <input class="form-input" formControlName="bioEn" />
            </div>
          </div>
          <div style="margin-top: 1rem;">
            <label class="form-label">certifications (comma separated)</label>
            <input class="form-input" formControlName="certifications" />
          </div>
          <label class="checkbox-row" style="margin-top: 1rem;">
            <input type="checkbox" formControlName="active" />
            {{ i18n.t('common.active') }}
          </label>
          <div class="form-actions">
            <button class="btn btn-ghost" type="button" (click)="formOpen.set(false)">{{ i18n.t('common.cancel') }}</button>
            <button class="btn gradient-button" type="submit" [disabled]="form.invalid || saving()">
              {{ saving() ? i18n.t('common.saving') : i18n.t('common.save') }}
            </button>
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
          <thead>
            <tr>
              <th>{{ i18n.t('common.name') }}</th>
              <th>Certifications</th>
              <th>{{ i18n.t('common.status') }}</th>
              <th class="table-actions">{{ i18n.t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (c of items(); track c.id) {
              <tr>
                <td><strong>{{ c.nameAr }}</strong><br /><small style="color: var(--muted-foreground)">{{ c.nameEn }}</small></td>
                <td>{{ (c.certifications ?? []).join(', ') || '—' }}</td>
                <td><span class="chip" [class]="'chip chip-' + (c.active ? 'success' : 'muted')">{{ c.active ? i18n.t('common.active') : i18n.t('common.inactive') }}</span></td>
                <td>
                  <div class="table-actions">
                    <button class="icon-btn" (click)="startEdit(c)" [attr.aria-label]="i18n.t('common.edit')"><app-icon name="edit" size="0.9rem" /></button>
                    <button class="icon-btn danger" (click)="remove(c)" [attr.aria-label]="i18n.t('common.delete')"><app-icon name="trash" size="0.9rem" /></button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class CoachesAdminComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly admin = inject(AdminService);
  protected readonly fb = inject(FormBuilder);
  protected readonly toast = inject(ToastService);

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Coach | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    nameAr: ['', Validators.required],
    nameEn: ['', Validators.required],
    slug: ['', Validators.required],
    photoUrl: [''],
    bioAr: [''],
    bioEn: [''],
    certifications: [''],
    active: [true],
  });

  protected readonly loader = createLoader<Coach[]>(
    () => this.admin.coaches().pipe(catchError(() => of([] as Coach[]))),
    [],
  );
  protected readonly items = computed(() => this.loader.data());

  protected startCreate(): void {
    this.editing.set(null);
    this.form.reset({ nameAr: '', nameEn: '', slug: '', photoUrl: '', bioAr: '', bioEn: '', certifications: '', active: true });
    this.formOpen.set(true);
  }

  protected startEdit(c: Coach): void {
    this.editing.set(c);
    this.form.patchValue({
      ...c,
      certifications: (c.certifications ?? []).join(', '),
    });
    this.formOpen.set(true);
  }

  protected save(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const payload = {
      nameAr: value.nameAr ?? '',
      nameEn: value.nameEn ?? '',
      slug: value.slug ?? '',
      photoUrl: value.photoUrl || undefined,
      bioAr: value.bioAr || undefined,
      bioEn: value.bioEn || undefined,
      certifications: (value.certifications ?? '').split(',').map((c) => c.trim()).filter(Boolean),
      active: value.active ?? true,
    };
    const current = this.editing();
    this.saving.set(true);
    const req = current ? this.admin.updateCoach(current.id, payload) : this.admin.createCoach(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.success(this.i18n.t('common.saved'));
        this.loader.reload();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.i18n.t('common.error'));
      },
    });
  }

  protected remove(c: Coach): void {
    if (!window.confirm(this.i18n.t('common.deleteConfirmBody'))) return;
    this.admin.deleteCoach(c.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('common.deleted'));
        this.loader.reload();
      },
      error: () => this.toast.error(this.i18n.t('common.error')),
    });
  }
}
