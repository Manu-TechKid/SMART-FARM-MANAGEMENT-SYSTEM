using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFarm.Api.Data;
using SmartFarm.Api.DTOs;
using SmartFarm.Api.Models;
using SmartFarm.Api.Services;

namespace SmartFarm.Api.Controllers;

[ApiController]
[Route("api/farms/{farmId:int}")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly SmartFarmDbContext _db;
    private readonly IFarmService _farmService;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public TasksController(SmartFarmDbContext db, IFarmService farmService)
    {
        _db = db;
        _farmService = farmService;
    }

    [HttpGet("tasks")]
    public async Task<IActionResult> GetTasks(int farmId, [FromQuery] string? status, [FromQuery] string? priority)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var query = _db.FarmTasks.Where(t => t.FarmId == farmId);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(t => t.Status == status);
        if (!string.IsNullOrWhiteSpace(priority)) query = query.Where(t => t.Priority == priority);

        return Ok(await query.OrderBy(t => t.DueDate).ToListAsync());
    }

    [HttpPost("tasks")]
    public async Task<IActionResult> CreateTask(int farmId, [FromBody] CreateTaskRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var task = new FarmTask
        {
            FarmId = farmId,
            Title = request.Title,
            Description = request.Description,
            AssignedToUserId = request.AssignedToUserId,
            DueDate = request.DueDate,
            Priority = request.Priority ?? TaskPriority.Medium,
            Category = request.Category,
            RelatedEntityType = request.RelatedEntityType,
            RelatedEntityId = request.RelatedEntityId,
            Status = Models.TaskStatus.Pending,
            CreatedBy = UserId
        };
        _db.FarmTasks.Add(task);
        await _db.SaveChangesAsync();
        return Ok(task);
    }

    [HttpPut("tasks/{id:int}/status")]
    public async Task<IActionResult> UpdateTaskStatus(int farmId, int id, [FromBody] UpdateTaskStatusRequest request)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        var task = await _db.FarmTasks.FirstOrDefaultAsync(t => t.FarmId == farmId && t.Id == id);
        if (task == null) return NotFound();

        task.Status = request.Status;
        if (request.Status == Models.TaskStatus.Completed)
        {
            task.CompletedAt = DateTime.UtcNow;
            task.CompletedBy = UserId;
        }
        task.UpdatedBy = UserId;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications(int farmId, [FromQuery] bool? unread)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var query = _db.Notifications.Where(n => n.FarmId == farmId &&
            (n.TargetUserId == null || n.TargetUserId == UserId));
        if (unread == true) query = query.Where(n => !n.IsRead);

        return Ok(await query.OrderByDescending(n => n.CreatedAt).Take(50).ToListAsync());
    }

    [HttpPut("notifications/{id:int}/read")]
    public async Task<IActionResult> MarkNotificationRead(int farmId, int id)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        var notification = await _db.Notifications.FirstOrDefaultAsync(n => n.FarmId == farmId && n.Id == id);
        if (notification == null) return NotFound();

        notification.IsRead = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("notifications/read-all")]
    public async Task<IActionResult> MarkAllNotificationsRead(int farmId)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        var unread = await _db.Notifications
            .Where(n => n.FarmId == farmId && !n.IsRead && (n.TargetUserId == null || n.TargetUserId == UserId))
            .ToListAsync();
        foreach (var n in unread) n.IsRead = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("notifications/generate-reminders")]
    public async Task<IActionResult> GenerateSmartReminders(int farmId)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var today = DateTime.UtcNow.Date;
        var existingTitles = (await _db.Notifications
            .Where(n => n.FarmId == farmId && !n.IsRead)
            .Select(n => n.Title)
            .ToListAsync()).ToHashSet();

        var created = new List<Notification>();
        void AddOnce(string type, string title, string message, string? entityType = null, int? entityId = null)
        {
            if (existingTitles.Contains(title)) return;
            existingTitles.Add(title);
            created.Add(new Notification
            {
                FarmId = farmId, Type = type, Title = title, Message = message,
                RelatedEntityType = entityType, RelatedEntityId = entityId, CreatedBy = UserId
            });
        }

        // 1. Overdue and upcoming vaccinations
        var vaxRecords = await _db.VaccinationRecords
            .Include(v => v.Animal).Include(v => v.Group)
            .Where(v => v.FarmId == farmId && v.Status == VaccinationStatus.Scheduled && v.ScheduledDate != null)
            .ToListAsync();

        foreach (var v in vaxRecords)
        {
            var target = v.Animal?.TagId ?? v.Group?.Name ?? v.Species;
            if (v.ScheduledDate!.Value.Date < today)
            {
                v.Status = VaccinationStatus.Overdue;
                AddOnce(NotificationType.Alert, $"Overdue Vaccination: {v.VaccineName} ({target})",
                    $"Vaccination '{v.VaccineName}' for {target} was due on {v.ScheduledDate.Value:yyyy-MM-dd}.", "VaccinationRecord", v.Id);
            }
            else if (v.ScheduledDate.Value.Date <= today.AddDays(7))
            {
                AddOnce(NotificationType.Reminder, $"Upcoming Vaccination: {v.VaccineName} ({target})",
                    $"Scheduled vaccination '{v.VaccineName}' for {target} is due on {v.ScheduledDate.Value:yyyy-MM-dd}.", "VaccinationRecord", v.Id);
            }
        }

        // 2. Breeding expected births in next 14 days
        var upcomingBirths = await _db.BreedingRecords
            .Include(b => b.Dam)
            .Where(b => b.FarmId == farmId && (b.Status == BreedingStatus.Mated || b.Status == BreedingStatus.Pregnant) &&
                        b.ExpectedDOB != null && b.ExpectedDOB <= today.AddDays(14))
            .ToListAsync();

        foreach (var b in upcomingBirths)
        {
            var damTag = b.Dam?.TagId ?? $"Dam #{b.DamId}";
            AddOnce(NotificationType.Reminder, $"Breeding Milestone: {damTag}",
                $"Expected birth for {damTag} is scheduled around {b.ExpectedDOB:yyyy-MM-dd}. Prepare maternity pen.", "BreedingRecord", b.Id);
        }

        // 3. Hive inspections due
        var hives = await _db.Beehives
            .Where(h => h.FarmId == farmId && h.ColonyStatus == ColonyStatus.Active &&
                        (h.LastInspectionDate == null || h.LastInspectionDate <= today.AddDays(-14)))
            .ToListAsync();

        foreach (var h in hives)
        {
            AddOnce(NotificationType.Reminder, $"Hive Inspection Due: {h.HiveCode}",
                $"Beehive {h.HiveCode} ({h.ApiaryName ?? "Apiary"}) is due for colony and queen health inspection.", "Beehive", h.Id);
        }

        // 4. Low stock & Expiring inventory
        var items = await _db.InventoryItems.Where(i => i.FarmId == farmId && i.IsActive).ToListAsync();
        foreach (var i in items)
        {
            if (i.CurrentStock <= i.MinimumStock)
            {
                AddOnce(NotificationType.Warning, $"Low Stock: {i.Name}",
                    $"{i.Name} is at {i.CurrentStock} {i.Unit} (minimum threshold: {i.MinimumStock} {i.Unit}). Replenish stock.", "InventoryItem", i.Id);
            }
            if (i.ExpiryDate.HasValue && i.ExpiryDate.Value.Date <= today.AddDays(30))
            {
                AddOnce(NotificationType.Warning, $"Expiry Alert: {i.Name}",
                    $"{i.Name} expires on {i.ExpiryDate.Value:yyyy-MM-dd}. Review usage or disposal.", "InventoryItem", i.Id);
            }
        }

        // 5. Pending deliveries past expected arrival
        var pendingDel = await _db.Deliveries
            .Where(d => d.FarmId == farmId && (d.Status == DeliveryStatus.Pending || d.Status == DeliveryStatus.Dispatched) &&
                        d.ExpectedArrival != null && d.ExpectedArrival < today)
            .ToListAsync();

        foreach (var d in pendingDel)
        {
            AddOnce(NotificationType.Alert, $"Delivery Overdue: {d.DeliveryNumber}",
                $"Delivery {d.DeliveryNumber} is still '{d.Status}' past expected arrival ({d.ExpectedArrival:yyyy-MM-dd}).", "Delivery", d.Id);
        }

        // 6. Overdue invoices
        var overdueInvoices = await _db.Invoices
            .Where(inv => inv.FarmId == farmId && inv.Status != InvoiceStatus.Paid && inv.Status != InvoiceStatus.Voided && inv.DueDate < today)
            .ToListAsync();

        foreach (var inv in overdueInvoices)
        {
            inv.Status = InvoiceStatus.Overdue;
            AddOnce(NotificationType.Alert, $"Invoice Overdue: {inv.InvoiceNumber}",
                $"Invoice {inv.InvoiceNumber} has an unpaid balance of {inv.Amount - inv.PaidAmount:N2} past due date {inv.DueDate:yyyy-MM-dd}.", "Invoice", inv.Id);
        }

        if (created.Count > 0)
            _db.Notifications.AddRange(created);

        await _db.SaveChangesAsync();
        return Ok(new { generatedCount = created.Count, items = created });
    }
}
