namespace SmartFarm.Api.Models;

public class Farm : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Address { get; set; }
    public string? County { get; set; }
    public string? Country { get; set; } = "Kenya";
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? LogoUrl { get; set; }
    public string OwnerId { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    // Navigation
    public ApplicationUser? Owner { get; set; }
    public ICollection<FarmUser> FarmUsers { get; set; } = new List<FarmUser>();
    public ICollection<FarmLocation> Locations { get; set; } = new List<FarmLocation>();
    public ICollection<Animal> Animals { get; set; } = new List<Animal>();
    public ICollection<AnimalGroup> AnimalGroups { get; set; } = new List<AnimalGroup>();
    public ICollection<Beehive> Beehives { get; set; } = new List<Beehive>();
    public ICollection<ProductionRecord> ProductionRecords { get; set; } = new List<ProductionRecord>();
    public ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
    public ICollection<Customer> Customers { get; set; } = new List<Customer>();
    public ICollection<Supplier> Suppliers { get; set; } = new List<Supplier>();
    public ICollection<Delivery> Deliveries { get; set; } = new List<Delivery>();
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
    public ICollection<FarmTask> Tasks { get; set; } = new List<FarmTask>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}

public class FarmUser : BaseEntity
{
    public int FarmId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Role { get; set; } = FarmRole.Viewer;
    public bool IsActive { get; set; } = true;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public Farm? Farm { get; set; }
    public ApplicationUser? User { get; set; }
}

public class FarmLocation : BaseEntity
{
    public int FarmId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = LocationType.Field; // barn, field, apiary, pond
    public string? Description { get; set; }

    public Farm? Farm { get; set; }
    public ICollection<Animal> Animals { get; set; } = new List<Animal>();
    public ICollection<Beehive> Beehives { get; set; } = new List<Beehive>();
}

public static class FarmRole
{
    public const string SystemAdmin = "SystemAdmin";
    public const string FarmManager = "FarmManager";
    public const string LivestockOfficer = "LivestockOfficer";
    public const string VeterinaryOfficer = "VeterinaryOfficer";
    public const string ProductionOfficer = "ProductionOfficer";
    public const string Storekeeper = "Storekeeper";
    public const string DeliveryOfficer = "DeliveryOfficer";
    public const string Accountant = "Accountant";
    public const string Viewer = "Viewer";
}

public static class LocationType
{
    public const string Barn = "Barn";
    public const string Field = "Field";
    public const string Apiary = "Apiary";
    public const string Pond = "Pond";
    public const string Pen = "Pen";
    public const string Other = "Other";
}
