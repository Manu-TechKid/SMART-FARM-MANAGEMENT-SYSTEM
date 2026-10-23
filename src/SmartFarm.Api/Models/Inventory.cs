namespace SmartFarm.Api.Models;

public class InventoryItem : BaseEntity
{
    public int FarmId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = InventoryCategory.Feed;
    public string Unit { get; set; } = "kg";
    public decimal CurrentStock { get; set; } = 0;
    public decimal MinimumStock { get; set; } = 0;
    public decimal? UnitCost { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public int? SupplierId { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public Farm? Farm { get; set; }
    public Supplier? Supplier { get; set; }
    public ICollection<StockMovement> StockMovements { get; set; } = new List<StockMovement>();
}

public class StockMovement : BaseEntity
{
    public int ItemId { get; set; }
    public int FarmId { get; set; }
    public string MovementType { get; set; } = "Receipt";
    public decimal Quantity { get; set; }
    public decimal? UnitCost { get; set; }
    public DateTime MovementDate { get; set; } = DateTime.UtcNow;
    public string? Reference { get; set; }
    public string? RecordedBy { get; set; }
    public string? Notes { get; set; }

    public InventoryItem? Item { get; set; }
}

public static class InventoryCategory
{
    public const string Feed = "Feed";
    public const string Medicine = "Medicine";
    public const string Vaccine = "Vaccine";
    public const string Packaging = "Packaging";
    public const string Equipment = "Equipment";
    public const string Supplement = "Supplement";
    public const string Other = "Other";
}

public static class MovementType
{
    public const string Receipt = "Receipt";
    public const string Usage = "Usage";
    public const string Adjustment = "Adjustment";
    public const string Wastage = "Wastage";
    public const string Return = "Return";
    public const string Transfer = "Transfer";
}
