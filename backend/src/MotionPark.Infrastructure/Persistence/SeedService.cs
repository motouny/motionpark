using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MotionPark.Application.Common;
using MotionPark.Domain;
using MotionPark.Domain.Catalog;
using MotionPark.Domain.Cms;
using MotionPark.Domain.Identity;
using MotionPark.Domain.Membership;
using MotionPark.Domain.Settings;

namespace MotionPark.Infrastructure.Persistence;

/// <summary>
/// Idempotent platform seed.
/// Always-safe baseline (roles, settings, brand, Riyadh branch, placeholder membership plans,
/// activities, pages, homepage sections) runs whenever those rows are missing.
/// Demo content (coaches, schedules, FAQs, testimonials, banners) requires SEED_DEMO_DATA=true
/// and an empty table. Everything is clearly placeholder/configurable.
/// </summary>
public static class SeedService
{
    private static readonly Guid SettingsId = new("00000000-0000-0000-0000-000000000001");
    private static readonly Guid BrandId = new("00000000-0000-0000-0000-000000000002");

    public static async Task SeedAsync(MotionParkDbContext db, IConfiguration config, ILogger logger,
        CancellationToken ct)
    {
        await SeedRolesAsync(db, ct);
        await SeedSystemSettingsAsync(db, ct);
        await SeedBrandAsync(db, ct);
        await SeedBranchAsync(db, ct);
        await SeedPlansAsync(db, logger, ct);
        await SeedActivitiesAsync(db, ct);

        var demo = string.Equals(config["SEED_DEMO_DATA"], "true", StringComparison.OrdinalIgnoreCase);
        if (demo)
        {
            await SeedCoachesAsync(db, ct);
            await SeedSchedulesAsync(db, ct);
            await SeedFaqsAsync(db, ct);
            await SeedTestimonialsAsync(db, ct);
            await SeedBannersAsync(db, ct);
        }

        await SeedPagesAsync(db, ct);
        await SeedHomepageSectionsAsync(db, ct);
    }

    private static async Task SeedRolesAsync(MotionParkDbContext db, CancellationToken ct)
    {
        var permissions = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            [RoleNames.SuperAdmin] = ["*"],
            [RoleNames.ContentManager] = ["pages.manage", "banners.manage", "faqs.manage", "testimonials.manage", "media.manage", "homepage.manage", "brand.manage"],
            [RoleNames.Marketing] = ["leads.view", "banners.manage", "testimonials.manage", "media.manage"],
            [RoleNames.MembershipManager] = ["memberships.manage", "customers.view", "subscriptions.manage"],
            [RoleNames.ScheduleManager] = ["schedules.manage", "activities.manage", "coaches.manage"],
            [RoleNames.BranchManager] = ["branches.manage", "schedules.view"],
            [RoleNames.CustomerService] = ["customers.view", "customers.manage", "leads.view", "leads.manage", "bookings.view"],
            [RoleNames.FinanceViewer] = ["payments.view", "invoices.view", "subscriptions.view"],
        };

        foreach (var roleName in RoleNames.All)
        {
            var role = await db.Roles.FirstOrDefaultAsync(r => r.Name == roleName, ct);
            if (role is null)
            {
                role = new Role { Name = roleName, Description = $"{roleName} role" };
                db.Roles.Add(role);
                await db.SaveChangesAsync(ct);
            }
            foreach (var key in permissions[roleName])
            {
                if (!await db.Permissions.AnyAsync(p => p.RoleId == role.Id && p.Key == key, ct))
                    db.Permissions.Add(new Permission { RoleId = role.Id, Key = key });
            }
        }
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedSystemSettingsAsync(MotionParkDbContext db, CancellationToken ct)
    {
        if (await db.SystemSettings.AnyAsync(ct)) return;
        db.SystemSettings.Add(new SystemSettings
        {
            Id = SettingsId,
            Languages = "[\"ar\",\"en\"]",
            DefaultLanguage = "ar",
            Currency = "SAR",
            Timezone = "Asia/Riyadh",
        });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedBrandAsync(MotionParkDbContext db, CancellationToken ct)
    {
        if (await db.BrandSettings.AnyAsync(ct)) return;
        db.BrandSettings.Add(new BrandSettings
        {
            Id = BrandId,
            Colors = Json.Stringify(new
            {
                primary = "#FF4081", secondary = "#8A2BE2", accent = "#FF7A00",
                background = "#121218", foreground = "#F5F5F7", card = "#24242D",
                muted = "#A8A8B3", lightBackground = "#F5F5F7", lightForeground = "#1A1A1A",
            }),
            Gradients = Json.Stringify(new
            {
                button = "linear-gradient(135deg,#FF7A00 0%,#FF4081 52%,#8A2BE2 100%)",
                text = "linear-gradient(135deg,#FF9C20,#FF4081 49%,#B149F5)",
                eyebrowDark = "#FF9B50", eyebrowLight = "#8A2BE2",
            }),
            Typography = Json.Stringify(new { headingFont = "Tajawal", bodyFont = "Tajawal", latinDisplayFont = "Sora", headingWeight = 900 }),
            Contact = Json.Stringify(new
            {
                phone = "+966 11 000 0000", whatsapp = "+966 50 000 0000",
                email = "hello@motionpark.sa", city = "الرياض", cityEn = "Riyadh",
                address = "الرياض، المملكة العربية السعودية",
            }),
            SocialLinks = Json.Stringify(new { instagram = "", twitter = "", tiktok = "", snapchat = "" }),
        });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedBranchAsync(MotionParkDbContext db, CancellationToken ct)
    {
        if (await db.Branches.AnyAsync(ct)) return;
        db.Branches.Add(new Branch
        {
            Slug = "riyadh",
            NameAr = "فرع الرياض",
            NameEn = "Riyadh Branch",
            City = "Riyadh",
            Address = "Riyadh, Saudi Arabia (placeholder — configure actual address)",
            Phone = "+966 11 000 0000",
            Whatsapp = "+966 50 000 0000",
            OperatingHours = Json.Stringify(new
            {
                ar = "السبت–الخميس: 8 صباحاً – 10 مساءً، الجمعة: 2 ظهراً – 10 مساءً",
                en = "Sat–Thu: 8:00–22:00, Fri: 14:00–22:00",
            }),
        });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedPlansAsync(MotionParkDbContext db, ILogger logger, CancellationToken ct)
    {
        var seeds = new[]
        {
            new MembershipPlanReadModel
            {
                Slug = "motion", OdooProductId = null,
                NameAr = "موشن", NameEn = "Motion",
                DescriptionAr = "8 حصص شهرياً في جميع الأنشطة — بداية مثالية لروتينك الرياضي.",
                DescriptionEn = "8 sessions per month across all activities — the perfect start to your routine.",
                Price = 299, Vat = 15, Duration = 1, DurationUnit = "month", SessionLimit = 8,
                Featured = false, SortOrder = 1, Active = true, Source = "seed", IsConfigurablePlaceholder = true,
                FeaturesAr = Json.Stringify(new[] { "8 حصص شهرياً", "جميع الفروع", "تطبيق وحجز أونلاين" }),
                FeaturesEn = Json.Stringify(new[] { "8 sessions per month", "All branches", "App & online booking" }),
            },
            new MembershipPlanReadModel
            {
                Slug = "motion-plus", OdooProductId = null,
                NameAr = "موشن بلس", NameEn = "Motion Plus",
                DescriptionAr = "حصص غير محدودة مع أولوية الحجز ودخول جميع الأنشطة.",
                DescriptionEn = "Unlimited sessions with booking priority and access to every activity.",
                Price = 499, Vat = 15, Duration = 1, DurationUnit = "month", SessionLimit = 0,
                Featured = true, SortOrder = 2, Active = true, Source = "seed", IsConfigurablePlaceholder = true,
                FeaturesAr = Json.Stringify(new[] { "حصص غير محدودة", "أولوية الحجز", "جميع الأنشطة والفروع" }),
                FeaturesEn = Json.Stringify(new[] { "Unlimited sessions", "Booking priority", "All activities & branches" }),
            },
            new MembershipPlanReadModel
            {
                Slug = "park-signature", OdooProductId = null,
                NameAr = "بارك سيجنتشر", NameEn = "Park Signature",
                DescriptionAr = "جلسات تدريب شخصية وخطط مخصصة وتجربة راقية بالكامل.",
                DescriptionEn = "Personal training sessions, tailored plans and a fully premium experience.",
                Price = 799, Vat = 15, Duration = 1, DurationUnit = "month", SessionLimit = 0,
                Featured = false, SortOrder = 3, Active = true, Source = "seed", IsConfigurablePlaceholder = true,
                FeaturesAr = Json.Stringify(new[] { "جلسات تدريب شخصية", "خطة مخصصة", "مرافقة غذائية" }),
                FeaturesEn = Json.Stringify(new[] { "Personal training sessions", "Custom plan", "Nutrition guidance" }),
            },
        };

        foreach (var seed in seeds)
        {
            if (await db.MembershipPlanReadModels.AnyAsync(p => p.Slug == seed.Slug, ct)) continue;
            db.MembershipPlanReadModels.Add(seed);
            logger.LogInformation("Seeded placeholder membership plan {Slug} (source=seed, configurable)", seed.Slug);
        }
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedActivitiesAsync(MotionParkDbContext db, CancellationToken ct)
    {
        if (await db.Activities.AnyAsync(ct)) return;
        var category = new ActivityCategory { Slug = "signature", NameAr = "أنشطة موشن بارك", NameEn = "Motion Park Activities", SortOrder = 1 };
        db.ActivityCategories.Add(category);

        db.Activities.AddRange(
            new Activity
            {
                Slug = "swimming", CategoryId = category.Id,
                NameAr = "السباحة", NameEn = "Swimming",
                DescriptionAr = "برامج سباحة متدرجة للنساء والفتيات بإشراف مدربات معتمدات.",
                DescriptionEn = "Progressive swimming programs for women and girls with certified coaches.",
                Icon = "waves", SortOrder = 1,
            },
            new Activity
            {
                Slug = "fitness", CategoryId = category.Id,
                NameAr = "اللياقة البدنية", NameEn = "Fitness",
                DescriptionAr = "تدريب قوة ولياقة لكل المستويات في صالات مجهزة بالكامل.",
                DescriptionEn = "Strength and conditioning for all levels in fully equipped studios.",
                Icon = "dumbbell", SortOrder = 2,
            },
            new Activity
            {
                Slug = "football", CategoryId = category.Id,
                NameAr = "كرة القدم النسائية", NameEn = "Football",
                DescriptionAr = "كرة قدم نسائية — فرق وتدريبات ودوريات داخلية.",
                DescriptionEn = "Women's football — teams, training and in-house leagues.",
                Icon = "ball", SortOrder = 3,
            },
            new Activity
            {
                Slug = "group-classes", CategoryId = category.Id,
                NameAr = "الأنشطة الجماعية", NameEn = "Group Classes",
                DescriptionAr = "بيلاتس، يوغا، رشاقة وحركة جماعية بأجواء محفزة.",
                DescriptionEn = "Pilates, yoga, mobility and group movement in an energizing atmosphere.",
                Icon = "users", SortOrder = 4,
            });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedCoachesAsync(MotionParkDbContext db, CancellationToken ct)
    {
        if (await db.Coaches.AnyAsync(ct)) return;
        var branch = await db.Branches.FirstAsync(ct);
        var swimming = await db.Activities.FirstAsync(a => a.Slug == "swimming", ct);
        var fitness = await db.Activities.FirstAsync(a => a.Slug == "fitness", ct);
        var group = await db.Activities.FirstAsync(a => a.Slug == "group-classes", ct);

        var noura = new Coach
        {
            Slug = "noura", NameAr = "نورة", NameEn = "Noura",
            BioAr = "مدربة سباحة معتمدة بخبرة أكثر من 8 سنوات.", BioEn = "Certified swim coach with 8+ years of experience.",
            Certifications = Json.Stringify(new[] { "ASA Level 2 Swimming", "Lifeguard Certified" }),
        };
        var layan = new Coach
        {
            Slug = "layan", NameAr = "ليان", NameEn = "Layan",
            BioAr = "أخصائية لياقة بدنية وقوة.", BioEn = "Strength & conditioning specialist.",
            Certifications = Json.Stringify(new[] { "NASM-CPT", "CrossFit L1" }),
        };
        var ruba = new Coach
        {
            Slug = "ruba", NameAr = "رُبى", NameEn = "Ruba",
            BioAr = "مدربة بيلاتس وأنشطة جماعية.", BioEn = "Pilates and group class coach.",
            Certifications = Json.Stringify(new[] { "STOTT Pilates", "Group Fitness ACE" }),
        };
        db.Coaches.AddRange(noura, layan, ruba);
        db.CoachActivities.AddRange(
            new CoachActivity { Coach = noura, Activity = swimming },
            new CoachActivity { Coach = layan, Activity = fitness },
            new CoachActivity { Coach = ruba, Activity = group },
            new CoachActivity { Coach = layan, Activity = group });
        db.CoachBranches.AddRange(
            new CoachBranch { Coach = noura, Branch = branch },
            new CoachBranch { Coach = layan, Branch = branch },
            new CoachBranch { Coach = ruba, Branch = branch });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedSchedulesAsync(MotionParkDbContext db, CancellationToken ct)
    {
        if (await db.ClassSchedules.AnyAsync(ct)) return;
        var branch = await db.Branches.FirstAsync(ct);
        var swimming = await db.Activities.FirstAsync(a => a.Slug == "swimming", ct);
        var fitness = await db.Activities.FirstAsync(a => a.Slug == "fitness", ct);
        var group = await db.Activities.FirstAsync(a => a.Slug == "group-classes", ct);
        var noura = await db.Coaches.FirstAsync(c => c.Slug == "noura", ct);
        var layan = await db.Coaches.FirstAsync(c => c.Slug == "layan", ct);
        var ruba = await db.Coaches.FirstAsync(c => c.Slug == "ruba", ct);

        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3));
        var templates = new (Activity Activity, Coach Coach, DayOfWeek Day, TimeOnly Start, TimeOnly End, int Capacity, string Name)[]
        {
            (group, ruba, DayOfWeek.Saturday, new TimeOnly(9, 0), new TimeOnly(10, 0), 12, "Pilates Flow"),
            (swimming, noura, DayOfWeek.Saturday, new TimeOnly(17, 0), new TimeOnly(18, 0), 8, "Swim Fundamentals"),
            (fitness, layan, DayOfWeek.Sunday, new TimeOnly(18, 0), new TimeOnly(19, 0), 10, "Strong & Sculpt"),
            (group, ruba, DayOfWeek.Monday, new TimeOnly(9, 0), new TimeOnly(10, 0), 12, "Pilates Flow"),
            (fitness, layan, DayOfWeek.Tuesday, new TimeOnly(18, 0), new TimeOnly(19, 0), 10, "Strong & Sculpt"),
            (swimming, noura, DayOfWeek.Wednesday, new TimeOnly(17, 0), new TimeOnly(18, 0), 8, "Swim Fundamentals"),
        };

        foreach (var t in templates)
        {
            for (var i = 0; i < 14; i++)
            {
                var date = today.AddDays(i);
                if (date.DayOfWeek != t.Day) continue;
                db.ClassSchedules.Add(new ClassSchedule
                {
                    BranchId = branch.Id, ActivityId = t.Activity.Id, CoachId = t.Coach.Id,
                    Date = date, StartTime = t.Start, EndTime = t.End, Capacity = t.Capacity,
                    GenderScope = GenderScope.Female, AgeMin = 14, AgeMax = null,
                });
            }
        }
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedFaqsAsync(MotionParkDbContext db, CancellationToken ct)
    {
        if (await db.Faqs.AnyAsync(ct)) return;
        db.Faqs.AddRange(
            new Faq
            {
                QuestionAr = "هل المجمع مخصص للنساء فقط؟", QuestionEn = "Is the facility women-only?",
                AnswerAr = "نعم، موشن بارك مجمع رياضي ورفاهي مخصص للنساء والفتيات بالكامل.",
                AnswerEn = "Yes — Motion Park is a sports and wellness facility entirely for women and girls.", SortOrder = 1,
            },
            new Faq
            {
                QuestionAr = "كيف أحجز حصة؟", QuestionEn = "How do I book a class?",
                AnswerAr = "سجلي حسابك، فعّلي عضويتك، ثم اختاري الحصة من الجدول واحجزي مكانك أونلاين.",
                AnswerEn = "Create an account, activate your membership, then pick a class from the schedule and book online.", SortOrder = 2,
            },
            new Faq
            {
                QuestionAr = "هل يمكنني إلغاء الحجز؟", QuestionEn = "Can I cancel a booking?",
                AnswerAr = "نعم، يمكن الإلغاء قبل موعد الحصة واستعادة الجلسة حسب سياسة العضوية.",
                AnswerEn = "Yes, you can cancel before the class and get the session back per the membership policy.", SortOrder = 3,
            },
            new Faq
            {
                QuestionAr = "ما هي طرق الدفع المتاحة؟", QuestionEn = "What payment methods are available?",
                AnswerAr = "مدى، Apple Pay، Visa/Mastercard — تُدار جميعها عبر بوابة الدفع بأمان.",
                AnswerEn = "Mada, Apple Pay, Visa/Mastercard — all handled securely via the payment gateway.", SortOrder = 4,
            });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedTestimonialsAsync(MotionParkDbContext db, CancellationToken ct)
    {
        if (await db.Testimonials.AnyAsync(ct)) return;
        db.Testimonials.AddRange(
            new Testimonial { Name = "سارة", TextAr = "مكان نظيف ومرتب والمدربات محترفات. صرت ما أطوف أسبوع بدون موشن!", TextEn = "Clean, organized and professional coaches. I never skip a week at Motion!", Rating = 5 },
            new Testimonial { Name = "ريم", TextAr = "السباحة هنا غيرت روتيني بالكامل، والخصوصية مريحة جداً.", TextEn = "Swimming here completely changed my routine — the privacy is so comfortable.", Rating = 5 },
            new Testimonial { Name = "هند", TextAr = "الحجز سهل والجدول متنوع. أفضل استثمار لصحتي هذا العام.", TextEn = "Easy booking and a varied schedule. The best investment in my health this year.", Rating = 5 });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedBannersAsync(MotionParkDbContext db, CancellationToken ct)
    {
        if (await db.Banners.AnyAsync(ct)) return;
        db.Banners.Add(new Banner
        {
            TitleAr = "انضمي لموشن بارك اليوم", TitleEn = "Join Motion Park today",
            SubtitleAr = "عضويات تبدأ من 299 ريال/شهر", SubtitleEn = "Memberships from SAR 299/month",
            LinkUrl = "/memberships", SortOrder = 1, Active = true,
        });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedPagesAsync(MotionParkDbContext db, CancellationToken ct)
    {
        if (await db.Pages.AnyAsync(ct)) return;
        db.Pages.AddRange(
            new Page
            {
                Slug = "about", TitleAr = "من نحن", TitleEn = "About Us",
                ContentAr = "موشن بارك — مجمع رياضي ورفاهي للنساء والفتيات في الرياض. مساحتك الآمنة لتتحركي وتكتشفي قوتك.",
                ContentEn = "Motion Park — a sports and wellness complex for women and girls in Riyadh. Your safe space to move and discover your strength.",
                SeoTitle = "About Motion Park", SeoDescription = "Women & girls sports and wellness complex in Riyadh.", IsPublished = true,
            },
            new Page
            {
                Slug = "privacy", TitleAr = "سياسة الخصوصية", TitleEn = "Privacy Policy",
                ContentAr = "نحترم خصوصيتك ونحمي بياناتك وفق الأنظمة المعمول بها في المملكة العربية السعودية. (محتوى قابل للتعديل)",
                ContentEn = "We respect your privacy and protect your data per applicable regulations in Saudi Arabia. (Configurable content)",
                SeoTitle = "Privacy Policy", IsPublished = true,
            },
            new Page
            {
                Slug = "terms", TitleAr = "الشروط والأحكام", TitleEn = "Terms & Conditions",
                ContentAr = "تحكم استخدامك لمنصة موشن بارك شروط وأحكام الاستخدام وسياسة العضوية. (محتوى قابل للتعديل)",
                ContentEn = "Your use of the Motion Park platform is governed by the terms of use and membership policy. (Configurable content)",
                SeoTitle = "Terms & Conditions", IsPublished = true,
            },
            new Page
            {
                Slug = "contact", TitleAr = "تواصلي معنا", TitleEn = "Contact Us",
                ContentAr = "الرياض، المملكة العربية السعودية — هاتف: +966 11 000 0000 — بريد: hello@motionpark.sa",
                ContentEn = "Riyadh, Saudi Arabia — Phone: +966 11 000 0000 — Email: hello@motionpark.sa",
                SeoTitle = "Contact Motion Park", IsPublished = true,
            });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedHomepageSectionsAsync(MotionParkDbContext db, CancellationToken ct)
    {
        var sections = new (string Key, string TitleAr, string TitleEn, object Content, int Order)[]
        {
            ("hero", "حركتك.. لحياة أجمل", "Move into a better life", new
            {
                badgeAr = "مجمع رياضي ورفاهي للنساء والفتيات", badgeEn = "Sports & wellness complex for women and girls",
                headingAr = "حركتك.. لحياة أجمل", headingEn = "Move into a better life",
                subtitleAr = "مساحتك الآمنة لتتحركي، تكتشفي قوتك، وتبني روتيناً تحبين العودة إليه.",
                subtitleEn = "Your safe space to move, discover your strength, and build a routine you love coming back to.",
                stats = new[]
                {
                    new { value = "+25", labelAr = "نشاطاً أسبوعياً", labelEn = "weekly activities" },
                    new { value = "+12", labelAr = "مدرّبة متخصصة", labelEn = "specialized coaches" },
                    new { value = "4.9/5", labelAr = "تقييم العضوات", labelEn = "member rating" },
                },
                ctaAr = "ابدئي الآن", ctaEn = "Get started", ctaLink = "/memberships",
            }, 1),
            ("activities", "أنشطتنا", "Our Activities", new
            {
                headingAr = "أنشطة تحفزك", headingEn = "Activities that motivate you",
                subtitleAr = "من السباحة إلى كرة القدم النسائية — هناك نشاط يناسبك.",
                subtitleEn = "From swimming to women's football — there's an activity for you.",
            }, 2),
            ("schedule", "الجدول الأسبوعي", "Weekly Schedule", new
            {
                headingAr = "جدولك الأسبوعي", headingEn = "Your weekly schedule",
                subtitleAr = "احجزي حصتك في الوقت الذي يناسبك.",
                subtitleEn = "Book your class at the time that suits you.",
            }, 3),
            ("story", "قصتنا", "Our Story", new
            {
                headingAr = "مكان تتحول فيه الحركة إلى انتماء.", headingEn = "A place where movement becomes belonging.",
                bodyAr = "وُلد موشن بارك من إيماننا بأن كل امرأة تستحق مساحة آمنة تتحرك فيها بحرية.",
                bodyEn = "Motion Park was born from our belief that every woman deserves a safe space to move freely.",
                values = new[]
                {
                    new { titleAr = "خصوصية وراحة", titleEn = "Privacy & comfort" },
                    new { titleAr = "مدرّبات متخصصات", titleEn = "Specialized coaches" },
                    new { titleAr = "تنوع يحفزك", titleEn = "Motivating variety" },
                    new { titleAr = "مجتمع إيجابي", titleEn = "Positive community" },
                },
            }, 4),
            ("memberships", "العضويات", "Memberships", new
            {
                headingAr = "عضوية تناسبك", headingEn = "A membership that fits you",
                subtitleAr = "اختري الخطة التي تناسب أهدافك — الأسعار النهائية تُدار عبر نظام أودو.",
                subtitleEn = "Pick the plan that fits your goals — final pricing is managed in Odoo.",
            }, 5),
            ("testimonials", "آراء العضوات", "Member Stories", new
            {
                headingAr = "ماذا تقول العضوات؟", headingEn = "What our members say",
            }, 6),
            ("cta", "ابدئي رحلتك", "Start your journey", new
            {
                headingAr = "جاهزة تبدئين؟", headingEn = "Ready to start?",
                subtitleAr = "انضمي لمجتمع موشن بارك اليوم.",
                subtitleEn = "Join the Motion Park community today.",
                buttonAr = "سجلي الآن", buttonEn = "Sign up", link = "/register",
            }, 7),
            ("footer", "موشن بارك", "Motion Park", new
            {
                descriptionAr = "مجمع رياضي ورفاهي للنساء والفتيات — الرياض، المملكة العربية السعودية.",
                descriptionEn = "Sports & wellness complex for women and girls — Riyadh, Saudi Arabia.",
                phone = "+966 11 000 0000", email = "hello@motionpark.sa",
            }, 8),
        };

        foreach (var (key, titleAr, titleEn, content, order) in sections)
        {
            var existing = await db.PageSections.FirstOrDefaultAsync(s => s.SectionKey == key, ct);
            if (existing is not null) continue;
            db.PageSections.Add(new PageSection
            {
                SectionKey = key,
                TitleAr = titleAr, TitleEn = titleEn,
                Content = Json.Stringify(content),
                SortOrder = order,
                IsEnabled = true, IsPublished = true,
                PublishedAt = DateTime.UtcNow,
            });
        }
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// First-run bootstrap: if no SuperAdmin exists, create one with a random password,
    /// print it to the logs and write it to /root/.motionpark/INITIAL_ADMIN.txt (mode 600).
    /// </summary>
    public static async Task EnsureSuperAdminAsync(MotionParkDbContext db, IConfiguration config,
        ILogger logger, CancellationToken ct)
    {
        var hasAdmin = await db.UserRoles.AnyAsync(ur => ur.Role.Name == RoleNames.SuperAdmin, ct);
        if (hasAdmin) return;

        var superAdminRole = await db.Roles.FirstAsync(r => r.Name == RoleNames.SuperAdmin, ct);
        var password = Crypto.NewOpaqueToken(24);
        var user = new User
        {
            Name = "Motion Park Super Admin",
            Email = "admin@motionpark.local",
            NormalizedEmail = "ADMIN@MOTIONPARK.LOCAL",
            Phone = "+966500000001",
            PreferredLanguage = "ar",
        };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, password);
        db.Users.Add(user);
        db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = superAdminRole.Id });
        await db.SaveChangesAsync(ct);

        var banner = "==============================================================";
        logger.LogInformation("{Banner}\nMotion Park SuperAdmin bootstrap\nEmail: {Email}\nPassword: {Password}\n{Banner2}",
            banner, user.Email, password, banner);
        await WriteInitialAdminFileAsync(user.Email, password, config, logger, ct);
    }

    private static async Task WriteInitialAdminFileAsync(string email, string password,
        IConfiguration config, ILogger logger, CancellationToken ct)
    {
        var content = $"Motion Park initial SuperAdmin credentials (generated at bootstrap)\n" +
                      $"Email: {email}\nPassword: {password}\n" +
                      $"Store securely and delete this file after first login.\n";
        var candidates = new[]
        {
            "/root/.motionpark/INITIAL_ADMIN.txt",
            Path.Combine(config["MP_ADMIN_BOOTSTRAP_DIR"] ?? "/var/www/motionpark/logs", "INITIAL_ADMIN.txt"),
        };
        foreach (var path in candidates)
        {
            try
            {
                await File.WriteAllTextAsync(path, content, ct);
                if (OperatingSystem.IsLinux())
                    File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite);
                logger.LogInformation("Initial admin credentials written to {Path} (mode 600)", path);
                return;
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                logger.LogWarning(ex, "Could not write admin bootstrap file to {Path}", path);
            }
        }
        logger.LogWarning("Admin bootstrap file could not be written anywhere — credentials are only in the log above.");
    }
}
