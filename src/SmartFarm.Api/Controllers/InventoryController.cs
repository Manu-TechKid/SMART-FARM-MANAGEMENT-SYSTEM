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
[Route("api/farms/{farmId:int}/inventory")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly SmartFarmDbContext _db;
    private readonly IFarmService _farmService;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public InventoryController(SmartFarmDbContext db, IFarmService farmService)
    {
        _db = db;
        _farmService = farmService;
    }

    [HttpGet]
    public async Task<IActionResult> GetItems(int farmId,
        [FromQuery] string? category,
        [FromQuery] bool? lowStock,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var query = _db.InventoryItems.Where(i => i.FarmId == farmId && i.IsActive);
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(i => i.Category == category);
        if (lowStock == true) query = query.Where(i => i.CurrentStock <= i.MinimumStock);

        var total = await query.CountAsync();
        var now = DateTime.UtcNow;
        var items = await query.OrderBy(i => i.Name).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(i => new InventoryItemResponse(
                i.Id, i.Name, i.Category, i.Unit, i.CurrentStock, i.MinimumStock, i.UnitCost, i.ExpiryDate,
                i.CurrentStock <= i.MinimumStock,
                i.ExpiryDate.HasValue && i.ExpiryDate.Value <= now.AddDays(30),
                i.CreatedAt))
            .ToListAsync();

        return Ok(new PagedResult<InventoryItemResponse>(items, total, page, pageSize, (int)Math.Ceiling((double)total / pageSize)));
    }

    [HttpGet("alerts")]
    public async Task<IActionResult> GetAlerts(int farmId)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        var now = DateTime.UtcNow;

        var lowStock = await _db.InventoryItems
            .Where(i => i.FarmId == farmId && i.IsActive && i.CurrentStock <= i.MinimumStock)
            .Select(i => new { i.Id, i.Name, i.Category, i.CurrentStock, i.MinimumStock, i.Unit, AlertType = "LowStock" })
            .ToListAsync();

        var expiring = await _db.InventoryItems
            .Where(i => i.FarmId == farmId && i.IsActive && i.ExpiryDate.HasValue && i.ExpiryDate.Value <= now.AddDays(30))
            .Select(i => new { i.Id, i.Name, i.Category, i.ExpiryDate, AlertType = "Expiring" })
            .ToListAsync();

        return Ok(new { LowStock = lowStock, Expiring = expiring });
    }

    [HttpPost]
    public async Task<IActionResult> CreateItem(int farmId, [FromBody] CreateInventoryItemRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var item = new InventoryItem
        {
            FarmId = farmId,
            Name = request.Name,
            Category = request.Category,
            Unit = request.Unit,
            MinimumStock = request.MinimumStock,
            UnitCost = request.UnitCost,
            ExpiryDate = request.ExpiryDate,
            SupplierId = request.SupplierId,
            Description = request.Description,
            CreatedBy = UserId
        };
        _db.InventoryItems.Add(item);
        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateItem(int farmId, int id, [FromBody] CreateInventoryItemRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var item = await _db.InventoryItems.FirstOrDefaultAsync(i => i.FarmId == farmId && i.Id == id);
        if (item == null) return NotFound();

        item.Name = request.Name;
        item.Category = request.Category;
        item.Unit = request.Unit;
        item.MinimumStock = request.MinimumStock;
        item.UnitCost = request.UnitCost;
        item.ExpiryDate = request.ExpiryDate;
        item.SupplierId = request.SupplierId;
        item.Description = request.Description;
        item.UpdatedBy = UserId;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteItem(int farmId, int id)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var item = await _db.InventoryItems.FirstOrDefaultAsync(i => i.FarmId == farmId && i.Id == id);
        if (item == null) return NotFound();

        item.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/movements")]
    public async Task<IActionResult> AddMovement(int farmId, int id, [FromBody] AddStockMovementRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var item = await _db.InventoryItems.FirstOrDefaultAsync(i => i.FarmId == farmId && i.Id == id);
        if (item == null) return NotFound();

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var movement = new StockMovement
            {
                ItemId = id,
                FarmId = farmId,
                MovementType = request.MovementType,
                Quantity = request.Quantity,
                UnitCost = request.UnitCost,
                MovementDate = request.MovementDate,
                Reference = request.Reference,
                Notes = request.Notes,
                RecordedBy = UserId,
                CreatedBy = UserId
            };

            // Update current stock
            if (request.MovementType == MovementType.Receipt || request.MovementType == MovementType.Return)
                item.CurrentStock += request.Quantity;
            else if (request.MovementType == MovementType.Usage || request.MovementType == MovementType.Wastage || request.MovementType == MovementType.Transfer)
            {
                if (item.CurrentStock < request.Quantity)
                    return BadRequest(new { error = "Insufficient stock." });
                item.CurrentStock -= request.Quantity;
            }
            else if (request.MovementType == MovementType.Adjustment)
                item.CurrentStock = request.Quantity; // set absolute value

            _db.StockMovements.Add(movement);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new { movement.Id, item.CurrentStock });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    [HttpGet("{id:int}/movements")]
    public async Task<IActionResult> GetMovements(int farmId, int id, [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var query = _db.StockMovements.Where(m => m.FarmId == farmId && m.ItemId == id);
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(m => m.MovementDate).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new PagedResult<StockMovement>(items, total, page, pageSize, (int)Math.Ceiling((double)total / pageSize)));
    }
}
