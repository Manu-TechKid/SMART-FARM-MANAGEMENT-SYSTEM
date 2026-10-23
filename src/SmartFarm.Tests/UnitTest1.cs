using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using SmartFarm.Api.Controllers;
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

    private static ControllerContext CreateControllerContext(string userId)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId) };
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
        };
        return new ControllerContext { HttpContext = httpContext };
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

    [Fact]
    public async System.Threading.Tasks.Task FarmAuthorizationFilter_BlocksViewerFromMutatingRequests_AllowsReadsAndWorkers()
    {
        await using var db = CreateDb(nameof(FarmAuthorizationFilter_BlocksViewerFromMutatingRequests_AllowsReadsAndWorkers));
        var farmSvc = new FarmService(db);
        var (_, _, farm) = await farmSvc.CreateFarmAsync(
            new CreateFarmRequest("Role Test Farm", null, null, null, "Kenya", null, null),
            "owner-1");

        db.FarmUsers.AddRange(
            new FarmUser { FarmId = farm!.Id, UserId = "viewer-user", Role = FarmRole.Viewer, IsActive = true },
            new FarmUser { FarmId = farm.Id, UserId = "vet-user", Role = FarmRole.VeterinaryOfficer, IsActive = true }
        );
        await db.SaveChangesAsync();

        var filter = new FarmAuthorizationFilter(farmSvc);

        static ActionExecutingContext BuildFilterContext(string userId, string method, int farmId)
        {
            var httpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, userId) }, "Test"))
            };
            httpContext.Request.Method = method;
            var routeData = new RouteData();
            routeData.Values["farmId"] = farmId.ToString();
            var actionContext = new ActionContext(httpContext, routeData, new ActionDescriptor());
            return new ActionExecutingContext(actionContext, new List<IFilterMetadata>(), new Dictionary<string, object?>(), controller: new object());
        }

        // Viewer POST -> 403 Forbidden
        var viewerPostCtx = BuildFilterContext("viewer-user", HttpMethods.Post, farm.Id);
        var nextCalled = false;
        await filter.OnActionExecutionAsync(viewerPostCtx, () =>
        {
            nextCalled = true;
            return System.Threading.Tasks.Task.FromResult<ActionExecutedContext>(null!);
        });
        Assert.False(nextCalled);
        var objResult = Assert.IsType<ObjectResult>(viewerPostCtx.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, objResult.StatusCode);

        // Viewer GET -> Allowed
        var viewerGetCtx = BuildFilterContext("viewer-user", HttpMethods.Get, farm.Id);
        nextCalled = false;
        await filter.OnActionExecutionAsync(viewerGetCtx, () =>
        {
            nextCalled = true;
            return System.Threading.Tasks.Task.FromResult<ActionExecutedContext>(null!);
        });
        Assert.True(nextCalled);

        // Veterinarian POST -> Allowed
        var vetPostCtx = BuildFilterContext("vet-user", HttpMethods.Post, farm.Id);
        nextCalled = false;
        await filter.OnActionExecutionAsync(vetPostCtx, () =>
        {
            nextCalled = true;
            return System.Threading.Tasks.Task.FromResult<ActionExecutedContext>(null!);
        });
        Assert.True(nextCalled);
    }

    [Fact]
    public async System.Threading.Tasks.Task FinanceController_DistinguishesAccrualProfitFromCashFlow()
    {
        await using var db = CreateDb(nameof(FinanceController_DistinguishesAccrualProfitFromCashFlow));
        var farmSvc = new FarmService(db);
        var (_, _, farm) = await farmSvc.CreateFarmAsync(
            new CreateFarmRequest("Finance Test Farm", null, null, null, "Kenya", null, null),
            "owner-1");

        var now = DateTime.UtcNow;
        var invoice = new Invoice
        {
            FarmId = farm!.Id,
            InvoiceNumber = "INV-TEST-001",
            InvoiceDate = now,
            DueDate = now.AddDays(14),
            Amount = 1000m,
            PaidAmount = 400m,
            Status = InvoiceStatus.PartiallyPaid
        };
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();

        db.Payments.Add(new Payment
        {
            FarmId = farm.Id,
            InvoiceId = invoice.Id,
            Amount = 400m,
            Method = PaymentMethod.MobileMoney,
            Reference = "MPESA-REF-1",
            PaidAt = now
        });
        db.Expenses.Add(new Expense
        {
            FarmId = farm.Id,
            Category = ExpenseCategory.Feed,
            Description = "Dairy Meal",
            Amount = 250m,
            ExpenseDate = now
        });
        await db.SaveChangesAsync();

        var controller = new FinanceController(db, farmSvc)
        {
            ControllerContext = CreateControllerContext("owner-1")
        };

        var result = await controller.GetFinanceSummary(farm.Id, now.AddDays(-1), now.AddDays(1));
        var okResult = Assert.IsType<OkObjectResult>(result);
        var summary = Assert.IsType<FinanceSummaryResponse>(okResult.Value);

        // Accrual revenue is 1000 (invoiced), cash collected is 400, expenses are 250
        Assert.Equal(1000m, summary.InvoicedRevenue);
        Assert.Equal(400m, summary.TotalRevenue);       // Cash collected
        Assert.Equal(250m, summary.TotalExpenses);
        Assert.Equal(750m, summary.NetOperatingProfit); // 1000 - 250 (Accrual)
        Assert.Equal(150m, summary.NetCashFlow);        // 400 - 250  (Cash Flow)
        Assert.Equal(600m, summary.OutstandingReceivables);
    }

    [Fact]
    public async System.Threading.Tasks.Task TasksController_GenerateSmartReminders_CreatesAlertsWithoutDuplicates()
    {
        await using var db = CreateDb(nameof(TasksController_GenerateSmartReminders_CreatesAlertsWithoutDuplicates));
        var farmSvc = new FarmService(db);
        var (_, _, farm) = await farmSvc.CreateFarmAsync(
            new CreateFarmRequest("Reminder Test Farm", null, null, null, "Kenya", null, null),
            "owner-1");

        db.InventoryItems.Add(new InventoryItem
        {
            FarmId = farm!.Id,
            Name = "Mineral Lick Blocks",
            Category = InventoryCategory.Feed,
            Unit = "blocks",
            CurrentStock = 2,
            MinimumStock = 10,
            IsActive = true
        });
        await db.SaveChangesAsync();

        var controller = new TasksController(db, farmSvc)
        {
            ControllerContext = CreateControllerContext("owner-1")
        };

        // First scan creates 1 low-stock notification
        Assert.IsType<OkObjectResult>(await controller.GenerateSmartReminders(farm.Id));
        var count1 = await db.Notifications.CountAsync(n => n.FarmId == farm.Id);
        Assert.Equal(1, count1);

        // Second scan does not duplicate unread notification
        Assert.IsType<OkObjectResult>(await controller.GenerateSmartReminders(farm.Id));
        var count2 = await db.Notifications.CountAsync(n => n.FarmId == farm.Id);
        Assert.Equal(1, count2);
    }
}
