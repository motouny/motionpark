import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { Branch } from '../../../models';
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
        <h1>{{ i18n.t('admin.branches') }}</h1>
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
              <label class="form-label">city</label>
              <input class="form-input" formControlName="city" />
            </div>
            <div>
              <label class="form-label">address</label>
              <input class="form-input" formControlName="address" />
            </div>
            <div>
              <label class="form-label">operatingHours</label>
              <input class="form-input" formControlName="operatingHours" />
            </div>
            <div>
              <label class="form-label">phone</label>
              <input class="form-input" formControlName="phone" />
            </div>
            <div>
              <label class="form-label">whatsapp</label>
              <input class="form-input" formControlName="whatsapp" />
            </div>
            <div>
              <label class="form-label">latitude</label>
              <input class="form-input" type="number" formControlName="latitude" />
            </div>
            <div>
              <label class="form-label">longitude</label>
              <input class="form-input" type="number" formControlName="longitude" />
            </div>
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
              <th>{{ i18n.t('branchesPage.address') }}</th>
              <th>{{ i18n.t('branchesPage.hours') }}</th>
              <th>{{ i18n.t('common.status') }}</th>
              <th class="table-actions">{{ i18n.t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (b of items(); track b.id) {
              <tr>
                <td><strong>{{ b.nameAr }}</strong><br /><small style="color: var(--muted-foreground)">{{ b.nameEn }}</small></td>
                <td>{{ b.address ?? '—' }}</td>
                <td>{{ b.operatingHours ?? '—' }}</td>
                <td><span class="chip" [class]="'chip chip-' + (b.active ? 'success' : 'muted')">{{ b.active ? i18n.t('common.active') : i18n.t('common.inactive') }}</span></td>
                <td>
                  <div class="table-actions">
                    <button class="icon-btn" (click)="startEdit(b)" [attr.aria-label]="i18n.t('common.edit')"><app-icon name="edit" size="0.9rem" /></button>
                    <button class="icon-btn danger" (click)="remove(b)" [attr.aria-label]="i18n.t('common.delete')"><app-icon name="trash" size="0.9rem" /></button>
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
export class BranchesAdminComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly admin = inject(AdminService);
  protected readonly fb = inject(FormBuilder);
  protected readonly toast = inject(ToastService);

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Branch | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    nameAr: ['', Validators.required],
    nameEn: ['', Validators.required],
    slug: ['', Validators.required],
    city: [''],
    address: [''],
    operatingHours: [''],
    phone: [''],
    whatsapp: [''],
    latitude: [null as number | null],
    longitude: [null as number | null],
    active: [true],
  });

  protected readonly loader = createLoader<Branch[]>(
    () => this.admin.branches().pipe(catchError(() => of([] as Branch[]))),
    [],
  );
  protected readonly items = computed(() => this.loader.data());

  protected startCreate(): void {
    this.editing.set(null);
    this.form.reset({
      nameAr: '', nameEn: '', slug: '', city: '', address: '', operatingHours: '', phone: '', whatsapp: '',
      latitude: null, longitude: null, active: true,
    });
    this.formOpen.set(true);
  }

  protected startEdit(b: Branch): void {
    this.editing.set(b);
    this.form.patchValue({
      nameAr: b.nameAr,
      nameEn: b.nameEn,
      slug: b.slug,
      city: b.city ?? '',
      address: b.address ?? '',
      operatingHours: b.operatingHours ?? '',
      phone: b.phone ?? '',
      whatsapp: b.whatsapp ?? '',
      latitude: b.latitude ?? null,
      longitude: b.longitude ?? null,
      active: b.active,
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
      city: value.city || undefined,
      address: value.address || undefined,
      operatingHours: value.operatingHours || undefined,
      phone: value.phone || undefined,
      whatsapp: value.whatsapp || undefined,
      latitude: value.latitude ?? undefined,
      longitude: value.longitude ?? undefined,
      active: value.active ?? true,
    };
    const current = this.editing();
    this.saving.set(true);
    const req = current ? this.admin.updateBranch(current.id, payload) : this.admin.createBranch(payload);
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

  protected remove(b: Branch): void {
    if (!window.confirm(this.i18n.t('common.deleteConfirmBody'))) return;
    this.admin.deleteBranch(b.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('common.deleted'));
        this.loader.reload();
      },
      error: () => this.toast.error(this.i18n.t('common.error')),
    });
  }
}
