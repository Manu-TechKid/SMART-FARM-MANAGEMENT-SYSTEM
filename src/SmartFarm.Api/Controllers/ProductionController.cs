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
[Route("api/farms/{farmId:int}/production")]
[Authorize]
public class ProductionController : ControllerBase
{
    private readonly SmartFarmDbContext _db;
    private readonly IFarmService _farmService;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public ProductionController(SmartFarmDbContext db, IFarmService farmService)
    {
        _db = db;
        _farmService = farmService;
    }

    [HttpGet]
    public async Task<IActionResult> GetRecords(int farmId,
        [FromQuery] string? productType,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var query = _db.ProductionRecords.Where(p => p.FarmId == farmId);
        if (!string.IsNullOrWhiteSpace(productType)) query = query.Where(p => p.ProductType == productType);
        if (from.HasValue) query = query.Where(p => p.ProductionDate >= from.Value);
        if (to.HasValue) query = query.Where(p => p.ProductionDate <= to.Value);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(p => p.ProductionDate)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Include(p => p.Animal).Include(p => p.Group).Include(p => p.Beehive)
            .Select(p => new
            {
                p.Id, p.ProductType, p.ProductionDate, p.Quantity, p.RejectedQuantity,
                p.Unit, p.QualityStatus, p.BatchCode,
                AnimalTag = p.Animal != null ? p.Animal.TagId : null,
                GroupName = p.Group != null ? p.Group.Name : null,
                HiveCode = p.Beehive != null ? p.Beehive.HiveCode : null,
                p.Notes, p.CreatedAt
            })
            .ToListAsync();

        return Ok(new { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(int farmId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? productType)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var start = from ?? DateTime.UtcNow.AddDays(-30);
        var end = to ?? DateTime.UtcNow;

        var query = _db.ProductionRecords
            .Where(p => p.FarmId == farmId && p.ProductionDate >= start && p.ProductionDate <= end);

        if (!string.IsNullOrWhiteSpace(productType))
            query = query.Where(p => p.ProductType == productType);

        var summary = await query
            .GroupBy(p => p.ProductType)
            .Select(g => new ProductionSummaryResponse(
                g.Key,
                g.Sum(p => p.Quantity),
                g.Sum(p => p.RejectedQuantity),
                g.Count(),
                start, end))
            .ToListAsync();

        return Ok(summary);
    }

    [HttpPost]
    public async Task<IActionResult> AddRecord(int farmId, [FromBody] CreateProductionRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        // At least one source required
        if (request.AnimalId == null && request.GroupId == null && request.BeehiveId == null)
            return BadRequest(new { error = "At least one of AnimalId, GroupId, or BeehiveId is required." });

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            // Find or create batch
            ProductionBatch? batch = null;
            if (!string.IsNullOrWhiteSpace(request.BatchCode))
            {
                batch = await _db.ProductionBatches
                    .FirstOrDefaultAsync(b => b.FarmId == farmId && b.BatchCode == request.BatchCode && b.ProductType == request.ProductType);

                if (batch == null)
                {
                    batch = new ProductionBatch
                    {
                        FarmId = farmId,
                        ProductType = request.ProductType,
                        BatchCode = request.BatchCode,
                        BatchDate = request.ProductionDate,
                        TotalQuantity = 0,
                        AvailableQuantity = 0,
                        Unit = request.Unit,
                        CreatedBy = UserId
                    };
                    _db.ProductionBatches.Add(batch);
                    await _db.SaveChangesAsync();
                }

                var accepted = request.Quantity - request.RejectedQuantity;
                batch.TotalQuantity += accepted;
                batch.AvailableQuantity += accepted;
            }

            var record = new ProductionRecord
            {
                FarmId = farmId,
                ProductType = request.ProductType,
                ProductionDate = request.ProductionDate,
                AnimalId = request.AnimalId,
                GroupId = request.GroupId,
                BeehiveId = request.BeehiveId,
                Quantity = request.Quantity,
                Unit = request.Unit,
                RejectedQuantity = request.RejectedQuantity,
                QualityStatus = request.QualityStatus,
                BatchCode = request.BatchCode,
                BatchId = batch?.Id,
                LocationId = request.LocationId,
                Notes = request.Notes,
                RecordedBy = UserId,
                CreatedBy = UserId
            };

            _db.ProductionRecords.Add(record);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return CreatedAtAction(nameof(GetRecords), new { farmId }, new { record.Id, record.ProductType, record.Quantity, record.ProductionDate });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    [HttpGet("batches")]
    public async Task<IActionResult> GetBatches(int farmId, [FromQuery] string? productType)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var query = _db.ProductionBatches.Where(b => b.FarmId == farmId);
        if (!string.IsNullOrWhiteSpace(productType))
            query = query.Where(b => b.ProductType == productType);

        var items = await query.OrderByDescending(b => b.BatchDate).ToListAsync();
        return Ok(items);
    }
}
