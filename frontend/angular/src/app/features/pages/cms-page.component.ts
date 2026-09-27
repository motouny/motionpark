import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { PublicService } from '../../services/public.service';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';

interface FallbackPage {
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
}

const FALLBACK_PAGES: Record<string, FallbackPage> = {
  about: {
    titleAr: 'عن موشن بارك',
    titleEn: 'About Motion Park',
    contentAr: 'موشن بارك مجمع رياضي ورفاهي مخصص للنساء والفتيات في قلب الرياض. صممناه ليكون مساحة آمنة تجمع بين الحركة والعافية والمجتمع.\n\nنؤمن أن الرياضة ليست روتيناً، بل أسلوب حياة. لذلك نقدم أكثر من 25 نشاطاً أسبوعياً بإشراف مدرّبات معتمدات، وبيئة تحتفي بكل مستوى وكل عمر.\n\nمن أول غطسة في المسبح الداخلي إلى أول بطولة مع فريق كرة القدم — كل خطوة هنا تحكي قصة قوة.',
    contentEn: 'Motion Park is a sports and wellness complex for women and girls in the heart of Riyadh — designed as a safe space combining movement, wellness and community.\n\nWe believe sport is not a routine but a lifestyle. That is why we offer 25+ weekly activities led by certified coaches, in an environment that celebrates every level and every age.\n\nFrom your first dip in the indoor pool to your first tournament with the football team — every step here tells a story of strength.',
  },
  privacy: {
    titleAr: 'سياسة الخصوصية',
    titleEn: 'Privacy Policy',
    contentAr: 'نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية وفق أنظمة حماية البيانات الشخصية في المملكة العربية السعودية.\n\nالبيانات التي نجمعها: الاسم، رقم الجوال، البريد الإلكتروني (اختياري)، وبيانات الحجز والعضوية. تُستخدم هذه البيانات فقط لتقديم الخدمات وإدارة اشتراكك.\n\nلا نبيع بياناتك لأي طرف ثالث. تُشارك البيانات المحدودة مع مزودي الخدمات (مثل نظام إدارة العمليات Odoo) فقط بقدر ما يلزم لتشغيل الخدمة.\n\nيمكنك طلب تعديل أو حذف بياناتك في أي وقت عبر التواصل معنا على hello@motionpark.sa.',
    contentEn: 'We respect your privacy and are committed to protecting your personal data in accordance with the Saudi Personal Data Protection Law.\n\nData we collect: name, phone number, email (optional), and booking/membership data. This data is used only to deliver services and manage your subscription.\n\nWe never sell your data. Limited data is shared with service providers (such as the Odoo operations system) only as needed to run the service.\n\nYou may request modification or deletion of your data at any time by contacting hello@motionpark.sa.',
  },
  terms: {
    titleAr: 'شروط الاستخدام',
    titleEn: 'Terms of Use',
    contentAr: 'باستخدامك منصة موشن بارك فأنت توافق على الشروط التالية:\n\nالعضويات: تُفعّل العضوية بعد إتمام الدفع، وتخضع سياسة الخصم والاسترداد لطبيعة الباقة المختارة.\n\nالحجوزات: يمكن حجز الحصص ضمن رصيد عضويتك، ويُعاد رصيد الحصة عند الإلغاء قبل الموعد وفق سياسة الإلغاء. عند اكتمال السعة تُدرج تلقائياً في قائمة الانتظار.\n\nالسلوك: نلتزم بتوفير بيئة آمنة ومحترمة للجميع، ويحتفظ المجمع بحق تقييد أي استخدام يخلّ بذلك.\n\nقد نحدّث هذه الشروط من وقت لآخر، وسيُعلن عن أي تغيير جوهري عبر الموقع أو التطبيق.',
    contentEn: 'By using the Motion Park platform you agree to the following terms:\n\nMemberships: a membership is activated after payment; deduction and refund policy depends on the chosen plan.\n\nBookings: classes may be booked within your membership balance; sessions are refunded when cancelled before the class per the cancellation policy. When a class is full you are added to the waitlist automatically.\n\nConduct: we are committed to a safe, respectful environment for everyone, and the complex reserves the right to restrict any use that violates it.\n\nWe may update these terms from time to time; material changes will be announced on the website or app.',
  },
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, LoadingComponent, DatePipe],
  template: `
    <section class="page-band">
      <div class="container">
        <p class="eyebrow">{{ i18n.t('app.latinName') }}</p>
        <h1>{{ title() }}</h1>
      </div>
    </section>

    <section class="content-body">
      <div class="container">
        @if (loader.loading()) {
          <app-loading [label]="i18n.t('common.loading')" />
        } @else {
          <div class="prose" [innerHTML]="bodyHtml()"></div>
          @if (updatedAt()) {
            <p class="updated">
              {{ i18n.t('common.date') }}: {{ updatedAt() | date: 'mediumDate' }}
            </p>
          }
        }
      </div>
    </section>
  `,
  styles: `
    .content-body { padding: 64px 0 110px; background: var(--background); min-height: 45vh; }
    .updated { margin-top: 2.5rem; color: var(--muted-foreground); font-size: .82rem; }
  `,
})
export class CmsPageComponent {
  protected readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly publicService = inject(PublicService);

  protected readonly slug = signal((this.route.snapshot.data['slug'] as string) ?? '');

  protected readonly loader = createLoader(() => this.publicService.page(this.slug()), null);
  protected readonly updatedAt = signal<string | null>(null);

  protected readonly title = computed(() => {
    const page = this.loader.data();
    if (page) return this.i18n.pick(page, 'titleAr', 'titleEn');
    const fallback = FALLBACK_PAGES[this.slug()];
    return fallback ? (this.i18n.lang() === 'ar' ? fallback.titleAr : fallback.titleEn) : '';
  });

  protected readonly bodyHtml = computed(() => {
    const page = this.loader.data();
    const raw = page
      ? this.i18n.pick(page, 'contentAr', 'contentEn')
      : this.i18n.lang() === 'ar'
        ? FALLBACK_PAGES[this.slug()]?.contentAr
        : FALLBACK_PAGES[this.slug()]?.contentEn;
    return this.toHtml(raw ?? '');
  });

  private toHtml(raw: string): string {
    const escaped = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return escaped
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }
}
