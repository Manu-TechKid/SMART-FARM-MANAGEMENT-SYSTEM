namespace SmartFarm.Api.Models;

public class Delivery : BaseEntity
{
    public int FarmId { get; set; }
    public string DeliveryNumber { get; set; } = string.Empty;
    public int? CustomerId { get; set; }
    public int? SalesOrderId { get; set; }
    public string Status { get; set; } = DeliveryStatus.Pending;
    public DateTime? DispatchDate { get; set; }
    public DateTime? ExpectedArrival { get; set; }
    public DateTime? ActualArrival { get; set; }
    public string? DriverName { get; set; }
    public string? VehicleReg { get; set; }
    public string? ProofOfDelivery { get; set; }
    public string? DiscrepancyReason { get; set; }
    public string? Notes { get; set; }

    public Farm? Farm { get; set; }
    public Customer? Customer { get; set; }
    public SalesOrder? SalesOrder { get; set; }
    public ICollection<DeliveryItem> Items { get; set; } = new List<DeliveryItem>();
}

public class DeliveryItem : BaseEntity
{
    public int DeliveryId { get; set; }
    public int? BatchId { get; set; }
    public string ProductType { get; set; } = string.Empty;
    public decimal QuantityDispatched { get; set; }
    public decimal QuantityReceived { get; set; }
    public decimal QuantityRejected { get; set; }
    public string Unit { get; set; } = "kg";
    public string? Notes { get; set; }

    public Delivery? Delivery { get; set; }
    public ProductionBatch? Batch { get; set; }
}

public static class DeliveryStatus
{
    public const string Pending = "Pending";
    public const string Prepared = "Prepared";
    public const string Dispatched = "Dispatched";
    public const string PartiallyDelivered = "PartiallyDelivered";
    public const string Delivered = "Delivered";
    public const string Failed = "Failed";
    public const string Cancelled = "Cancelled";
}
