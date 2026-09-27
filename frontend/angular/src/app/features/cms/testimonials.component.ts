import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { Testimonial } from '../../models';
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
      <div><h1>{{ i18n.t('admin.testimonials') }}</h1></div>
      <button class="btn gradient-button btn-sm" (click)="startCreate()"><app-icon name="plus" size="0.95rem" /> {{ i18n.t('common.create') }}</button>
    </div>
    @if (formOpen()) {
      <div class="form-panel">
        <h3>{{ editing() ? i18n.t('common.edit') : i18n.t('common.create') }}</h3>
        <form [formGroup]="form" (ngSubmit)="save()">
          <label class="form-label">name *</label><input class="form-input" formControlName="name" />
          <label class="form-label">textAr *</label><textarea class="form-input" rows="2" formControlName="textAr"></textarea>
          <label class="form-label">textEn *</label><textarea class="form-input" rows="2" formControlName="textEn"></textarea>
          <label class="form-label">rating (1-5)</label><input class="form-input" type="number" min="1" max="5" formControlName="rating" />
          <label class="checkbox-row"><input type="checkbox" formControlName="active" /> {{ i18n.t('common.active') }}</label>
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
          <thead><tr><th>{{ i18n.t('common.name') }}</th><th>Rating</th><th>{{ i18n.t('common.status') }}</th><th class="table-actions">{{ i18n.t('common.actions') }}</th></tr></thead>
          <tbody>
            @for (t of items(); track t.id) {
              <tr>
                <td><strong>{{ t.name }}</strong><br /><small style="color: var(--muted-foreground)">{{ t.textAr }}</small></td>
                <td>{{ t.rating }}</td>
                <td><span class="chip" [class]="'chip chip-' + (t.active ? 'success' : 'muted')">{{ t.active ? i18n.t('common.active') : i18n.t('common.inactive') }}</span></td>
                <td><div class="table-actions">
                  <button class="icon-btn" (click)="startEdit(t)" [attr.aria-label]="i18n.t('common.edit')"><app-icon name="edit" size="0.9rem" /></button>
                  <button class="icon-btn danger" (click)="remove(t)" [attr.aria-label]="i18n.t('common.delete')"><app-icon name="trash" size="0.9rem" /></button>
                </div></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class TestimonialsAdminComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly admin = inject(AdminService);
  protected readonly fb = inject(FormBuilder);
  protected readonly toast = inject(ToastService);

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Testimonial | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    textAr: ['', Validators.required],
    textEn: ['', Validators.required],
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    active: [true],
  });

  protected readonly loader = createLoader<Testimonial[]>(
    () => this.admin.testimonials().pipe(catchError(() => of([] as Testimonial[]))),
    [],
  );
  protected readonly items = computed(() => this.loader.data());

  protected startCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', textAr: '', textEn: '', rating: 5, active: true });
    this.formOpen.set(true);
  }

  protected startEdit(t: Testimonial): void {
    this.editing.set(t);
    this.form.patchValue(t);
    this.formOpen.set(true);
  }

  protected save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const payload = { name: v.name ?? '', textAr: v.textAr ?? '', textEn: v.textEn ?? '', rating: v.rating ?? 5, active: v.active ?? true };
    const cur = this.editing();
    this.saving.set(true);
    (cur ? this.admin.updateTestimonial(cur.id, payload) : this.admin.createTestimonial(payload)).subscribe({
      next: () => { this.saving.set(false); this.formOpen.set(false); this.toast.success(this.i18n.t('common.saved')); this.loader.reload(); },
      error: () => { this.saving.set(false); this.toast.error(this.i18n.t('common.error')); },
    });
  }

  protected remove(t: Testimonial): void {
    if (!window.confirm(this.i18n.t('common.deleteConfirmBody'))) return;
    this.admin.deleteTestimonial(t.id).subscribe({ next: () => { this.toast.success(this.i18n.t('common.deleted')); this.loader.reload(); }, error: () => this.toast.error(this.i18n.t('common.error')) });
  }
}
