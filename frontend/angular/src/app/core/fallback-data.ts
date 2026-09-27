import { Activity, Branch, Coach, Faq, HomepageSection, MembershipPlan, ScheduleEntry, Testimonial } from '../models';

function nextDate(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

/** On-brand default content per docs/ASSET_INVENTORY.md — used when the API is unreachable. */
export const FALLBACK_ACTIVITIES: Activity[] = [
  {
    id: 'fallback-swim', slug: 'swimming', nameAr: 'السباحة', nameEn: 'Swimming',
    descriptionAr: 'جلسات تناسب جميع المستويات', descriptionEn: 'Sessions for all levels',
    imageUrl: null, icon: 'waves', active: true,
  },
  {
    id: 'fallback-fitness', slug: 'fitness', nameAr: 'اللياقة البدنية', nameEn: 'Fitness',
    descriptionAr: 'طاقة مدروسة وأهداف واضحة', descriptionEn: 'Focused energy, clear goals',
    imageUrl: null, icon: 'dumbbell', active: true,
  },
  {
    id: 'fallback-football', slug: 'football', nameAr: 'كرة القدم النسائية', nameEn: 'Football',
    descriptionAr: 'فريقك، مساحتك، وشغفك', descriptionEn: 'Your team, your space, your passion',
    imageUrl: null, icon: 'footprints', active: true,
  },
  {
    id: 'fallback-group', slug: 'group-classes', nameAr: 'الأنشطة الجماعية', nameEn: 'Group Classes',
    descriptionAr: 'تحركي مع مجتمع يشبهك', descriptionEn: 'Move with a community like you',
    imageUrl: null, icon: 'users', active: true,
  },
];

export const FALLBACK_PLANS: MembershipPlan[] = [
  {
    id: 'fallback-plan-motion', odooProductId: null, slug: 'motion', nameAr: 'موشن', nameEn: 'Motion',
    descriptionAr: 'ابدئي إيقاعك الخاص', descriptionEn: 'Start your own rhythm',
    price: 299, vat: 15, currency: 'SAR', duration: 1, durationUnit: 'month', sessionLimit: 8,
    branches: [], activities: [], featured: false, sortOrder: 1, active: true,
  },
  {
    id: 'fallback-plan-plus', odooProductId: null, slug: 'motion-plus', nameAr: 'موشن بلس', nameEn: 'Motion Plus',
    descriptionAr: 'الأكثر اختياراً', descriptionEn: 'The most chosen',
    price: 499, vat: 15, currency: 'SAR', duration: 1, durationUnit: 'month', sessionLimit: 0,
    branches: [], activities: [], featured: true, sortOrder: 2, active: true,
  },
  {
    id: 'fallback-plan-signature', odooProductId: null, slug: 'park-signature', nameAr: 'بارك سيغنتشر', nameEn: 'Park Signature',
    descriptionAr: 'تجربة مكتملة', descriptionEn: 'The complete experience',
    price: 799, vat: 15, currency: 'SAR', duration: 1, durationUnit: 'month', sessionLimit: 0,
    branches: [], activities: [], featured: false, sortOrder: 3, active: true,
  },
];

export const PLAN_FEATURES: Record<string, { featuresAr: string[]; featuresEn: string[] }> = {
  motion: {
    featuresAr: ['8 حصص شهرياً', 'دخول الاستوديو', 'حجز حتى 3 أيام مقدماً'],
    featuresEn: ['8 sessions per month', 'Studio access', 'Book up to 3 days ahead'],
  },
  'motion-plus': {
    featuresAr: ['حصص غير محدودة', 'مسبح داخلي', 'أولوية الحجز', 'استشارة شهرية'],
    featuresEn: ['Unlimited sessions', 'Indoor pool', 'Booking priority', 'Monthly consultation'],
  },
  'park-signature': {
    featuresAr: ['كل مزايا Plus', 'جلسات تدريب شخصية', 'دعوة ضيفة شهرياً', 'خدمة استقبال مميزة'],
    featuresEn: ['All Plus benefits', 'Personal training sessions', 'Monthly guest invite', 'Premium reception service'],
  },
};

export const FALLBACK_SCHEDULE: ScheduleEntry[] = [
  {
    id: 'fallback-s1', branchId: 'fallback-b1', date: nextDate(0), startTime: '17:30', endTime: '18:15',
    capacity: 14, bookedCount: 11, seatsLeft: 3, activityNameAr: 'بيلاتس فلو', activityNameEn: 'Pilates Flow',
    coachNameAr: 'نورة', coachNameEn: 'Noura', branchNameAr: 'الاستوديو 02', branchNameEn: 'Studio 02',
    genderScope: 'female',
  },
  {
    id: 'fallback-s2', branchId: 'fallback-b1', date: nextDate(0), startTime: '18:15', endTime: '19:00',
    capacity: 10, bookedCount: 4, seatsLeft: 6, activityNameAr: 'أساسيات السباحة', activityNameEn: 'Swim Fundamentals',
    coachNameAr: 'ليان', coachNameEn: 'Layan', branchNameAr: 'المسبح الداخلي', branchNameEn: 'Indoor Pool',
    genderScope: 'female',
  },
  {
    id: 'fallback-s3', branchId: 'fallback-b1', date: nextDate(0), startTime: '19:00', endTime: '19:45',
    capacity: 16, bookedCount: 14, seatsLeft: 2, activityNameAr: 'سترونغ آند سكلبت', activityNameEn: 'Strong & Sculpt',
    coachNameAr: 'رُبى', coachNameEn: 'Ruba', branchNameAr: 'الاستوديو 01', branchNameEn: 'Studio 01',
    genderScope: 'female',
  },
];

export const FALLBACK_COACHES: Coach[] = [
  {
    id: 'fallback-c1', slug: 'noura', nameAr: 'نورة', nameEn: 'Noura',
    bioAr: 'مدربة بيلاتس ويوغا معتمدة، تؤمن أن الحركة الصحيحة تصنع الجسد والعقل.',
    bioEn: 'Certified Pilates and yoga coach who believes correct movement shapes body and mind.',
    photoUrl: null, certifications: ['Pilates Certification', 'RYT-200'], activities: [], branches: [], active: true,
  },
  {
    id: 'fallback-c2', slug: 'layan', nameAr: 'ليان', nameEn: 'Layan',
    bioAr: 'مدربة سباحة معتمدة دولياً، ترافق جميع المستويات من أول غطسة حتى الاحتراف.',
    bioEn: 'Internationally certified swim coach guiding all levels from first dip to pro.',
    photoUrl: null, certifications: ['ASA Level 2 Swimming'], activities: [], branches: [], active: true,
  },
  {
    id: 'fallback-c3', slug: 'ruba', nameAr: 'رُبى', nameEn: 'Ruba',
    bioAr: 'مدربة لياقة وقوة، برامجها مدروسة لتبني قوة حقيقية بثبات وأمان.',
    bioEn: 'Fitness and strength coach with programs built for real, lasting strength.',
    photoUrl: null, certifications: ['NASM-CPT'], activities: [], branches: [], active: true,
  },
];

export const FALLBACK_BRANCHES: Branch[] = [
  {
    id: 'fallback-b1', slug: 'north-branch', nameAr: 'فرع الشمال', nameEn: 'North Branch',
    city: 'الرياض', address: 'حي الياسمين، طريق الملك فهد', latitude: 24.813, longitude: 46.641,
    phone: '+966 11 000 0000', whatsapp: '+966 5X XXX XXXX', operatingHours: 'السبت–الخميس: 6ص–10م', active: true,
  },
  {
    id: 'fallback-b2', slug: 'central-branch', nameAr: 'الفرع المركزي', nameEn: 'Central Branch',
    city: 'الرياض', address: 'حي العليا، شارع التحلية', latitude: 24.69, longitude: 46.685,
    phone: '+966 11 000 0000', whatsapp: '+966 5X XXX XXXX', operatingHours: 'السبت–الخميس: 6ص–11م', active: true,
  },
];

export const FALLBACK_TESTIMONIALS: Testimonial[] = [
  { id: 't1', name: 'سارة م.', textAr: 'أول مرة ألتزم برياضة أكثر من شهر — الجو هنا مختلف تماماً.', textEn: 'First time I stick to a sport for over a month — the vibe here is completely different.', rating: 5, active: true },
  { id: 't2', name: 'نوف ع.', textAr: 'المدربات يتابعن تقدمك فعلاً، والحجز من التطبيق سهل جداً.', textEn: 'The coaches genuinely track your progress, and booking from the app is so easy.', rating: 5, active: true },
  { id: 't3', name: 'لمى خ.', textAr: 'خصوصية وراحة من أول زيارة. صرت أحسب وقت الحصة أجمل وقت في يومي.', textEn: 'Privacy and comfort from the first visit. Class time became the best part of my day.', rating: 4, active: true },
];

export const FALLBACK_FAQS: Faq[] = [
  { id: 'f1', questionAr: 'هل المجمع مخصص للنساء فقط؟', questionEn: 'Is the complex women-only?', answerAr: 'نعم، Motion Park مجمع رياضي ورفاهي مخصص للنساء والفتيات في جميع الأقسام والأوقات.', answerEn: 'Yes, Motion Park is a sports and wellness complex dedicated to women and girls across all areas and hours.', sortOrder: 1, active: true },
  { id: 'f2', questionAr: 'كيف أحجز تجربتي الأولى؟', questionEn: 'How do I book my first session?', answerAr: 'من زر "احجزي تجربتك الأولى" في الصفحة الرئيسية، أو عبر التسجيل وحجز أي حصة من الجدول.', answerEn: 'Use the "Book your first session" button on the homepage, or sign up and book any class from the schedule.', sortOrder: 2, active: true },
  { id: 'f3', questionAr: 'هل تشمل العضوية جميع الفروع؟', questionEn: 'Does a membership cover all branches?', answerAr: 'تختلف الباقات — بعضها يشمل جميع الفروع وبعضها فرعاً محدداً. تفاصيل كل باقة موضحة في صفحة العضويات.', answerEn: 'It varies by plan — some cover all branches, others a specific one. Details are listed on the memberships page.', sortOrder: 3, active: true },
  { id: 'f4', questionAr: 'هل يمكنني إلغاء الحجز؟', questionEn: 'Can I cancel a booking?', answerAr: 'نعم، يمكن الإلغاء من حسابك قبل موعد الحصة، ويُعاد حساب الحصة حسب سياسة الإلغاء.', answerEn: 'Yes, you can cancel from your account before the class starts; sessions are refunded per the cancellation policy.', sortOrder: 4, active: true },
];

export const FALLBACK_HOMEPAGE_SECTIONS: HomepageSection[] = [
  { type: 'hero', enabled: true, sortOrder: 1, content: null },
  { type: 'activities', enabled: true, sortOrder: 2, content: null },
  { type: 'schedule', enabled: true, sortOrder: 3, content: null },
  { type: 'story', enabled: true, sortOrder: 4, content: null },
  { type: 'memberships', enabled: true, sortOrder: 5, content: null },
  { type: 'coaches', enabled: true, sortOrder: 6, content: null },
  { type: 'testimonials', enabled: true, sortOrder: 7, content: null },
  { type: 'faq', enabled: true, sortOrder: 8, content: null },
  { type: 'branches', enabled: true, sortOrder: 9, content: null },
  { type: 'cta', enabled: true, sortOrder: 10, content: null },
];
