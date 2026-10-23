namespace SmartFarm.Api.Models;

public class ProductionRecord : BaseEntity
{
    public int FarmId { get; set; }
    public string ProductType { get; set; } = string.Empty; // Milk, Eggs, Honey, Beeswax, Wool
    public DateTime ProductionDate { get; set; }
    public int? LocationId { get; set; }

    // Source (one of these will be set)
    public int? AnimalId { get; set; }
    public int? GroupId { get; set; }
    public int? BeehiveId { get; set; }

    public decimal Quantity { get; set; }
    public string Unit { get; set; } = "kg";
    public decimal RejectedQuantity { get; set; } = 0;
    public string QualityStatus { get; set; } = "Accepted";
    public string? BatchCode { get; set; }
    public int? BatchId { get; set; }
    public string? RecordedBy { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public Farm? Farm { get; set; }
    public Animal? Animal { get; set; }
    public AnimalGroup? Group { get; set; }
    public Beehive? Beehive { get; set; }
    public ProductionBatch? Batch { get; set; }
}

public class ProductionBatch : BaseEntity
{
    public int FarmId { get; set; }
    public string ProductType { get; set; } = string.Empty;
    public string BatchCode { get; set; } = string.Empty;
    public DateTime BatchDate { get; set; }
    public decimal TotalQuantity { get; set; }
    public decimal AvailableQuantity { get; set; }
    public string Unit { get; set; } = "kg";
    public string Status { get; set; } = BatchStatus.Active;
    public string? Notes { get; set; }

    public Farm? Farm { get; set; }
    public ICollection<ProductionRecord> ProductionRecords { get; set; } = new List<ProductionRecord>();
    public ICollection<DeliveryItem> DeliveryItems { get; set; } = new List<DeliveryItem>();
}

public static class ProductType
{
    public const string Milk = "Milk";
    public const string Eggs = "Eggs";
    public const string Honey = "Honey";
    public const string Beeswax = "Beeswax";
    public const string Wool = "Wool";
    public const string Meat = "Meat";
    public const string Other = "Other";
}

public static class QualityStatus
{
    public const string Accepted = "Accepted";
    public const string Rejected = "Rejected";
    public const string Pending = "Pending";
    public const string Quarantine = "Quarantine";
}

public static class BatchStatus
{
    public const string Active = "Active";
    public const string PartiallyUsed = "PartiallyUsed";
    public const string Depleted = "Depleted";
    public const string Expired = "Expired";
}
