using FluentValidation;
using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Application.Messaging;
using MotionPark.Domain;
using MotionPark.Domain.Cms;
using MotionPark.Domain.Integrations;

namespace MotionPark.Application.Leads;

public record LeadDto(
    Guid Id, string Name, string? Phone, string? Email, string Type, string Status,
    Guid? BranchId, Guid? ActivityId, Guid? MembershipPlanId, string? Message,
    DateTime CreatedAt);

public record CreateLeadCommand(
    string Name, string? Phone, string? Email, string Type,
    Guid? BranchId, Guid? ActivityId, Guid? MembershipPlanId, string? Message,
    string? UtmSource, string? UtmCampaign, string? UtmMedium)
    : IRequest<LeadDto>;

public class CreateLeadValidator : AbstractValidator<CreateLeadCommand>
{
    public CreateLeadValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Phone).NotEmpty().When(x => string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.Type).Must(t => Enum.TryParse<LeadType>(t, ignoreCase: true, out _))
            .WithMessage("Type must be one of: contact, callback, trial, membership_interest.");
    }
}

public sealed class CreateLeadHandler(
    IApplicationDbContext db,
    IValidator<CreateLeadCommand> validator)
    : IRequestHandler<CreateLeadCommand, LeadDto>
{
    public async Task<LeadDto> Handle(CreateLeadCommand cmd, CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(cmd, ct);
        if (!validation.IsValid)
            throw new ValidationAppException("Lead failed validation.", validation.ToDictionary());

        var lead = new Lead
        {
            Name = cmd.Name.Trim(),
            Phone = PhoneNormalizer.NormalizeLoose(cmd.Phone),
            Email = cmd.Email?.Trim(),
            Type = Enum.Parse<LeadType>(cmd.Type, ignoreCase: true),
            BranchId = cmd.BranchId,
            ActivityId = cmd.ActivityId,
            MembershipPlanId = cmd.MembershipPlanId,
            Message = cmd.Message,
            UtmSource = cmd.UtmSource,
            UtmCampaign = cmd.UtmCampaign,
            UtmMedium = cmd.UtmMedium,
        };
        db.Leads.Add(lead);

        // Queue the Odoo CRM sync — idempotent by lead UUID; failure is retried later.
        db.OdooSyncJobs.Add(new OdooSyncJob
        {
            JobType = SyncJobType.LeadSync,
            Payload = Json.Stringify(new { leadId = lead.Id }),
            MotionParkTransactionId = lead.Id.ToString(),
        });

        await db.SaveChangesAsync(ct);
        return new LeadDto(lead.Id, lead.Name, lead.Phone, lead.Email, lead.Type.ToString(),
            lead.Status.ToString(), lead.BranchId, lead.ActivityId, lead.MembershipPlanId,
            lead.Message, lead.CreatedAt);
    }
}
