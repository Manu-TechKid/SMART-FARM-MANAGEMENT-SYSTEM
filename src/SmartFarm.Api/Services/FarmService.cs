using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SmartFarm.Api.Data;
using SmartFarm.Api.DTOs;
using SmartFarm.Api.Models;

namespace SmartFarm.Api.Services;

public interface IFarmService
{
    Task<List<FarmResponse>> GetUserFarmsAsync(string userId);
    Task<FarmResponse?> GetFarmAsync(int farmId, string userId);
    Task<(bool Success, string? Error, FarmResponse? Farm)> CreateFarmAsync(CreateFarmRequest request, string userId);
    Task<(bool Success, string? Error)> UpdateFarmAsync(int farmId, UpdateFarmRequest request, string userId);
    Task<bool> UserHasFarmAccessAsync(int farmId, string userId);
    Task<string?> GetUserFarmRoleAsync(int farmId, string userId);
    Task<DashboardSummaryResponse> GetDashboardAsync(int farmId, DateTime? date);
}

public class FarmService : IFarmService
{
    private readonly SmartFarmDbContext _db;

    public FarmService(SmartFarmDbContext db)
    {
        _db = db;
    }

    public async Task<List<FarmResponse>> GetUserFarmsAsync(string userId)
    {
        return await _db.Farms
            .Where(f => f.OwnerId == userId || f.FarmUsers.Any(fu => fu.UserId == userId && fu.IsActive))
            .Select(f => new FarmResponse(f.Id, f.Name, f.Description, f.Address, f.County, f.Country, f.PhoneNumber, f.Email, f.OwnerId, f.CreatedAt))
            .ToListAsync();
    }

    public async Task<FarmResponse?> GetFarmAsync(int farmId, string userId)
    {
        if (!await UserHasFarmAccessAsync(farmId, userId)) return null;
        return await _db.Farms
            .Where(f => f.Id == farmId)
            .Select(f => new FarmResponse(f.Id, f.Name, f.Description, f.Address, f.County, f.Country, f.PhoneNumber, f.Email, f.OwnerId, f.CreatedAt))
            .FirstOrDefaultAsync();
    }

    public async Task<(bool Success, string? Error, FarmResponse? Farm)> CreateFarmAsync(CreateFarmRequest request, string userId)
    {
        var farm = new Farm
        {
            Name = request.Name,
            Description = request.Description,
            Address = request.Address,
            County = request.County,
            Country = request.Country ?? "Kenya",
            PhoneNumber = request.PhoneNumber,
            Email = request.Email,
            OwnerId = userId
        };

        _db.Farms.Add(farm);

        // Add owner as FarmManager
        var farmUser = new FarmUser { Farm = farm, UserId = userId, Role = FarmRole.FarmManager };
        _db.FarmUsers.Add(farmUser);

        await _db.SaveChangesAsync();

        return (true, null, new FarmResponse(farm.Id, farm.Name, farm.Description, farm.Address, farm.County, farm.Country, farm.PhoneNumber, farm.Email, farm.OwnerId, farm.CreatedAt));
    }

    public async Task<(bool Success, string? Error)> UpdateFarmAsync(int farmId, UpdateFarmRequest request, string userId)
    {
        var farm = await _db.Farms.FirstOrDefaultAsync(f => f.Id == farmId && f.OwnerId == userId);
        if (farm == null) return (false, "Farm not found or insufficient permissions.");

        farm.Name = request.Name;
        farm.Description = request.Description;
        farm.Address = request.Address;
        farm.County = request.County;
        farm.Country = request.Country;
        farm.PhoneNumber = request.PhoneNumber;
        farm.Email = request.Email;

        await _db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<bool> UserHasFarmAccessAsync(int farmId, string userId)
    {
        return await _db.Farms.AnyAsync(f =>
            f.Id == farmId &&
            (f.OwnerId == userId || f.FarmUsers.Any(fu => fu.UserId == userId && fu.IsActive)));
    }

    public async Task<string?> GetUserFarmRoleAsync(int farmId, string userId)
    {
        var farm = await _db.Farms.FirstOrDefaultAsync(f => f.Id == farmId && f.OwnerId == userId);
        if (farm != null) return FarmRole.FarmManager;

        var fu = await _db.FarmUsers.FirstOrDefaultAsync(fu => fu.FarmId == farmId && fu.UserId == userId && fu.IsActive);
        return fu?.Role;
    }

    public async Task<DashboardSummaryResponse> GetDashboardAsync(int farmId, DateTime? date)
    {
        var today = (date ?? DateTime.UtcNow).Date;
        var monthStart = new DateTime(today.Year, today.Month, 1);

        // Animal counts
        var totalAnimals = await _db.Animals.CountAsync(a => a.FarmId == farmId && a.Status == AnimalStatus.Active);
        var goats = await _db.Animals.CountAsync(a => a.FarmId == farmId && a.Status == AnimalStatus.Active && a.Species == "Goat");
        var sheep = await _db.Animals.CountAsync(a => a.FarmId == farmId && a.Status == AnimalStatus.Active && a.Species == "Sheep");
        var cows = await _db.Animals.CountAsync(a => a.FarmId == farmId && a.Status == AnimalStatus.Active && a.Species == "Cow");
        var chickens = await _db.Animals.CountAsync(a => a.FarmId == farmId && a.Status == AnimalStatus.Active && a.Species == "Chicken");
        var chickensGroups = await _db.AnimalGroups.Where(g => g.FarmId == farmId && g.Species == "Chicken").SumAsync(g => (int?)g.Count) ?? 0;

        // Beehives
        var activeHives = await _db.Beehives.CountAsync(b => b.FarmId == farmId && b.ColonyStatus == ColonyStatus.Active);

        // Today's production
        var todayProduction = await _db.ProductionRecords
            .Where(p => p.FarmId == farmId && p.ProductionDate.Date == today)
            .GroupBy(p => p.ProductType)
            .Select(g => new { Type = g.Key, Total = g.Sum(p => p.Quantity - p.RejectedQuantity) })
            .ToListAsync();

        var milkToday = todayProduction.FirstOrDefault(x => x.Type == ProductType.Milk)?.Total ?? 0;
        var eggsToday = (int)(todayProduction.FirstOrDefault(x => x.Type == ProductType.Eggs)?.Total ?? 0);
        var honeyToday = todayProduction.FirstOrDefault(x => x.Type == ProductType.Honey)?.Total ?? 0;

        // Upcoming vaccinations (next 7 days)
        var upcomingVax = await _db.VaccinationRecords
            .CountAsync(v => v.FarmId == farmId && v.ScheduledDate >= today && v.ScheduledDate <= today.AddDays(7) && v.Status == VaccinationStatus.Scheduled);

        // Pending deliveries
        var pendingDeliveries = await _db.Deliveries
            .CountAsync(d => d.FarmId == farmId && (d.Status == DeliveryStatus.Pending || d.Status == DeliveryStatus.Dispatched));

        // Low stock
        var lowStock = await _db.InventoryItems
            .CountAsync(i => i.FarmId == farmId && i.IsActive && i.CurrentStock <= i.MinimumStock);

        // Finance
        var monthlyRevenue = await _db.Payments
            .Where(p => p.FarmId == farmId && p.PaidAt >= monthStart && p.PaidAt < monthStart.AddMonths(1))
            .SumAsync(p => (decimal?)p.Amount) ?? 0;

        var monthlyExpenses = await _db.Expenses
            .Where(e => e.FarmId == farmId && e.ExpenseDate >= monthStart && e.ExpenseDate < monthStart.AddMonths(1))
            .SumAsync(e => (decimal?)e.Amount) ?? 0;

        // Production chart (last 7 days)
        var chartData = new List<ProductionChartPoint>();
        for (int i = 6; i >= 0; i--)
        {
            var d = today.AddDays(-i);
            var recs = await _db.ProductionRecords
                .Where(p => p.FarmId == farmId && p.ProductionDate.Date == d)
                .GroupBy(p => p.ProductType)
                .Select(g => new { Type = g.Key, Total = g.Sum(p => p.Quantity) })
                .ToListAsync();
            chartData.Add(new ProductionChartPoint(
                d.ToString("MMM dd"),
                recs.FirstOrDefault(r => r.Type == ProductType.Milk)?.Total ?? 0,
                recs.FirstOrDefault(r => r.Type == ProductType.Eggs)?.Total ?? 0,
                recs.FirstOrDefault(r => r.Type == ProductType.Honey)?.Total ?? 0
            ));
        }

        // Alerts
        var alerts = new List<AlertItem>();
        if (lowStock > 0)
            alerts.Add(new AlertItem("LowStock", $"{lowStock} inventory item(s) below minimum stock level.", "warning", DateTime.UtcNow));
        if (upcomingVax > 0)
            alerts.Add(new AlertItem("Vaccination", $"{upcomingVax} vaccination(s) due in the next 7 days.", "info", DateTime.UtcNow));
        if (pendingDeliveries > 0)
            alerts.Add(new AlertItem("Delivery", $"{pendingDeliveries} pending or dispatched delivery/deliveries require attention.", "info", DateTime.UtcNow));

        return new DashboardSummaryResponse(
            totalAnimals,
            goats, sheep, cows, chickens + chickensGroups,
            activeHives,
            milkToday, eggsToday, honeyToday,
            upcomingVax, pendingDeliveries, lowStock,
            monthlyRevenue, monthlyExpenses, monthlyRevenue - monthlyExpenses,
            chartData, alerts
        );
    }
}
