using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFarm.Api.Data;
using SmartFarm.Api.DTOs;
using SmartFarm.Api.Models;
using SmartFarm.Api.Services;

namespace SmartFarm.Api.Controllers;

[ApiController]
[Route("api/farms")]
[Authorize]
public class FarmsController : ControllerBase
{
    private readonly IFarmService _farmService;
    private readonly SmartFarmDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private string UserEmail => User.FindFirstValue(ClaimTypes.Email) ?? UserId;

    public FarmsController(IFarmService farmService, SmartFarmDbContext db, UserManager<ApplicationUser> userManager)
    {
        _farmService = farmService;
        _db = db;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyFarms()
        => Ok(await _farmService.GetUserFarmsAsync(UserId));

    [HttpPost]
    public async Task<IActionResult> CreateFarm([FromBody] CreateFarmRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var (success, error, farm) = await _farmService.CreateFarmAsync(request, UserId);
        if (!success) return BadRequest(new { error });

        _db.AuditLogs.Add(new AuditLog
        {
            FarmId = farm!.Id, UserId = UserId, UserName = UserEmail,
            Action = "Create", EntityType = "Farm", EntityId = farm.Id,
            NewValues = $"Created farm '{farm.Name}'"
        });
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetFarm), new { farmId = farm.Id }, farm);
    }

    [HttpGet("{farmId:int}")]
    public async Task<IActionResult> GetFarm(int farmId)
    {
        var farm = await _farmService.GetFarmAsync(farmId, UserId);
        return farm == null ? NotFound() : Ok(farm);
    }

    [HttpPut("{farmId:int}")]
    public async Task<IActionResult> UpdateFarm(int farmId, [FromBody] UpdateFarmRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var (success, error) = await _farmService.UpdateFarmAsync(farmId, request, UserId);
        if (!success) return BadRequest(new { error });

        _db.AuditLogs.Add(new AuditLog
        {
            FarmId = farmId, UserId = UserId, UserName = UserEmail,
            Action = "Update", EntityType = "Farm", EntityId = farmId,
            NewValues = $"Updated farm '{request.Name}'"
        });
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{farmId:int}/dashboard")]
    public async Task<IActionResult> GetDashboard(int farmId, [FromQuery] DateTime? date)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        return Ok(await _farmService.GetDashboardAsync(farmId, date));
    }

    // ---- Locations / Sections ----
    [HttpGet("{farmId:int}/locations")]
    public async Task<IActionResult> GetLocations(int farmId)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        var list = await _db.FarmLocations.Where(l => l.FarmId == farmId).OrderBy(l => l.Name).ToListAsync();
        return Ok(list);
    }

    [HttpPost("{farmId:int}/locations")]
    public async Task<IActionResult> CreateLocation(int farmId, [FromBody] CreateLocationRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var loc = new FarmLocation
        {
            FarmId = farmId,
            Name = request.Name,
            Type = string.IsNullOrWhiteSpace(request.Type) ? LocationType.Field : request.Type,
            Description = request.Description,
            CreatedBy = UserId
        };
        _db.FarmLocations.Add(loc);
        await _db.SaveChangesAsync();
        return Ok(loc);
    }

    // ---- Users & Role Permissions ----
    [HttpGet("{farmId:int}/users")]
    public async Task<IActionResult> GetFarmUsers(int farmId)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        var users = await _db.FarmUsers
            .Include(fu => fu.User)
            .Where(fu => fu.FarmId == farmId)
            .Select(fu => new
            {
                fu.Id,
                fu.UserId,
                Email = fu.User != null ? fu.User.Email : "",
                FirstName = fu.User != null ? fu.User.FirstName : "",
                LastName = fu.User != null ? fu.User.LastName : "",
                fu.Role,
                fu.IsActive,
                fu.JoinedAt
            })
            .ToListAsync();
        return Ok(users);
    }

    [HttpPost("{farmId:int}/users")]
    public async Task<IActionResult> AddFarmUser(int farmId, [FromBody] AddFarmUserRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var callerRole = await _farmService.GetUserFarmRoleAsync(farmId, UserId);
        if (callerRole != FarmRole.FarmManager && callerRole != FarmRole.SystemAdmin)
            return Forbid();

        var targetUser = await _userManager.FindByEmailAsync(request.Email);
        if (targetUser == null)
            return NotFound(new { error = $"No registered user found with email '{request.Email}'. Ask them to register first." });

        if (await _db.FarmUsers.AnyAsync(fu => fu.FarmId == farmId && fu.UserId == targetUser.Id))
            return Conflict(new { error = "User is already a member of this farm." });

        var farmUser = new FarmUser
        {
            FarmId = farmId,
            UserId = targetUser.Id,
            Role = request.Role,
            IsActive = true,
            CreatedBy = UserId
        };
        _db.FarmUsers.Add(farmUser);
        _db.AuditLogs.Add(new AuditLog
        {
            FarmId = farmId, UserId = UserId, UserName = UserEmail,
            Action = "AddFarmUser", EntityType = "FarmUser",
            NewValues = $"Added {request.Email} as {request.Role}"
        });
        await _db.SaveChangesAsync();

        return Ok(new { farmUser.Id, farmUser.UserId, Email = targetUser.Email, targetUser.FirstName, targetUser.LastName, farmUser.Role, farmUser.IsActive, farmUser.JoinedAt });
    }

    [HttpPut("{farmId:int}/users/{farmUserId:int}")]
    public async Task<IActionResult> UpdateFarmUser(int farmId, int farmUserId, [FromBody] UpdateFarmUserRequest request)
    {
        var callerRole = await _farmService.GetUserFarmRoleAsync(farmId, UserId);
        if (callerRole != FarmRole.FarmManager && callerRole != FarmRole.SystemAdmin)
            return Forbid();

        var fu = await _db.FarmUsers.FirstOrDefaultAsync(x => x.FarmId == farmId && x.Id == farmUserId);
        if (fu == null) return NotFound();

        var oldRole = fu.Role;
        fu.Role = request.Role;
        fu.IsActive = request.IsActive;
        fu.UpdatedBy = UserId;

        _db.AuditLogs.Add(new AuditLog
        {
            FarmId = farmId, UserId = UserId, UserName = UserEmail,
            Action = "UpdateFarmUser", EntityType = "FarmUser", EntityId = farmUserId,
            OldValues = $"Role={oldRole}", NewValues = $"Role={request.Role}, IsActive={request.IsActive}"
        });
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ---- Audit Logs ----
    [HttpGet("{farmId:int}/audit-logs")]
    public async Task<IActionResult> GetAuditLogs(int farmId, [FromQuery] int take = 50)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        var logs = await _db.AuditLogs
            .Where(a => a.FarmId == farmId)
            .OrderByDescending(a => a.Timestamp)
            .Take(Math.Clamp(take, 1, 200))
            .ToListAsync();
        return Ok(logs);
    }

    // ---- Explicit Opt-in Demo Data Seeder ----
    [HttpPost("{farmId:int}/seed-demo")]
    public async Task<IActionResult> SeedDemoData(int farmId)
    {
        var callerRole = await _farmService.GetUserFarmRoleAsync(farmId, UserId);
        if (callerRole != FarmRole.FarmManager && callerRole != FarmRole.SystemAdmin)
            return Forbid();

        if (await _db.Animals.AnyAsync(a => a.FarmId == farmId && a.TagId.StartsWith("DEMO-")))
            return Conflict(new { error = "Demo data has already been loaded for this farm." });

        var now = DateTime.UtcNow.Date;

        // 1. Locations
        var dairyBarn = new FarmLocation { FarmId = farmId, Name = "[DEMO] Dairy Barn A", Type = LocationType.Barn, Description = "Demo dairy cattle shed" };
        var goatPen = new FarmLocation { FarmId = farmId, Name = "[DEMO] Goat & Sheepaddock", Type = LocationType.Pen, Description = "Demo small ruminants pen" };
        var poultryHouse = new FarmLocation { FarmId = farmId, Name = "[DEMO] Poultry House 1", Type = LocationType.Barn, Description = "Demo layer flock house" };
        var southApiary = new FarmLocation { FarmId = farmId, Name = "[DEMO] Acacia Apiary", Type = LocationType.Apiary, Description = "Demo orchard apiary" };
        _db.FarmLocations.AddRange(dairyBarn, goatPen, poultryHouse, southApiary);
        await _db.SaveChangesAsync();

        // 2. Animals (Goats, Sheep, Cows, Chickens)
        var cow1 = new Animal { FarmId = farmId, TagId = "DEMO-COW-01", Name = "Bella [DEMO]", Species = "Cow", Breed = "Friesian", Sex = "Female", DateOfBirth = now.AddYears(-3), CurrentWeightKg = 520, LocationId = dairyBarn.Id, AcquisitionType = "Born", Status = "Active", Notes = "[DEMO] High-yielding dairy cow" };
        var cow2 = new Animal { FarmId = farmId, TagId = "DEMO-COW-02", Name = "Daisy [DEMO]", Species = "Cow", Breed = "Ayrshire", Sex = "Female", DateOfBirth = now.AddYears(-4), CurrentWeightKg = 480, LocationId = dairyBarn.Id, AcquisitionType = "Purchased", AcquisitionCost = 85000, Status = "Active", Notes = "[DEMO] Purchased dairy cow" };
        var goat1 = new Animal { FarmId = farmId, TagId = "DEMO-GT-01", Name = "Nanny [DEMO]", Species = "Goat", Breed = "Saanen", Sex = "Female", DateOfBirth = now.AddYears(-2), CurrentWeightKg = 55, LocationId = goatPen.Id, AcquisitionType = "Born", Status = "Active", Notes = "[DEMO] Dairy goat" };
        var goat2 = new Animal { FarmId = farmId, TagId = "DEMO-GT-02", Name = "Billy [DEMO]", Species = "Goat", Breed = "Boer", Sex = "Male", DateOfBirth = now.AddYears(-2), CurrentWeightKg = 72, LocationId = goatPen.Id, AcquisitionType = "Purchased", AcquisitionCost = 18000, Status = "Active", Notes = "[DEMO] Breeding buck" };
        var sheep1 = new Animal { FarmId = farmId, TagId = "DEMO-SH-01", Name = "Woolly [DEMO]", Species = "Sheep", Breed = "Dorper", Sex = "Female", DateOfBirth = now.AddYears(-2), CurrentWeightKg = 60, LocationId = goatPen.Id, AcquisitionType = "Born", Status = "Active", Notes = "[DEMO] Ewe" };
        var sheep2 = new Animal { FarmId = farmId, TagId = "DEMO-SH-02", Name = "Merino [DEMO]", Species = "Sheep", Breed = "Merino", Sex = "Male", DateOfBirth = now.AddYears(-3), CurrentWeightKg = 68, LocationId = goatPen.Id, AcquisitionType = "Born", Status = "Active", Notes = "[DEMO] Wool ram" };
        var chick1 = new Animal { FarmId = farmId, TagId = "DEMO-CK-01", Name = "Rooster [DEMO]", Species = "Chicken", Breed = "Kuroiler", Sex = "Male", DateOfBirth = now.AddMonths(-8), CurrentWeightKg = 3.2m, LocationId = poultryHouse.Id, AcquisitionType = "Born", Status = "Active", Notes = "[DEMO] Breeding cockerel" };
        _db.Animals.AddRange(cow1, cow2, goat1, goat2, sheep1, sheep2, chick1);

        // 3. Animal Group (Poultry Flock)
        var flock = new AnimalGroup { FarmId = farmId, Name = "[DEMO] Layer Flock Batch A", Species = "Chicken", GroupType = "Flock", Count = 250, LocationId = poultryHouse.Id, Description = "[DEMO] 250 ISA Brown laying hens" };
        _db.AnimalGroups.Add(flock);
        await _db.SaveChangesAsync();

        // 4. Beehives & Inspection
        var hive1 = new Beehive { FarmId = farmId, HiveCode = "DEMO-HV-01", ApiaryName = "[DEMO] Acacia Apiary", LocationId = southApiary.Id, HiveType = "Langstroth", ColonyStatus = "Active", QueenStatus = "Present", LastInspectionDate = now.AddDays(-5), Notes = "[DEMO] Strong colony" };
        var hive2 = new Beehive { FarmId = farmId, HiveCode = "DEMO-HV-02", ApiaryName = "[DEMO] Acacia Apiary", LocationId = southApiary.Id, HiveType = "TopBar", ColonyStatus = "Active", QueenStatus = "Laying", LastInspectionDate = now.AddDays(-10), Notes = "[DEMO] TopBar hive" };
        _db.Beehives.AddRange(hive1, hive2);
        await _db.SaveChangesAsync();

        _db.HiveInspections.Add(new HiveInspection { BeehiveId = hive1.Id, InspectedAt = now.AddDays(-5), InspectedBy = "Demo Beekeeper", QueenSeen = true, HealthScore = 9, HasEggs = true, HasLarvae = true, HasCappedBrood = true, FramesOfBees = 8, FramesOfBrood = 5, FramesOfHoney = 4, NextInspectionDue = now.AddDays(9), Notes = "[DEMO] Routine inspection" });

        // 5. Breeding Record
        _db.BreedingRecords.Add(new BreedingRecord { FarmId = farmId, SireId = goat2.Id, DamId = goat1.Id, MatingDate = now.AddDays(-120), ExpectedDOB = now.AddDays(30), Status = BreedingStatus.Pregnant, Notes = "[DEMO] Confirmed kidding expected next month" });

        // 6. Production Batches & Records (Last 5 days + Today)
        var milkBatch = new ProductionBatch { FarmId = farmId, ProductType = "Milk", BatchCode = "DEMO-MILK-B1", BatchDate = now, TotalQuantity = 140, AvailableQuantity = 90, Unit = "L", Status = BatchStatus.PartiallyUsed };
        var eggBatch = new ProductionBatch { FarmId = farmId, ProductType = "Eggs", BatchCode = "DEMO-EGG-B1", BatchDate = now, TotalQuantity = 630, AvailableQuantity = 630, Unit = "pcs", Status = BatchStatus.Active };
        var honeyBatch = new ProductionBatch { FarmId = farmId, ProductType = "Honey", BatchCode = "DEMO-HNY-B1", BatchDate = now, TotalQuantity = 28, AvailableQuantity = 28, Unit = "kg", Status = BatchStatus.Active };
        _db.ProductionBatches.AddRange(milkBatch, eggBatch, honeyBatch);
        await _db.SaveChangesAsync();

        for (int i = 2; i >= 0; i--)
        {
            var d = now.AddDays(-i);
            _db.ProductionRecords.Add(new ProductionRecord { FarmId = farmId, ProductType = "Milk", ProductionDate = d, AnimalId = cow1.Id, Quantity = i == 0 ? 48 : 46, RejectedQuantity = 0, Unit = "L", QualityStatus = "Accepted", BatchCode = milkBatch.BatchCode, BatchId = milkBatch.Id, Notes = "[DEMO] Daily milking" });
            _db.ProductionRecords.Add(new ProductionRecord { FarmId = farmId, ProductType = "Eggs", ProductionDate = d, GroupId = flock.Id, Quantity = i == 0 ? 215 : 210, RejectedQuantity = 2, Unit = "pcs", QualityStatus = "Accepted", BatchCode = eggBatch.BatchCode, BatchId = eggBatch.Id, Notes = "[DEMO] Flock egg collection" });
        }
        _db.ProductionRecords.Add(new ProductionRecord { FarmId = farmId, ProductType = "Honey", ProductionDate = now, BeehiveId = hive1.Id, Quantity = 28, RejectedQuantity = 0, Unit = "kg", QualityStatus = "Accepted", BatchCode = honeyBatch.BatchCode, BatchId = honeyBatch.Id, Notes = "[DEMO] Raw honey harvest" });

        // 7. Vaccination & Health
        var sched = new VaccinationSchedule { FarmId = farmId, VaccineName = "[DEMO] Foot & Mouth (FMD)", Species = "Cow", TargetAgeGroup = "Adult", IntervalDays = 180, Description = "[DEMO] Vet-approved biannual schedule" };
        _db.VaccinationSchedules.Add(sched);
        await _db.SaveChangesAsync();

        _db.VaccinationRecords.AddRange(
            new VaccinationRecord { FarmId = farmId, ScheduleId = sched.Id, VaccineName = "[DEMO] Foot & Mouth (FMD)", Species = "Cow", AnimalId = cow1.Id, ScheduledDate = now.AddDays(3), Status = VaccinationStatus.Scheduled, DosageNotes = "Per licensed veterinarian prescription", Notes = "[DEMO] Upcoming vaccination" },
            new VaccinationRecord { FarmId = farmId, VaccineName = "[DEMO] Newcastle Disease", Species = "Chicken", GroupId = flock.Id, ScheduledDate = now.AddDays(-15), DateAdministered = now.AddDays(-15), BatchNumber = "VAX-ND-99", Administrator = "Dr. Kamau (Vet)", Status = VaccinationStatus.Completed, DosageNotes = "Eye-drop per vet instructions", Notes = "[DEMO] Completed flock vaccination" }
        );

        _db.HealthRecords.Add(new HealthRecord { FarmId = farmId, AnimalId = goat1.Id, RecordDate = now.AddDays(-7), RecordType = "Examination", Symptoms = "Mild hoof limp", Diagnosis = "Minor hoof overgrowth", Treatment = "Hoof trimming & antiseptic spray", VeterinarianName = "Dr. Kamau", VeterinaryCost = 2500, Status = "Resolved", Notes = "[DEMO] Vet check" });

        // 8. Inventory & Feed
        var supplier = new Supplier { FarmId = farmId, Name = "[DEMO] AgroVet & Feeds Ltd", ContactPerson = "Peter Njoroge", Phone = "+254700111222", Email = "sales@agrovet.demo" };
        _db.Suppliers.Add(supplier);
        await _db.SaveChangesAsync();

        var feedItem = new InventoryItem { FarmId = farmId, Name = "[DEMO] Dairy Meal 70kg", Category = "Feed", Unit = "bags", CurrentStock = 4, MinimumStock = 10, UnitCost = 3200, SupplierId = supplier.Id, Description = "[DEMO] Low stock trigger item" };
        var layerMash = new InventoryItem { FarmId = farmId, Name = "[DEMO] Layer Mash 70kg", Category = "Feed", Unit = "bags", CurrentStock = 25, MinimumStock = 8, UnitCost = 3600, SupplierId = supplier.Id };
        _db.InventoryItems.AddRange(feedItem, layerMash);

        // 9. Customers, Sales Order, Invoice, Payment, Delivery, Expense
        var customer = new Customer { FarmId = farmId, Name = "[DEMO] GreenValley Creameries", ContactPerson = "Grace Wanjiku", Phone = "+254722333444", Email = "orders@greenvalley.demo", OutstandingBalance = 0 };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();

        var order = new SalesOrder
        {
            FarmId = farmId, CustomerId = customer.Id, OrderNumber = "DEMO-SO-001", OrderDate = now.AddDays(-2), Status = OrderStatus.Confirmed, TotalAmount = 42500, Notes = "[DEMO] Milk & Honey order",
            Items = new List<SalesOrderItem>
            {
                new SalesOrderItem { ProductType = "Milk", BatchId = milkBatch.Id, Quantity = 50, Unit = "L", UnitPrice = 150, TotalPrice = 7500 },
                new SalesOrderItem { ProductType = "Honey", BatchId = honeyBatch.Id, Quantity = 50, Unit = "kg", UnitPrice = 700, TotalPrice = 35000 }
            }
        };
        _db.SalesOrders.Add(order);
        await _db.SaveChangesAsync();

        var invoice = new Invoice { FarmId = farmId, SalesOrderId = order.Id, InvoiceNumber = "DEMO-INV-001", InvoiceDate = now.AddDays(-2), DueDate = now.AddDays(14), Amount = 42500, PaidAmount = 42500, Status = InvoiceStatus.Paid };
        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();

        _db.Payments.Add(new Payment { FarmId = farmId, InvoiceId = invoice.Id, Amount = 42500, PaidAt = now.AddDays(-1), Method = PaymentMethod.MobileMoney, Reference = "DEMO-MPESA-01", Notes = "[DEMO] Full invoice settlement" });
        _db.Expenses.Add(new Expense { FarmId = farmId, Category = "Feed", Amount = 14800, ExpenseDate = now.AddDays(-3), Description = "[DEMO] Purchased poultry & dairy feeds", SupplierId = supplier.Id, Reference = "DEMO-EXP-01" });

        _db.Deliveries.Add(new Delivery
        {
            FarmId = farmId, DeliveryNumber = "DEMO-DEL-001", CustomerId = customer.Id, SalesOrderId = order.Id,
            Status = DeliveryStatus.Dispatched, DispatchDate = now, ExpectedArrival = now.AddDays(1),
            DriverName = "John Mwangi", VehicleReg = "KDA 456B", Notes = "[DEMO] Morning milk dispatch",
            Items = new List<DeliveryItem>
            {
                new DeliveryItem { BatchId = milkBatch.Id, ProductType = "Milk", QuantityDispatched = 50, Unit = "L" }
            }
        });

        // 10. Tasks & Notifications
        _db.FarmTasks.AddRange(
            new FarmTask { FarmId = farmId, Title = "[DEMO] Administer FMD Vaccine to DEMO-COW-01", Category = "Vaccination", Priority = "High", Status = Models.TaskStatus.Pending, DueDate = now.AddDays(3), Description = "Follow vet schedule" },
            new FarmTask { FarmId = farmId, Title = "[DEMO] Inspect Acacia Apiary Hive DEMO-HV-01", Category = "Beehives", Priority = "Medium", Status = Models.TaskStatus.Pending, DueDate = now.AddDays(4), Description = "Check queen cells and honey super" }
        );
        _db.Notifications.Add(new Notification { FarmId = farmId, Type = NotificationType.Warning, Title = "[DEMO] Low Stock Alert", Message = "[DEMO] Dairy Meal 70kg is at 4 bags (minimum threshold: 10 bags).", IsRead = false });

        _db.AuditLogs.Add(new AuditLog { FarmId = farmId, UserId = UserId, UserName = UserEmail, Action = "SeedDemoData", EntityType = "Farm", EntityId = farmId, NewValues = "Loaded clearly labeled [DEMO] dataset" });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Demo dataset ([DEMO]) loaded successfully." });
    }
}
