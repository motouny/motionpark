using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Domain;
using MotionPark.Domain.Customers;

namespace MotionPark.Api.Controllers.Admin;

[ApiController]
[Route("api/admin")]
public class AdminCustomersController(IApplicationDbContext db, IAuditLogger audit) : ControllerBase
{
    [HttpGet("customers")]
    [Authorize(Roles = "SuperAdmin,MembershipManager,CustomerService,FinanceViewer")]
    public async Task<IActionResult> GetCustomers([FromQuery] string? search, CancellationToken ct)
    {
        var query = db.Customers.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c => c.Name.Contains(search) || c.Phone.Contains(search)
                || (c.Email ?? "").Contains(search));
        var customers = await query.OrderByDescending(c => c.CreatedAt).Take(500)
            .Select(c => new
            {
                c.Id, c.Name, c.Phone, c.Email, c.DateOfBirth, c.Gender,
                c.OdooPartnerId, c.IsActive, c.CreatedAt,
                userId = c.UserId,
            })
            .ToListAsync(ct);
        return Ok(customers);
    }

    [HttpGet("customers/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,MembershipManager,CustomerService")]
    public async Task<IActionResult> GetCustomer(Guid id, CancellationToken ct)
    {
        var customer = await db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
        if (customer is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Customer not found." } });

        var memberships = await db.CustomerMemberships.Where(m => m.CustomerId == id)
            .OrderByDescending(m => m.StartDate)
            .Select(m => new { m.Id, planId = m.MembershipPlanId, m.Status, m.StartDate, m.EndDate, m.PaymentStatus })
            .ToListAsync(ct);

        return Ok(new
        {
            customer.Id, customer.Name, customer.Phone, customer.Email,
            customer.DateOfBirth, customer.Gender, customer.OdooPartnerId, customer.IsActive,
            memberships,
        });
    }

    [HttpPut("customers/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,CustomerService")]
    public async Task<IActionResult> UpdateCustomer(Guid id, [FromBody] UpdateCustomerRequest req, CancellationToken ct)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (customer is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Customer not found." } });

        if (req.Name is not null) customer.Name = req.Name;
        if (req.Email is not null) customer.Email = req.Email;
        if (req.DateOfBirth.HasValue) customer.DateOfBirth = req.DateOfBirth;
        if (req.Gender is not null) customer.Gender = req.Gender;
        if (req.IsActive.HasValue) customer.IsActive = req.IsActive.Value;
        if (req.Phone is not null && PhoneNormalizer.Normalize(req.Phone) is { } phone)
        {
            customer.Phone = phone;
            if (customer.UserId.HasValue)
            {
                var user = await db.Users.FirstOrDefaultAsync(u => u.Id == customer.UserId.Value, ct);
                if (user is not null) user.Phone = phone;
            }
        }
        customer.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Customer", id.ToString(), "Updated", req, ct);
        return Ok(new { customer.Id, customer.Name, customer.Phone, customer.Email, customer.IsActive });
    }

    [HttpGet("leads")]
    [Authorize(Roles = "SuperAdmin,Marketing,CustomerService")]
    public async Task<IActionResult> GetLeads([FromQuery] string? status, CancellationToken ct)
    {
        var query = db.Leads.AsNoTracking().AsQueryable();
        if (Enum.TryParse<LeadStatus>(status, ignoreCase: true, out var s)) query = query.Where(l => l.Status == s);
        var leads = await query.OrderByDescending(l => l.CreatedAt).Take(500)
            .Select(l => new
            {
                l.Id, l.Name, l.Phone, l.Email, type = l.Type.ToString(), status = l.Status.ToString(),
                l.BranchId, l.ActivityId, l.MembershipPlanId, l.Message,
                l.UtmSource, l.UtmCampaign, l.UtmMedium, l.OdooLeadId, l.CreatedAt,
            })
            .ToListAsync(ct);
        return Ok(leads);
    }

    [HttpPut("leads/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,Marketing,CustomerService")]
    public async Task<IActionResult> UpdateLead(Guid id, [FromBody] UpdateLeadRequest req, CancellationToken ct)
    {
        var lead = await db.Leads.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lead is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Lead not found." } });
        if (req.Status is not null && Enum.TryParse<LeadStatus>(req.Status, ignoreCase: true, out var status))
        {
            lead.Status = status;
            lead.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            await audit.LogAsync("Lead", id.ToString(), "Updated", new { lead.Status }, ct);
        }
        return Ok(new { lead.Id, status = lead.Status.ToString() });
    }
}

public record UpdateCustomerRequest(string? Name, string? Email, string? Phone,
    DateTime? DateOfBirth, string? Gender, bool? IsActive);
public record UpdateLeadRequest(string? Status);

[ApiController]
[Route("api/admin/membership-plans")]
public class AdminMembershipPlansController(IApplicationDbContext db, IAuditLogger audit) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "SuperAdmin,MembershipManager,FinanceViewer")]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var plans = await db.MembershipPlanReadModels.OrderBy(p => p.SortOrder).ToListAsync(ct);
        return Ok(plans.Select(p => new
        {
            p.Id, p.OdooProductId, p.Slug, p.NameAr, p.NameEn, p.Price, p.Vat, p.Currency,
            p.Featured, p.SortOrder, p.Active, p.Source, p.IsConfigurablePlaceholder,
            p.Duration, p.DurationUnit, p.SessionLimit,
        }));
    }

    /// <summary>Display-only overrides. Price/VAT/duration stay Odoo-owned and are rejected here.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin,MembershipManager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePlanDisplayRequest req, CancellationToken ct)
    {
        var plan = await db.MembershipPlanReadModels.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (plan is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Plan not found." } });

        if (req.Featured.HasValue) plan.Featured = req.Featured.Value;
        if (req.SortOrder.HasValue) plan.SortOrder = req.SortOrder.Value;
        if (req.Active.HasValue) plan.Active = req.Active.Value;
        if (req.NameAr is not null) plan.NameAr = req.NameAr;
        if (req.NameEn is not null) plan.NameEn = req.NameEn;
        if (req.DescriptionAr is not null) plan.DescriptionAr = req.DescriptionAr;
        if (req.DescriptionEn is not null) plan.DescriptionEn = req.DescriptionEn;
        plan.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("MembershipPlan", id.ToString(), "DisplayUpdated",
            new { req.Featured, req.SortOrder, req.Active }, ct);
        return Ok(new { plan.Id, plan.Slug, plan.Featured, plan.SortOrder, plan.Active });
    }
}

public record UpdatePlanDisplayRequest(bool? Featured, int? SortOrder, bool? Active,
    string? NameAr, string? NameEn, string? DescriptionAr, string? DescriptionEn);
