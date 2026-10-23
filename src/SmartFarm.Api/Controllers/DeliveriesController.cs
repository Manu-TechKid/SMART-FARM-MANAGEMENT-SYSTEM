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
public class DeliveriesController : ControllerBase
{
    private readonly SmartFarmDbContext _db;
    private readonly IFarmService _farmService;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public DeliveriesController(SmartFarmDbContext db, IFarmService farmService)
    {
        _db = db;
        _farmService = farmService;
    }

    [HttpGet("deliveries")]
    public async Task<IActionResult> GetDeliveries(int farmId,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var query = _db.Deliveries.Include(d => d.Customer).Where(d => d.FarmId == farmId);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(d => d.Status == status);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(d => d.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Include(d => d.Items)
            .Select(d => new
            {
                d.Id, d.DeliveryNumber, d.Status, d.DispatchDate, d.ExpectedArrival, d.ActualArrival,
                CustomerName = d.Customer != null ? d.Customer.Name : null,
                d.DriverName, d.VehicleReg, d.ProofOfDelivery, d.DiscrepancyReason, d.CreatedAt,
                Items = d.Items.Select(i => new
                {
                    i.Id, i.BatchId, i.ProductType, i.QuantityDispatched, i.QuantityReceived, i.QuantityRejected, i.Unit
                })
            }).ToListAsync();

        return Ok(new { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpGet("deliveries/{id:int}")]
    public async Task<IActionResult> GetDelivery(int farmId, int id)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var delivery = await _db.Deliveries
            .Include(d => d.Customer)
            .Include(d => d.Items).ThenInclude(i => i.Batch)
            .FirstOrDefaultAsync(d => d.FarmId == farmId && d.Id == id);

        return delivery == null ? NotFound() : Ok(delivery);
    }

    [HttpPost("deliveries")]
    public async Task<IActionResult> CreateDelivery(int farmId, [FromBody] CreateDeliveryRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var deliveryNo = $"DEL-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}";

        var delivery = new Delivery
        {
            FarmId = farmId,
            DeliveryNumber = deliveryNo,
            CustomerId = request.CustomerId,
            SalesOrderId = request.SalesOrderId,
            ExpectedArrival = request.ExpectedArrival,
            DriverName = request.DriverName,
            VehicleReg = request.VehicleReg,
            Status = DeliveryStatus.Pending,
            Notes = request.Notes,
            CreatedBy = UserId,
            Items = request.Items.Select(i => new DeliveryItem
            {
                BatchId = i.BatchId,
                ProductType = i.ProductType,
                QuantityDispatched = i.QuantityDispatched,
                Unit = i.Unit,
                CreatedBy = UserId
            }).ToList()
        };

        _db.Deliveries.Add(delivery);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetDelivery), new { farmId, id = delivery.Id }, new { delivery.Id, delivery.DeliveryNumber });
    }

    [HttpPut("deliveries/{id:int}/dispatch")]
    public async Task<IActionResult> DispatchDelivery(int farmId, int id, [FromBody] DispatchDeliveryRequest request)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var delivery = await _db.Deliveries
            .Include(d => d.Items).ThenInclude(i => i.Batch)
            .FirstOrDefaultAsync(d => d.FarmId == farmId && d.Id == id);

        if (delivery == null) return NotFound();
        if (delivery.Status != DeliveryStatus.Pending && delivery.Status != DeliveryStatus.Prepared)
            return BadRequest(new { error = "Delivery can only be dispatched from Pending or Prepared status." });

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            // Deduct from production batches
            foreach (var item in delivery.Items)
            {
                if (item.Batch != null)
                {
                    if (item.Batch.AvailableQuantity < item.QuantityDispatched)
                        return BadRequest(new { error = $"Insufficient batch quantity for {item.ProductType}. Available: {item.Batch.AvailableQuantity} {item.Batch.Unit}" });

                    item.Batch.AvailableQuantity -= item.QuantityDispatched;
                    if (item.Batch.AvailableQuantity == 0)
                        item.Batch.Status = BatchStatus.Depleted;
                    else
                        item.Batch.Status = BatchStatus.PartiallyUsed;
                }
            }

            delivery.Status = DeliveryStatus.Dispatched;
            delivery.DispatchDate = request.DispatchDate;
            delivery.DriverName = request.DriverName ?? delivery.DriverName;
            delivery.VehicleReg = request.VehicleReg ?? delivery.VehicleReg;
            delivery.UpdatedBy = UserId;

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return NoContent();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    [HttpPut("deliveries/{id:int}/receive")]
    public async Task<IActionResult> ReceiveDelivery(int farmId, int id, [FromBody] ReceiveDeliveryRequest request)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var delivery = await _db.Deliveries
            .Include(d => d.Items)
            .FirstOrDefaultAsync(d => d.FarmId == farmId && d.Id == id);

        if (delivery == null) return NotFound();
        if (delivery.Status != DeliveryStatus.Dispatched)
            return BadRequest(new { error = "Only dispatched deliveries can be received." });

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var hasDiscrepancy = false;
            foreach (var receipt in request.Items)
            {
                var item = delivery.Items.FirstOrDefault(i => i.Id == receipt.DeliveryItemId);
                if (item == null) continue;
                item.QuantityReceived = receipt.QuantityReceived;
                item.QuantityRejected = receipt.QuantityRejected;
                if (item.QuantityReceived < item.QuantityDispatched) hasDiscrepancy = true;
            }

            delivery.ActualArrival = request.ActualArrival;
            delivery.ProofOfDelivery = request.ProofOfDelivery;
            delivery.DiscrepancyReason = request.DiscrepancyReason;
            delivery.Status = hasDiscrepancy ? DeliveryStatus.PartiallyDelivered : DeliveryStatus.Delivered;
            delivery.UpdatedBy = UserId;

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return NoContent();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    [HttpPut("deliveries/{id:int}/status")]
    public async Task<IActionResult> UpdateDeliveryStatus(int farmId, int id, [FromBody] UpdateDeliveryStatusRequest request)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var delivery = await _db.Deliveries
            .Include(d => d.Items).ThenInclude(i => i.Batch)
            .FirstOrDefaultAsync(d => d.FarmId == farmId && d.Id == id);
        if (delivery == null) return NotFound();

        if (delivery.Status == request.Status) return NoContent();

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            // If a dispatched delivery is cancelled or failed before receipt, restore batch stock once
            if (delivery.Status == DeliveryStatus.Dispatched &&
                (request.Status == DeliveryStatus.Cancelled || request.Status == DeliveryStatus.Failed))
            {
                foreach (var item in delivery.Items)
                {
                    if (item.Batch != null)
                    {
                        item.Batch.AvailableQuantity += item.QuantityDispatched;
                        item.Batch.Status = item.Batch.AvailableQuantity >= item.Batch.TotalQuantity
                            ? BatchStatus.Active
                            : BatchStatus.PartiallyUsed;
                    }
                }
            }

            delivery.Status = request.Status;
            if (!string.IsNullOrWhiteSpace(request.Reason))
                delivery.DiscrepancyReason = request.Reason;
            delivery.UpdatedBy = UserId;

            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return NoContent();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }
}
