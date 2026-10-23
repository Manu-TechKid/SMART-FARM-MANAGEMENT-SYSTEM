using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SmartFarm.Api.Data;
using SmartFarm.Api.DTOs;
using SmartFarm.Api.Models;
using SmartFarm.Api.Services;

namespace SmartFarm.Tests;

public class SmartFarmUnitTests
{
    private static SmartFarmDbContext CreateDb(string name)
    {
        var options = new DbContextOptionsBuilder<SmartFarmDbContext>()
            .UseInMemoryDatabase(databaseName: name)
            .Options;
        return new SmartFarmDbContext(options);
    }

    [Fact]
    public async System.Threading.Tasks.Task JwtService_GeneratesAndValidatesAccessToken()
    {
        var settings = new JwtSettings
        {
            SecretKey = "unit-test-secret-key-at-least-32-bytes-long!!",
            Issuer = "SmartFarmApi",
            Audience = "SmartFarmClient",
            AccessTokenExpirationMinutes = 60
        };
        var jwt = new JwtService(settings);
        var user = new ApplicationUser
        {
            Id = "user-123",
            Email = "farmer@smartfarm.local",
            FirstName = "Jane",
            LastName = "Kamau"
        };

        var token = jwt.GenerateAccessToken(user, new[] { FarmRole.FarmManager });
        Assert.False(string.IsNullOrWhiteSpace(token));

        var principal = jwt.ValidateToken(token);
        Assert.NotNull(principal);
        Assert.Equal("user-123", principal!.FindFirstValue(ClaimTypes.NameIdentifier));
        Assert.True(principal.IsInRole(FarmRole.FarmManager));
        await System.Threading.Tasks.Task.CompletedTask;
    }

    [Fact]
    public async System.Threading.Tasks.Task FarmService_EnforcesFarmDataIsolationAndAggregatesDashboard()
    {
        await using var db = CreateDb(nameof(FarmService_EnforcesFarmDataIsolationAndAggregatesDashboard));
        var svc = new FarmService(db);

        var (ok, err, farm) = await svc.CreateFarmAsync(
            new CreateFarmRequest("Highland Mixed Farm", "Dairy & Apiaries", "Nyeri", "Nyeri", "Kenya", "+254700000000", "info@highland.farm"),
            "owner-1");

        Assert.True(ok);
        Assert.Null(err);
        Assert.NotNull(farm);

        // Owner has access; stranger does not
        Assert.True(await svc.UserHasFarmAccessAsync(farm!.Id, "owner-1"));
        Assert.False(await svc.UserHasFarmAccessAsync(farm.Id, "stranger-2"));
        Assert.Equal(FarmRole.FarmManager, await svc.GetUserFarmRoleAsync(farm.Id, "owner-1"));

        // Seed livestock, hive, and today's production
        var today = DateTime.UtcNow.Date;
        db.Animals.AddRange(
            new Animal { FarmId = farm.Id, TagId = "GT-1", Species = "Goat", Sex = "Female", Status = AnimalStatus.Active },
            new Animal { FarmId = farm.Id, TagId = "CW-1", Species = "Cow", Sex = "Female", Status = AnimalStatus.Active }
        );
        db.AnimalGroups.Add(new AnimalGroup { FarmId = farm.Id, Name = "Layer Flock", Species = "Chicken", GroupType = "Flock", Count = 120 });
        db.Beehives.Add(new Beehive { FarmId = farm.Id, HiveCode = "HV-1", ColonyStatus = ColonyStatus.Active });
        db.ProductionRecords.Add(new ProductionRecord
        {
            FarmId = farm.Id, ProductType = ProductType.Milk, ProductionDate = today, Quantity = 45, RejectedQuantity = 2, Unit = "L"
        });
        await db.SaveChangesAsync();

        var dash = await svc.GetDashboardAsync(farm.Id, today);
        Assert.Equal(2, dash.TotalAnimals);
        Assert.Equal(1, dash.TotalGoats);
        Assert.Equal(1, dash.TotalCows);
        Assert.Equal(120, dash.TotalChickens);
        Assert.Equal(1, dash.ActiveBeehives);
        Assert.Equal(43m, dash.TodayMilkLitres);
    }
}
