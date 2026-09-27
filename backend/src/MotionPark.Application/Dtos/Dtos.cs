using MotionPark.Domain.Bookings;
using MotionPark.Domain.Catalog;
using MotionPark.Domain.Membership;

namespace MotionPark.Application.Dtos;

public record LocalizedRefDto(Guid Id, string NameAr, string NameEn);

public record MembershipPlanDto(
    Guid Id, int? OdooProductId, string Slug, string NameAr, string NameEn,
    string? DescriptionAr, string? DescriptionEn, decimal Price, decimal Vat, string Currency,
    int Duration, string DurationUnit, int SessionLimit,
    IReadOnlyList<string> FeaturesAr, IReadOnlyList<string> FeaturesEn,
    IReadOnlyList<LocalizedRefDto> Branches, IReadOnlyList<LocalizedRefDto> Activities,
    bool Featured, int SortOrder, bool Active, string Source, bool IsConfigurablePlaceholder);

public static class PlanMapper
{
    public static MembershipPlanDto ToDto(MembershipPlanReadModel p) => new(
        p.Id, p.OdooProductId, p.Slug, p.NameAr, p.NameEn, p.DescriptionAr, p.DescriptionEn,
        p.Price, p.Vat, p.Currency, p.Duration, p.DurationUnit, p.SessionLimit,
        Common.Json.ParseList<string>(p.FeaturesAr), Common.Json.ParseList<string>(p.FeaturesEn),
        Common.Json.ParseList<LocalizedRefDto>(p.Branches), Common.Json.ParseList<LocalizedRefDto>(p.Activities),
        p.Featured, p.SortOrder, p.Active, p.Source, p.IsConfigurablePlaceholder);
}

public record ScheduleDto(
    Guid Id, Guid BranchId, string? BranchNameAr, string? BranchNameEn,
    Guid ActivityId, string? ActivityNameAr, string? ActivityNameEn,
    Guid? CoachId, string? CoachNameAr, string? CoachNameEn,
    string Date, string StartTime, string EndTime,
    int Capacity, int BookedCount, int SeatsLeft, int WaitingListCount,
    int? AgeMin, int? AgeMax, string GenderScope, IReadOnlyList<Guid> MembershipPlanIds);

public static class ScheduleMapper
{
    public static ScheduleDto ToDto(ClassSchedule s) => new(
        s.Id, s.BranchId, s.Branch?.NameAr, s.Branch?.NameEn,
        s.ActivityId, s.Activity?.NameAr, s.Activity?.NameEn,
        s.CoachId, s.Coach?.NameAr, s.Coach?.NameEn,
        s.Date.ToString("yyyy-MM-dd"), s.StartTime.ToString("HH:mm"), s.EndTime.ToString("HH:mm"),
        s.Capacity, s.BookedCount, s.SeatsLeft, s.WaitingListCount,
        s.AgeMin, s.AgeMax, s.GenderScope.ToString().ToLowerInvariant(),
        s.SchedulePlans.Select(p => p.MembershipPlanId).ToList());
}

public record BookingDto(
    Guid Id, Guid ScheduleId, string Status, int? WaitingListPosition,
    DateTime CreatedAt, DateTime? CancelledAt, ScheduleDto Schedule);

public static class BookingMapper
{
    public static BookingDto ToDto(Booking b, int? position = null) => new(
        b.Id, b.ScheduleId, b.Status.ToString(), position, b.CreatedAt, b.CancelledAt,
        ScheduleMapper.ToDto(b.Schedule));
}
