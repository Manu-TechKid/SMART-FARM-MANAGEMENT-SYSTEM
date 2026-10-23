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
[Route("api/farms/{farmId:int}/beehives")]
[Authorize]
public class BeehivesController : ControllerBase
{
    private readonly SmartFarmDbContext _db;
    private readonly IFarmService _farmService;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public BeehivesController(SmartFarmDbContext db, IFarmService farmService)
    {
        _db = db;
        _farmService = farmService;
    }

    [HttpGet]
    public async Task<IActionResult> GetHives(int farmId,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var query = _db.Beehives.Include(b => b.Location).Where(b => b.FarmId == farmId);
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(b => b.ColonyStatus == status);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(b => new BeehiveResponse(b.Id, b.HiveCode, b.LocationId,
                b.Location != null ? b.Location.Name : null,
                b.ApiaryName, b.HiveType, b.ColonyStatus, b.QueenStatus,
                b.LastInspectionDate, b.CreatedAt))
            .ToListAsync();

        return Ok(new PagedResult<BeehiveResponse>(items, total, page, pageSize, (int)Math.Ceiling((double)total / pageSize)));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetHive(int farmId, int id)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        var hive = await _db.Beehives
            .Include(b => b.Location)
            .Include(b => b.Inspections.OrderByDescending(i => i.InspectedAt).Take(10))
            .FirstOrDefaultAsync(b => b.FarmId == farmId && b.Id == id);

        if (hive == null) return NotFound();
        return Ok(hive);
    }

    [HttpPost]
    public async Task<IActionResult> CreateHive(int farmId, [FromBody] CreateBeehiveRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        if (await _db.Beehives.AnyAsync(b => b.FarmId == farmId && b.HiveCode == request.HiveCode))
            return Conflict(new { error = $"Hive code '{request.HiveCode}' already exists." });

        var hive = new Beehive
        {
            FarmId = farmId,
            HiveCode = request.HiveCode,
            LocationId = request.LocationId,
            ApiaryName = request.ApiaryName,
            HiveType = request.HiveType ?? HiveType.Langstroth,
            Notes = request.Notes,
            CreatedBy = UserId
        };
        _db.Beehives.Add(hive);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetHive), new { farmId, id = hive.Id },
            new BeehiveResponse(hive.Id, hive.HiveCode, hive.LocationId, null, hive.ApiaryName, hive.HiveType, hive.ColonyStatus, hive.QueenStatus, hive.LastInspectionDate, hive.CreatedAt));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateHive(int farmId, int id, [FromBody] UpdateBeehiveRequest request)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        var hive = await _db.Beehives.FirstOrDefaultAsync(b => b.FarmId == farmId && b.Id == id);
        if (hive == null) return NotFound();

        hive.LocationId = request.LocationId ?? hive.LocationId;
        hive.ApiaryName = request.ApiaryName ?? hive.ApiaryName;
        hive.HiveType = request.HiveType ?? hive.HiveType;
        hive.ColonyStatus = request.ColonyStatus ?? hive.ColonyStatus;
        hive.QueenStatus = request.QueenStatus ?? hive.QueenStatus;
        hive.Notes = request.Notes ?? hive.Notes;
        hive.UpdatedBy = UserId;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:int}/inspections")]
    public async Task<IActionResult> GetInspections(int farmId, int id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var query = _db.HiveInspections.Where(i => i.BeehiveId == id);
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(i => i.InspectedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new PagedResult<HiveInspection>(items, total, page, pageSize, (int)Math.Ceiling((double)total / pageSize)));
    }

    [HttpPost("{id:int}/inspections")]
    public async Task<IActionResult> AddInspection(int farmId, int id, [FromBody] CreateInspectionRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var hive = await _db.Beehives.FirstOrDefaultAsync(b => b.FarmId == farmId && b.Id == id);
        if (hive == null) return NotFound();

        var inspection = new HiveInspection
        {
            BeehiveId = id,
            InspectedAt = request.InspectedAt,
            InspectedBy = request.InspectedBy,
            QueenSeen = request.QueenSeen,
            HealthScore = request.HealthScore,
            HasEggs = request.HasEggs,
            HasLarvae = request.HasLarvae,
            HasCappedBrood = request.HasCappedBrood,
            FramesOfBees = request.FramesOfBees,
            FramesOfBrood = request.FramesOfBrood,
            FramesOfHoney = request.FramesOfHoney,
            PestObservations = request.PestObservations,
            DiseaseObservations = request.DiseaseObservations,
            ActionTaken = request.ActionTaken,
            NextInspectionDue = request.NextInspectionDue,
            Notes = request.Notes,
            CreatedBy = UserId
        };

        hive.LastInspectionDate = request.InspectedAt;
        if (request.QueenSeen) hive.QueenStatus = QueenStatus.Present;
        else hive.QueenStatus = QueenStatus.NotSeen;

        _db.HiveInspections.Add(inspection);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetInspections), new { farmId, id }, inspection);
    }
}
