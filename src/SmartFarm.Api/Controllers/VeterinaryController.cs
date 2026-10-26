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
public class VeterinaryController : ControllerBase
{
    private readonly SmartFarmDbContext _db;
    private readonly IFarmService _farmService;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public VeterinaryController(SmartFarmDbContext db, IFarmService farmService)
    {
        _db = db;
        _farmService = farmService;
    }

    // ===== Vaccination Schedules =====
    [HttpGet("vaccination/schedules")]
    public async Task<IActionResult> GetSchedules(int farmId)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        return Ok(await _db.VaccinationSchedules.Where(s => s.FarmId == farmId && s.IsActive).ToListAsync());
    }

    [HttpPost("vaccination/schedules")]
    public async Task<IActionResult> CreateSchedule(int farmId, [FromBody] CreateVaccinationScheduleRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var schedule = new VaccinationSchedule
        {
            FarmId = farmId,
            VaccineName = request.VaccineName,
            Species = request.Species,
            TargetAgeGroup = request.TargetAgeGroup,
            IntervalDays = request.IntervalDays,
            Description = request.Description,
            CreatedBy = UserId
        };
        _db.VaccinationSchedules.Add(schedule);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSchedules), new { farmId }, schedule);
    }

    [HttpDelete("vaccination/schedules/{id:int}")]
    public async Task<IActionResult> DeleteSchedule(int farmId, int id)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        var schedule = await _db.VaccinationSchedules.FirstOrDefaultAsync(s => s.FarmId == farmId && s.Id == id);
        if (schedule == null) return NotFound();

        _db.VaccinationSchedules.Remove(schedule);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ===== Vaccination Records =====
    [HttpGet("vaccination/records")]
    public async Task<IActionResult> GetVaccinationRecords(int farmId,
        [FromQuery] string? status,
        [FromQuery] string? species,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var query = _db.VaccinationRecords
            .Include(v => v.Animal)
            .Include(v => v.Group)
            .Where(v => v.FarmId == farmId);

        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(v => v.Status == status);
        if (!string.IsNullOrWhiteSpace(species)) query = query.Where(v => v.Species == species);
        if (from.HasValue) query = query.Where(v => v.ScheduledDate >= from.Value);
        if (to.HasValue) query = query.Where(v => v.ScheduledDate <= to.Value);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(v => v.ScheduledDate)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(v => new VaccinationRecordResponse(
                v.Id, v.VaccineName, v.Species,
                v.AnimalId, v.Animal != null ? v.Animal.TagId : null,
                v.GroupId, v.Group != null ? v.Group.Name : null,
                v.ScheduledDate, v.DateAdministered, v.Status,
                v.Administrator, v.FollowUpDate, v.Notes))
            .ToListAsync();

        return Ok(new PagedResult<VaccinationRecordResponse>(items, total, page, pageSize, (int)Math.Ceiling((double)total / pageSize)));
    }

    [HttpPost("vaccination/records")]
    public async Task<IActionResult> AddVaccinationRecord(int farmId, [FromBody] CreateVaccinationRecordRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var record = new VaccinationRecord
        {
            FarmId = farmId,
            ScheduleId = request.ScheduleId,
            VaccineName = request.VaccineName,
            Species = request.Species,
            AnimalId = request.AnimalId,
            GroupId = request.GroupId,
            ScheduledDate = request.ScheduledDate,
            DateAdministered = request.DateAdministered,
            BatchNumber = request.BatchNumber,
            Administrator = request.Administrator,
            FollowUpDate = request.FollowUpDate,
            DosageNotes = request.DosageNotes,
            Status = request.DateAdministered.HasValue ? VaccinationStatus.Completed : VaccinationStatus.Scheduled,
            Notes = request.Notes,
            CreatedBy = UserId
        };
        _db.VaccinationRecords.Add(record);
        await _db.SaveChangesAsync();
        return Ok(record);
    }

    [HttpPut("vaccination/records/{id:int}/status")]
    public async Task<IActionResult> UpdateVaccinationStatus(int farmId, int id, [FromBody] UpdateTaskStatusRequest request)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        var record = await _db.VaccinationRecords.FirstOrDefaultAsync(v => v.FarmId == farmId && v.Id == id);
        if (record == null) return NotFound();

        record.Status = request.Status;
        if (request.Status == VaccinationStatus.Completed && !record.DateAdministered.HasValue)
            record.DateAdministered = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("vaccination/records/{id:int}")]
    public async Task<IActionResult> DeleteVaccinationRecord(int farmId, int id)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        var record = await _db.VaccinationRecords.FirstOrDefaultAsync(v => v.FarmId == farmId && v.Id == id);
        if (record == null) return NotFound();

        _db.VaccinationRecords.Remove(record);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ===== Health Records =====
    [HttpGet("health-records")]
    public async Task<IActionResult> GetHealthRecords(int farmId,
        [FromQuery] int? animalId,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var query = _db.HealthRecords.Where(h => h.FarmId == farmId);
        if (animalId.HasValue) query = query.Where(h => h.AnimalId == animalId);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(h => h.Status == status);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(h => h.RecordDate).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new PagedResult<HealthRecord>(items, total, page, pageSize, (int)Math.Ceiling((double)total / pageSize)));
    }

    [HttpPost("health-records")]
    public async Task<IActionResult> AddHealthRecord(int farmId, [FromBody] CreateHealthRecordRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var record = new HealthRecord
        {
            FarmId = farmId,
            AnimalId = request.AnimalId,
            GroupId = request.GroupId,
            RecordDate = request.RecordDate,
            RecordType = request.RecordType,
            Symptoms = request.Symptoms,
            Diagnosis = request.Diagnosis,
            Treatment = request.Treatment,
            VeterinarianName = request.VeterinarianName,
            VeterinaryCost = request.VeterinaryCost,
            WithdrawalPeriodEnd = request.WithdrawalPeriodEnd,
            FollowUpDate = request.FollowUpDate,
            Notes = request.Notes,
            CreatedBy = UserId
        };
        _db.HealthRecords.Add(record);
        await _db.SaveChangesAsync();
        return Ok(record);
    }

    [HttpPut("health-records/{id:int}")]
    public async Task<IActionResult> UpdateHealthRecord(int farmId, int id, [FromBody] CreateHealthRecordRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var record = await _db.HealthRecords.FirstOrDefaultAsync(h => h.FarmId == farmId && h.Id == id);
        if (record == null) return NotFound();

        record.RecordDate = request.RecordDate;
        record.RecordType = request.RecordType;
        record.Symptoms = request.Symptoms;
        record.Diagnosis = request.Diagnosis;
        record.Treatment = request.Treatment;
        record.VeterinarianName = request.VeterinarianName;
        record.VeterinaryCost = request.VeterinaryCost;
        record.WithdrawalPeriodEnd = request.WithdrawalPeriodEnd;
        record.FollowUpDate = request.FollowUpDate;
        record.Notes = request.Notes;
        record.UpdatedBy = UserId;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("health-records/{id:int}")]
    public async Task<IActionResult> DeleteHealthRecord(int farmId, int id)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var record = await _db.HealthRecords.FirstOrDefaultAsync(h => h.FarmId == farmId && h.Id == id);
        if (record == null) return NotFound();

        _db.HealthRecords.Remove(record);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
