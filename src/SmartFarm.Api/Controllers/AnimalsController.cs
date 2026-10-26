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
[Route("api/farms/{farmId:int}/animals")]
[Authorize]
public class AnimalsController : ControllerBase
{
    private readonly SmartFarmDbContext _db;
    private readonly IFarmService _farmService;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public AnimalsController(SmartFarmDbContext db, IFarmService farmService)
    {
        _db = db;
        _farmService = farmService;
    }

    private async Task<bool> CanAccess(int farmId) => await _farmService.UserHasFarmAccessAsync(farmId, UserId);

    [HttpGet]
    public async Task<IActionResult> GetAnimals(int farmId,
        [FromQuery] string? species,
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        if (!await CanAccess(farmId)) return Forbid();

        var query = _db.Animals
            .Include(a => a.Location)
            .Include(a => a.Group)
            .Where(a => a.FarmId == farmId);

        if (!string.IsNullOrWhiteSpace(species))
            query = query.Where(a => a.Species == species);
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(a => a.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(a => a.TagId.Contains(search) || (a.Name != null && a.Name.Contains(search)));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AnimalResponse(
                a.Id, a.TagId, a.Name, a.Species, a.Breed, a.Sex,
                a.DateOfBirth, a.Status, a.CurrentWeightKg,
                a.AcquisitionType, a.LocationId, a.Location != null ? a.Location.Name : null,
                a.GroupId, a.Group != null ? a.Group.Name : null, a.CreatedAt))
            .ToListAsync();

        return Ok(new PagedResult<AnimalResponse>(items, total, page, pageSize, (int)Math.Ceiling((double)total / pageSize)));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetAnimal(int farmId, int id)
    {
        if (!await CanAccess(farmId)) return Forbid();

        var animal = await _db.Animals
            .Include(a => a.Location)
            .Include(a => a.Group)
            .Include(a => a.Events.OrderByDescending(e => e.EventDate).Take(20))
            .Include(a => a.VaccinationRecords.OrderByDescending(v => v.ScheduledDate).Take(10))
            .Include(a => a.HealthRecords.OrderByDescending(h => h.RecordDate).Take(10))
            .FirstOrDefaultAsync(a => a.FarmId == farmId && a.Id == id);

        if (animal == null) return NotFound();

        return Ok(new
        {
            animal.Id, animal.TagId, animal.Name, animal.Species, animal.Breed,
            animal.Sex, animal.DateOfBirth, animal.Status, animal.CurrentWeightKg,
            animal.AcquisitionType, animal.AcquisitionDate, animal.AcquisitionCost,
            animal.LocationId, LocationName = animal.Location?.Name,
            animal.GroupId, GroupName = animal.Group?.Name,
            animal.SireId, animal.DamId, animal.Notes,
            Events = animal.Events.Select(e => new { e.Id, e.EventType, e.EventDate, e.Description, e.Amount }),
            VaccinationRecords = animal.VaccinationRecords.Select(v => new { v.Id, v.VaccineName, v.Status, v.ScheduledDate, v.DateAdministered }),
            HealthRecords = animal.HealthRecords.Select(h => new { h.Id, h.RecordType, h.RecordDate, h.Diagnosis, h.Status })
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateAnimal(int farmId, [FromBody] CreateAnimalRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await CanAccess(farmId)) return Forbid();

        // Unique tag check
        if (await _db.Animals.AnyAsync(a => a.FarmId == farmId && a.TagId == request.TagId))
            return Conflict(new { error = $"Tag '{request.TagId}' already exists in this farm." });

        var animal = new Animal
        {
            FarmId = farmId,
            TagId = request.TagId,
            Name = request.Name,
            Species = request.Species,
            Breed = request.Breed,
            Sex = request.Sex,
            DateOfBirth = request.DateOfBirth,
            AcquisitionType = request.AcquisitionType,
            AcquisitionDate = request.AcquisitionDate ?? DateTime.UtcNow,
            AcquisitionCost = request.AcquisitionCost,
            CurrentWeightKg = request.CurrentWeightKg,
            LocationId = request.LocationId,
            GroupId = request.GroupId,
            SireId = request.SireId,
            DamId = request.DamId,
            Notes = request.Notes,
            CreatedBy = UserId
        };

        _db.Animals.Add(animal);

        // Log acquisition event
        _db.AnimalEvents.Add(new AnimalEvent
        {
            Animal = animal,
            EventType = request.AcquisitionType == Models.AcquisitionType.Born ? EventType.Birth : EventType.Purchase,
            EventDate = request.AcquisitionDate ?? DateTime.UtcNow,
            Description = $"Animal registered via {request.AcquisitionType}",
            Amount = request.AcquisitionCost,
            RecordedBy = UserId
        });

        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAnimal), new { farmId, id = animal.Id },
            new AnimalResponse(animal.Id, animal.TagId, animal.Name, animal.Species, animal.Breed, animal.Sex,
                animal.DateOfBirth, animal.Status, animal.CurrentWeightKg, animal.AcquisitionType,
                animal.LocationId, null, animal.GroupId, null, animal.CreatedAt));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateAnimal(int farmId, int id, [FromBody] UpdateAnimalRequest request)
    {
        if (!await CanAccess(farmId)) return Forbid();

        var animal = await _db.Animals.FirstOrDefaultAsync(a => a.FarmId == farmId && a.Id == id);
        if (animal == null) return NotFound();

        animal.Name = request.Name;
        animal.Breed = request.Breed ?? animal.Breed;
        animal.Sex = request.Sex ?? animal.Sex;
        animal.DateOfBirth = request.DateOfBirth ?? animal.DateOfBirth;
        animal.CurrentWeightKg = request.CurrentWeightKg ?? animal.CurrentWeightKg;
        animal.Status = request.Status ?? animal.Status;
        animal.LocationId = request.LocationId ?? animal.LocationId;
        animal.GroupId = request.GroupId ?? animal.GroupId;
        animal.Notes = request.Notes ?? animal.Notes;
        animal.UpdatedBy = UserId;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteAnimal(int farmId, int id)
    {
        if (!await CanAccess(farmId)) return Forbid();

        var animal = await _db.Animals
            .Include(a => a.Events)
            .Include(a => a.VaccinationRecords)
            .Include(a => a.HealthRecords)
            .FirstOrDefaultAsync(a => a.FarmId == farmId && a.Id == id);
        if (animal == null) return NotFound();

        var breeding = await _db.BreedingRecords.Where(b => b.DamId == id || b.SireId == id).ToListAsync();
        _db.BreedingRecords.RemoveRange(breeding);

        var prodRecords = await _db.ProductionRecords.Where(p => p.AnimalId == id).ToListAsync();
        foreach (var p in prodRecords) p.AnimalId = null;

        _db.AnimalEvents.RemoveRange(animal.Events);
        _db.VaccinationRecords.RemoveRange(animal.VaccinationRecords);
        _db.HealthRecords.RemoveRange(animal.HealthRecords);
        _db.Animals.Remove(animal);

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/events")]
    public async Task<IActionResult> AddEvent(int farmId, int id, [FromBody] AddEventRequest request)
    {
        if (!await CanAccess(farmId)) return Forbid();

        var animal = await _db.Animals.FirstOrDefaultAsync(a => a.FarmId == farmId && a.Id == id);
        if (animal == null) return NotFound();

        var ev = new AnimalEvent
        {
            AnimalId = id,
            EventType = request.EventType,
            EventDate = request.EventDate,
            Description = request.Description,
            Amount = request.Amount,
            RecordedBy = UserId
        };
        _db.AnimalEvents.Add(ev);

        // Update animal status based on event
        if (request.EventType == EventType.Death) animal.Status = AnimalStatus.Deceased;
        if (request.EventType == EventType.Sale) animal.Status = AnimalStatus.Sold;
        if (request.EventType == EventType.Transfer) animal.Status = AnimalStatus.Transferred;

        await _db.SaveChangesAsync();
        return Ok(new { ev.Id, ev.EventType, ev.EventDate, ev.Description, ev.Amount });
    }

    // ---- Animal Groups (Flocks / Herds / Batches) ----
    [HttpGet("~/api/farms/{farmId:int}/groups")]
    public async Task<IActionResult> GetGroups(int farmId, [FromQuery] string? species)
    {
        if (!await CanAccess(farmId)) return Forbid();
        var query = _db.AnimalGroups.Include(g => g.Location).Where(g => g.FarmId == farmId);
        if (!string.IsNullOrWhiteSpace(species)) query = query.Where(g => g.Species == species);

        var list = await query
            .OrderByDescending(g => g.CreatedAt)
            .Select(g => new AnimalGroupResponse(
                g.Id, g.Name, g.Species, g.GroupType, g.Count,
                g.LocationId, g.Location != null ? g.Location.Name : null, g.CreatedAt))
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost("~/api/farms/{farmId:int}/groups")]
    public async Task<IActionResult> CreateGroup(int farmId, [FromBody] CreateGroupRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await CanAccess(farmId)) return Forbid();

        var group = new AnimalGroup
        {
            FarmId = farmId,
            Name = request.Name,
            Species = request.Species,
            GroupType = string.IsNullOrWhiteSpace(request.GroupType) ? Models.GroupType.Flock : request.GroupType,
            Count = request.Count,
            LocationId = request.LocationId,
            Description = request.Description,
            CreatedBy = UserId
        };
        _db.AnimalGroups.Add(group);
        await _db.SaveChangesAsync();

        return Ok(new AnimalGroupResponse(group.Id, group.Name, group.Species, group.GroupType, group.Count, group.LocationId, null, group.CreatedAt));
    }

    [HttpPut("~/api/farms/{farmId:int}/groups/{id:int}")]
    public async Task<IActionResult> UpdateGroup(int farmId, int id, [FromBody] CreateGroupRequest request)
    {
        if (!await CanAccess(farmId)) return Forbid();
        var group = await _db.AnimalGroups.FirstOrDefaultAsync(g => g.FarmId == farmId && g.Id == id);
        if (group == null) return NotFound();

        group.Name = request.Name;
        group.Species = request.Species;
        group.GroupType = request.GroupType;
        group.Count = request.Count;
        group.LocationId = request.LocationId;
        group.Description = request.Description;
        group.UpdatedBy = UserId;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("~/api/farms/{farmId:int}/groups/{id:int}")]
    public async Task<IActionResult> DeleteGroup(int farmId, int id)
    {
        if (!await CanAccess(farmId)) return Forbid();
        var group = await _db.AnimalGroups.FirstOrDefaultAsync(g => g.FarmId == farmId && g.Id == id);
        if (group == null) return NotFound();

        var animals = await _db.Animals.Where(a => a.GroupId == id).ToListAsync();
        foreach (var a in animals) a.GroupId = null;

        var prodRecords = await _db.ProductionRecords.Where(p => p.GroupId == id).ToListAsync();
        foreach (var p in prodRecords) p.GroupId = null;

        _db.AnimalGroups.Remove(group);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ---- Breeding Records ----
    [HttpGet("~/api/farms/{farmId:int}/breeding")]
    public async Task<IActionResult> GetBreedingRecords(int farmId, [FromQuery] string? status)
    {
        if (!await CanAccess(farmId)) return Forbid();
        var query = _db.BreedingRecords
            .Include(b => b.Sire)
            .Include(b => b.Dam)
            .Where(b => b.FarmId == farmId);

        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(b => b.Status == status);

        var items = await query
            .OrderByDescending(b => b.MatingDate)
            .Select(b => new BreedingResponse(
                b.Id,
                b.SireId, b.Sire != null ? b.Sire.TagId : null,
                b.DamId, b.Dam != null ? b.Dam.TagId : "",
                b.MatingDate, b.ExpectedDOB, b.ActualDOB, b.OffspringCount, b.Status, b.Notes))
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost("~/api/farms/{farmId:int}/breeding")]
    public async Task<IActionResult> CreateBreedingRecord(int farmId, [FromBody] CreateBreedingRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await CanAccess(farmId)) return Forbid();

        var dam = await _db.Animals.FirstOrDefaultAsync(a => a.FarmId == farmId && a.Id == request.DamId);
        if (dam == null) return BadRequest(new { error = "Dam (female animal) not found in this farm." });

        // Default gestation estimate if ExpectedDOB not supplied
        var expectedDob = request.ExpectedDOB ?? dam.Species switch
        {
            "Cow" => request.MatingDate.AddDays(283),
            "Goat" => request.MatingDate.AddDays(150),
            "Sheep" => request.MatingDate.AddDays(147),
            _ => request.MatingDate.AddDays(150)
        };

        var rec = new BreedingRecord
        {
            FarmId = farmId,
            SireId = request.SireId,
            DamId = request.DamId,
            MatingDate = request.MatingDate,
            ExpectedDOB = expectedDob,
            Status = BreedingStatus.Mated,
            Notes = request.Notes,
            CreatedBy = UserId
        };
        _db.BreedingRecords.Add(rec);
        await _db.SaveChangesAsync();

        return Ok(new BreedingResponse(rec.Id, rec.SireId, null, rec.DamId, dam.TagId, rec.MatingDate, rec.ExpectedDOB, rec.ActualDOB, rec.OffspringCount, rec.Status, rec.Notes));
    }

    [HttpPut("~/api/farms/{farmId:int}/breeding/{id:int}")]
    public async Task<IActionResult> UpdateBreedingRecord(int farmId, int id, [FromBody] UpdateBreedingRequest request)
    {
        if (!await CanAccess(farmId)) return Forbid();
        var rec = await _db.BreedingRecords.Include(b => b.Dam).FirstOrDefaultAsync(b => b.FarmId == farmId && b.Id == id);
        if (rec == null) return NotFound();

        rec.Status = request.Status;
        rec.ExpectedDOB = request.ExpectedDOB ?? rec.ExpectedDOB;
        rec.ActualDOB = request.ActualDOB ?? rec.ActualDOB;
        rec.OffspringCount = request.OffspringCount ?? rec.OffspringCount;
        rec.Notes = request.Notes ?? rec.Notes;
        rec.UpdatedBy = UserId;

        if (request.Status == BreedingStatus.BirthConfirmed && rec.ActualDOB == null)
            rec.ActualDOB = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("~/api/farms/{farmId:int}/breeding/{id:int}")]
    public async Task<IActionResult> DeleteBreedingRecord(int farmId, int id)
    {
        if (!await CanAccess(farmId)) return Forbid();
        var rec = await _db.BreedingRecords.FirstOrDefaultAsync(b => b.FarmId == farmId && b.Id == id);
        if (rec == null) return NotFound();

        _db.BreedingRecords.Remove(rec);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
