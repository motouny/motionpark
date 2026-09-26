import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Dumbbell,
  Footprints,
  HeartPulse,
  Menu,
  MoveUpRight,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
  Waves,
  X,
} from "lucide-react";
import { toast } from "sonner";

const LOGO = "/manus-storage/motion-park-logo-light_5c4f496d.svg";
const SYMBOL = "/manus-storage/motion-park-symbol_2f6d1717.svg";

const activities = [
  { title: "السباحة", subtitle: "Swimming", icon: Waves, detail: "جلسات تناسب جميع المستويات", className: "activity-swim" },
  { title: "اللياقة البدنية", subtitle: "Fitness", icon: Dumbbell, detail: "طاقة مدروسة وأهداف واضحة", className: "activity-fitness" },
  { title: "كرة القدم النسائية", subtitle: "Football", icon: Footprints, detail: "فريقك، مساحتك، وشغفك", className: "activity-football" },
  { title: "الأنشطة الجماعية", subtitle: "Group Classes", icon: UsersRound, detail: "تحركي مع مجتمع يشبهك", className: "activity-group" },
];

const schedule = [
  { time: "05:30 م", title: "Pilates Flow", coach: "مع الكابتن نورة", seats: "متبقي 3 مقاعد", type: "الاستوديو 02" },
  { time: "06:15 م", title: "Swim Fundamentals", coach: "مع الكابتن ليان", seats: "متبقي 6 مقاعد", type: "المسبح الداخلي" },
  { time: "07:00 م", title: "Strong & Sculpt", coach: "مع الكابتن رُبى", seats: "متبقي مقعدان", type: "الاستوديو 01" },
];

const memberships = [
  { name: "Motion", desc: "ابدئي إيقاعك الخاص", price: "299", features: ["8 حصص شهرياً", "دخول الاستوديو", "حجز حتى 3 أيام مقدماً"], featured: false },
  { name: "Motion Plus", desc: "الأكثر اختياراً", price: "499", features: ["حصص غير محدودة", "مسبح داخلي", "أولوية الحجز", "استشارة شهرية"], featured: true },
  { name: "Park Signature", desc: "تجربة مكتملة", price: "799", features: ["كل مزايا Plus", "جلسات تدريب شخصية", "دعوة ضيفة شهرياً", "خدمة استقبال مميزة"], featured: false },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDay, setActiveDay] = useState("اليوم");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const bookClass = (title: string) => toast.success("تم اختيار الحصة", { description: `${title} — تابعي التسجيل لإتمام الحجز.` });
  const comingSoon = () => toast("قريباً", { description: "هذه التجربة ستكون متاحة عند ربط نظام العضويات." });

  const submitJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setJoinOpen(false);
    toast.success("وصلنا طلبك", { description: "سنتواصل معك لتحديد التجربة الأولى." });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#121218] text-[#F5F5F7]" dir="rtl">
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-white/10 bg-[#121218]/95 shadow-[0_14px_40px_rgba(0,0,0,.24)] backdrop-blur-xl" : "bg-transparent"}`}>
        <div className="mx-auto flex h-[76px] max-w-[1280px] items-center justify-between px-5 lg:px-8">
          <a href="#top" className="flex shrink-0 items-center" aria-label="Motion Park الصفحة الرئيسية">
            <img src={LOGO} alt="Motion Park" className="h-11 w-auto md:h-12" />
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-white/72 lg:flex">
            <button onClick={() => scrollToId("activities")} className="nav-link">الأنشطة</button>
            <button onClick={() => scrollToId("schedule")} className="nav-link">الجدول</button>
            <button onClick={() => scrollToId("membership")} className="nav-link">العضويات</button>
            <button onClick={() => scrollToId("story")} className="nav-link">عنّا</button>
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <button onClick={comingSoon} className="rounded-full px-4 py-2 text-sm font-semibold text-white/80 transition hover:text-white">تسجيل الدخول</button>
            <button onClick={() => setJoinOpen(true)} className="gradient-button rounded-full px-5 py-2.5 text-sm font-bold text-white">ابدئي الآن <ArrowLeft className="mr-1 inline h-4 w-4" /></button>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/5 text-white lg:hidden" aria-label="فتح القائمة">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-white/10 bg-[#17171d] px-5 py-5 lg:hidden">
            <div className="mx-auto grid max-w-[1280px] gap-2 text-right">
              {[['الأنشطة', 'activities'], ['الجدول', 'schedule'], ['العضويات', 'membership'], ['عنّا', 'story']].map(([label, id]) => (
                <button key={id} onClick={() => { scrollToId(id); setMenuOpen(false); }} className="rounded-xl px-4 py-3 text-right text-base font-semibold hover:bg-white/5">{label}</button>
              ))}
              <button onClick={() => { setJoinOpen(true); setMenuOpen(false); }} className="gradient-button mt-2 rounded-xl py-3 font-bold">ابدئي الآن</button>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        <section className="hero-shell relative min-h-[780px] overflow-hidden pt-[76px]">
          <div className="hero-photo absolute inset-0" aria-hidden="true" />
          <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#121218_4%,rgba(18,18,24,.93)_28%,rgba(18,18,24,.34)_69%,rgba(18,18,24,.66)_100%)]" />
          <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
          <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
          <div className="relative mx-auto flex min-h-[704px] max-w-[1280px] items-center px-5 py-20 lg:px-8">
            <div className="max-w-2xl text-right">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[.06] px-3.5 py-2 text-xs font-semibold text-white/80 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#FF7A00] shadow-[0_0_14px_#FF4081]" />
                مجمع رياضي ورفاهي للنساء والفتيات
              </div>
              <h1 className="font-tajawal text-5xl font-black leading-[1.12] tracking-tight text-white sm:text-6xl lg:text-7xl">
                حركتك..<br />
                <span className="gradient-text">لحياة أجمل</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-white/72 sm:text-xl">مساحتك الآمنة لتتحركي، تكتشفي قوتك، وتبني روتيناً تحبين العودة إليه.</p>
              <div className="mt-9 flex flex-wrap justify-start gap-3">
                <button onClick={() => setJoinOpen(true)} className="gradient-button rounded-full px-6 py-3.5 text-base font-bold text-white">احجزي تجربتك الأولى <ArrowLeft className="mr-1 inline h-5 w-5" /></button>
                <button onClick={() => scrollToId("activities")} className="group rounded-full border border-white/22 bg-white/[.04] px-6 py-3.5 text-base font-bold text-white transition hover:bg-white/[.10]">استكشفي الأنشطة <ChevronDown className="mr-2 inline h-4 w-4 transition group-hover:translate-y-0.5" /></button>
              </div>
              <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-5 border-t border-white/12 pt-7">
                <div><strong className="block text-2xl font-black text-white">+25</strong><span className="text-sm text-white/55">نشاطاً أسبوعياً</span></div>
                <div><strong className="block text-2xl font-black text-white">+12</strong><span className="text-sm text-white/55">مدرّبة متخصصة</span></div>
                <div><strong className="block text-2xl font-black text-white">4.9<span className="text-[#FF7A00]">/5</span></strong><span className="text-sm text-white/55">تقييم العضوات</span></div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-7 left-5 right-5 mx-auto flex max-w-[1216px] items-center justify-between text-xs text-white/40 lg:px-0">
            <span>SCROLL TO MOVE</span><span className="h-px w-24 bg-gradient-to-l from-[#FF4081] to-transparent" />
          </div>
        </section>

        <section id="activities" className="relative bg-[#F5F5F7] px-5 py-24 text-[#1A1A1A] lg:px-8 lg:py-32">
          <div className="mx-auto max-w-[1280px]">
            <div className="mb-11 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-xl">
                <p className="eyebrow-dark">اختاري حركتك</p>
                <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">أكثر من رياضة.<br /><span className="text-[#FF4081]">أجمل من مجرد روتين.</span></h2>
              </div>
              <button onClick={comingSoon} className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-[#1A1A1A]/15 px-5 py-3 text-sm font-bold transition hover:border-[#FF4081] hover:text-[#FF4081] md:self-auto">كل الأنشطة <MoveUpRight className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {activities.map(({ title, subtitle, icon: Icon, detail, className }) => (
                <article key={title} className={`activity-card ${className} group relative min-h-[375px] overflow-hidden rounded-[28px] p-6 text-white`}>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121218] via-[#121218]/25 to-transparent" />
                  <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#FF4081]/35 blur-3xl transition duration-500 group-hover:scale-125" />
                  <div className="relative flex h-full flex-col justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur"><Icon className="h-5 w-5" /></span>
                    <div>
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.16em] text-white/60">{subtitle}</span>
                      <h3 className="text-2xl font-black">{title}</h3>
                      <p className="mt-2 text-sm text-white/72">{detail}</p>
                      <button onClick={() => bookClass(title)} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white transition group-hover:text-[#FFB36B]">اعرفي المزيد <ArrowLeft className="h-4 w-4" /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="schedule" className="relative overflow-hidden bg-[#17171d] px-5 py-24 lg:px-8 lg:py-32">
          <div className="absolute -right-32 top-16 h-72 w-72 rounded-full bg-[#8A2BE2]/15 blur-[100px]" />
          <div className="relative mx-auto max-w-[1280px]">
            <div className="grid gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
              <div>
                <p className="eyebrow">خططي لأسبوعك</p>
                <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">حصتك القادمة<br />تنتظرك.</h2>
                <p className="mt-5 max-w-md leading-8 text-white/62">اختاري الوقت الذي يشبه يومك، واحجزي مقعدك بخطوات بسيطة.</p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {["اليوم", "غداً", "الأربعاء", "الخميس"].map((day) => <button key={day} onClick={() => setActiveDay(day)} className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${activeDay === day ? "bg-white text-[#1A1A1A]" : "border border-white/15 text-white/65 hover:border-white/40"}`}>{day}</button>)}
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[.045] p-3 shadow-[0_24px_80px_rgba(0,0,0,.28)] backdrop-blur-sm sm:p-5">
                <div className="mb-3 flex items-center justify-between px-2 pt-1"><span className="text-sm font-bold">جدول {activeDay}</span><button onClick={comingSoon} className="text-xs font-bold text-[#FF9B50]">عرض التقويم <CalendarDays className="mr-1 inline h-3.5 w-3.5" /></button></div>
                <div className="space-y-2">
                  {schedule.map((item) => <div key={item.title} className="group grid gap-4 rounded-2xl border border-transparent bg-[#24242D] p-4 transition hover:border-[#FF4081]/45 sm:grid-cols-[100px_1fr_auto] sm:items-center">
                    <div><p className="text-lg font-black text-white">{item.time}</p><p className="mt-1 text-[11px] text-white/45">{item.type}</p></div>
                    <div><p className="font-bold">{item.title}</p><p className="mt-1 text-sm text-white/55">{item.coach}</p></div>
                    <div className="flex items-center justify-between gap-4 sm:block sm:text-left"><p className="text-xs font-bold text-[#FFB36B]">{item.seats}</p><button onClick={() => bookClass(item.title)} className="mt-0 rounded-full border border-white/18 px-4 py-2 text-xs font-bold transition hover:border-[#FF4081] hover:bg-[#FF4081] sm:mt-2">احجزي</button></div>
                  </div>)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="story" className="relative overflow-hidden bg-[#F5F5F7] px-5 py-24 text-[#1A1A1A] lg:px-8 lg:py-32">
          <div className="mx-auto grid max-w-[1280px] gap-14 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
            <div className="relative mx-auto w-full max-w-[560px]">
              <div className="story-image relative aspect-[4/5] overflow-hidden rounded-[34px]">
                <div className="absolute inset-0 bg-gradient-to-t from-[#121218]/55 to-transparent" />
                <div className="absolute bottom-6 right-6 left-6 rounded-2xl border border-white/15 bg-[#121218]/80 p-4 text-white backdrop-blur-xl"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><HeartPulse className="h-5 w-5 text-[#FF4081]" /></span><span><strong className="block text-sm">لأنك تستحقين مساحة لكِ</strong><small className="mt-1 block text-xs text-white/55">حركة، عافية، ومجتمع.</small></span></div></div>
              </div>
              <div className="absolute -left-7 top-1/4 rounded-2xl bg-[#1A1A1A] p-3.5 text-white shadow-2xl"><Sparkles className="h-5 w-5 text-[#FF7A00]" /></div>
              <div className="absolute -right-5 bottom-14 rounded-2xl bg-[#FF4081] px-4 py-3 text-sm font-black text-white shadow-[0_16px_35px_rgba(255,64,129,.35)]">مساحتك. قوتك.</div>
            </div>
            <div>
              <p className="eyebrow-dark">Motion Park Philosophy</p>
              <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">مكان تتحول فيه<br />الحركة إلى <span className="text-[#8A2BE2]">انتماء.</span></h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#1A1A1A]/70">لم نصمّم Motion Park لمجرد إكمال تمرين. صممناه لتجدي طاقتك، وتشاركيها مع مجتمع يحتفي بك في كل خطوة.</p>
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                {[['خصوصية وراحة', 'بيئة مصممة لتشعري فيها أنكِ على طبيعتك.'], ['مدرّبات متخصصات', 'خبرة مهنية ترافقك من البداية إلى هدفك.'], ['تنوع يحفزك', 'أنشطة ومراحل تناسب عمرِك وإيقاع يومِك.'], ['مجتمع إيجابي', 'مساندة حقيقية تخلّي الالتزام أسهل وأجمل.']].map(([title, desc]) => <div key={title} className="border-r-2 border-[#FF4081] pr-4"><h3 className="font-black">{title}</h3><p className="mt-1.5 text-sm leading-6 text-[#1A1A1A]/60">{desc}</p></div>)}
              </div>
              <button onClick={() => setJoinOpen(true)} className="mt-9 inline-flex items-center gap-2 font-bold text-[#1A1A1A] transition hover:text-[#FF4081]">تعرفي على Motion Park <ArrowLeft className="h-4 w-4" /></button>
            </div>
          </div>
        </section>

        <section id="membership" className="relative bg-[#121218] px-5 py-24 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-[1280px]">
            <div className="mx-auto max-w-2xl text-center"><p className="eyebrow">عضوية تشبهك</p><h2 className="mt-4 text-4xl font-black sm:text-5xl">اختاري مساحتك للحركة.</h2><p className="mt-5 leading-8 text-white/60">باقات مرنة مصممة لتبدأي بطريقتك وتستمري بثقة.</p></div>
            <div className="mt-12 grid gap-4 lg:grid-cols-3 lg:items-stretch">
              {memberships.map((plan) => <article key={plan.name} className={`relative flex flex-col overflow-hidden rounded-[28px] border p-7 ${plan.featured ? "border-[#FF4081]/65 bg-[linear-gradient(145deg,rgba(255,64,129,.17),rgba(138,43,226,.12),rgba(36,36,45,.9))] shadow-[0_24px_64px_rgba(255,64,129,.14)]" : "border-white/10 bg-[#1D1D24]"}`}>
                {plan.featured && <div className="absolute left-5 top-5 rounded-full bg-[#FF4081] px-3 py-1 text-[11px] font-black">الأكثر اختياراً</div>}
                <p className="text-sm font-bold text-white/48">{plan.desc}</p><h3 className="mt-2 text-3xl font-black">{plan.name}</h3>
                <div className="my-7 flex items-end gap-1"><span className="text-5xl font-black tracking-tight">{plan.price}</span><span className="mb-1 text-sm text-white/60">ر.س / شهرياً</span></div>
                <ul className="mb-8 space-y-3.5 text-sm text-white/76">{plan.features.map((feature) => <li key={feature} className="flex items-center gap-3"><span className="grid h-5 w-5 place-items-center rounded-full bg-white/10"><Check className="h-3 w-3 text-[#FF9B50]" /></span>{feature}</li>)}</ul>
                <button onClick={() => setJoinOpen(true)} className={`mt-auto w-full rounded-full py-3.5 text-sm font-black transition ${plan.featured ? "gradient-button text-white" : "border border-white/18 hover:border-[#FF4081] hover:bg-white/5"}`}>اختاري هذه العضوية</button>
              </article>)}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#FF4081] px-5 py-16 lg:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_40%,#FFB000_0,transparent_31%),radial-gradient(circle_at_88%_15%,#8A2BE2_0,transparent_39%)]" />
          <div className="relative mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-8 text-center md:flex-row md:text-right">
            <div><p className="text-sm font-bold text-white/78">خطوتك الأولى تبدأ هنا</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">جاهزة تكتشفين حركة تشبهك؟</h2></div>
            <button onClick={() => setJoinOpen(true)} className="rounded-full bg-white px-6 py-3.5 text-base font-black text-[#1A1A1A] shadow-xl transition hover:-translate-y-0.5">احجزي تجربتك الآن <ArrowLeft className="mr-1 inline h-5 w-5" /></button>
          </div>
        </section>
      </main>

      <footer className="bg-[#0D0D11] px-5 pb-8 pt-14 lg:px-8">
        <div className="mx-auto grid max-w-[1280px] gap-12 border-b border-white/10 pb-12 md:grid-cols-[1.15fr_.85fr_.85fr]">
          <div><img src={LOGO} alt="Motion Park" className="h-14 w-auto" /><p className="mt-5 max-w-sm leading-7 text-sm text-white/50">مجمع رياضي ورفاهي للنساء والفتيات. مكانك للحركة، العافية، وكل ما يجعلك أقرب لنفسك.</p></div>
          <div><h3 className="font-bold">اكتشفي</h3><div className="mt-4 grid gap-3 text-sm text-white/50"><button onClick={() => scrollToId("activities")} className="text-right hover:text-white">الأنشطة</button><button onClick={() => scrollToId("schedule")} className="text-right hover:text-white">الجدول</button><button onClick={() => scrollToId("membership")} className="text-right hover:text-white">العضويات</button></div></div>
          <div><h3 className="font-bold">تواصلي معنا</h3><div className="mt-4 grid gap-3 text-sm text-white/50"><span>الرياض، المملكة العربية السعودية</span><span>+966 11 000 0000</span><button onClick={comingSoon} className="text-right hover:text-white">hello@motionpark.sa</button></div></div>
        </div>
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 pt-7 text-xs text-white/34 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 Motion Park. كل الحقوق محفوظة.</span><span>Move with confidence.</span></div>
      </footer>

      {joinOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="join-title">
          <div className="relative w-full max-w-md rounded-[28px] border border-white/12 bg-[#202027] p-6 shadow-2xl sm:p-8">
            <button onClick={() => setJoinOpen(false)} className="absolute left-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white/7 text-white/70 hover:bg-white/15" aria-label="إغلاق"><X className="h-4 w-4" /></button>
            <img src={SYMBOL} alt="" className="h-12 w-12" /><p className="mt-5 text-sm font-bold text-[#FF9B50]">تجربتك الأولى علينا</p><h2 id="join-title" className="mt-2 text-3xl font-black">ابدئي خطوتك اليوم</h2><p className="mt-3 text-sm leading-6 text-white/58">اتركي بياناتك وسنتواصل معك لترتيب التجربة المناسبة لكِ.</p>
            <form onSubmit={submitJoin} className="mt-6 grid gap-3"><input required aria-label="الاسم" placeholder="الاسم الكامل" className="form-input" /><input required type="tel" aria-label="رقم الجوال" placeholder="رقم الجوال" className="form-input" /><select aria-label="النشاط المفضل" className="form-input"><option>النشاط الذي يهمني</option><option>اللياقة البدنية</option><option>السباحة</option><option>الأنشطة الجماعية</option><option>برامج الفتيات</option></select><button className="gradient-button mt-2 rounded-xl py-3.5 font-black">أرسلي طلبي <ArrowLeft className="mr-1 inline h-4 w-4" /></button></form>
            <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-white/40"><ShieldCheck className="h-4 w-4 shrink-0 text-[#FF9B50]" />بياناتك تستخدم فقط للتواصل حول التجربة.</p>
          </div>
        </div>
      )}
    </div>
  );
}
