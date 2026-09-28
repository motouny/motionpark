using MotionPark.Application.Memberships;

using Xunit;

namespace MotionPark.Tests;

public class MembershipPlanMapperTests
{
    [Fact]
    public void Maps_odoo_payload_to_read_models()
    {
        var payload = new List<Dictionary<string, object?>>
        {
            new()
            {
                ["id"] = 12,
                ["slug"] = "motion-plus",
                ["name_ar"] = "موشن بلس",
                ["name_en"] = "Motion Plus",
                ["description_ar"] = "حصص غير محدودة",
                ["description_en"] = "Unlimited sessions",
                ["price"] = 499.0,
                ["vat"] = 15.0,
                ["currency"] = "SAR",
                ["duration"] = 1,
                ["duration_unit"] = "month",
                ["session_limit"] = 0,
                ["featured"] = true,
                ["sort_order"] = 2,
                ["active"] = true,
                ["features_ar"] = new object?[] { "حصص غير محدودة", "أولوية الحجز" },
                ["features_en"] = new object?[] { "Unlimited sessions" },
                ["branches"] = new object?[]
                {
                    new Dictionary<string, object?> { ["id"] = "guid-b", ["name_ar"] = "الرياض", ["name_en"] = "Riyadh" },
                },
            },
            new()
            {
                ["id"] = 13,
                ["slug"] = "",
                ["name_en"] = "Park Signature!",
                ["price"] = "799.5",
                ["active"] = 1,
            },
        };

        var mapped = MembershipPlanMapper.FromOdooProducts(payload);

        Assert.Equal(2, mapped.Count);

        var plus = mapped[0];
        Assert.Equal(12, plus.OdooProductId);
        Assert.Equal("motion-plus", plus.Slug);
        Assert.Equal("موشن بلس", plus.NameAr);
        Assert.Equal(499m, plus.Price);
        Assert.Equal(15m, plus.Vat);
        Assert.Equal("month", plus.DurationUnit);
        Assert.True(plus.Featured);
        Assert.True(plus.Active);
        Assert.Equal("odoo", plus.Source);
        Assert.False(plus.IsConfigurablePlaceholder);

        var signature = mapped[1];
        Assert.Equal("park-signature", signature.Slug); // slugified from name
        Assert.Equal(799.5m, signature.Price);          // numeric string coerced
        Assert.True(signature.Active);                  // int 1 coerced
        Assert.Equal("Park Signature!", signature.NameEn);
    }
}
