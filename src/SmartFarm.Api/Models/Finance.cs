namespace SmartFarm.Api.Models;

public class Customer : BaseEntity
{
    public int FarmId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public decimal OutstandingBalance { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }

    public Farm? Farm { get; set; }
    public ICollection<SalesOrder> SalesOrders { get; set; } = new List<SalesOrder>();
    public ICollection<Delivery> Deliveries { get; set; } = new List<Delivery>();
}

public class Supplier : BaseEntity
{
    public int FarmId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }

    public Farm? Farm { get; set; }
    public ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
}

public class SalesOrder : BaseEntity
{
    public int FarmId { get; set; }
    public int CustomerId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = OrderStatus.Pending;
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }

    public Farm? Farm { get; set; }
    public Customer? Customer { get; set; }
    public ICollection<SalesOrderItem> Items { get; set; } = new List<SalesOrderItem>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}

public class SalesOrderItem : BaseEntity
{
    public int SalesOrderId { get; set; }
    public string ProductType { get; set; } = string.Empty;
    public int? BatchId { get; set; }
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = "kg";
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public string? Notes { get; set; }

    public SalesOrder? SalesOrder { get; set; }
    public ProductionBatch? Batch { get; set; }
}

public class Invoice : BaseEntity
{
    public int FarmId { get; set; }
    public int SalesOrderId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; }
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; } = 0;
    public string Status { get; set; } = InvoiceStatus.Unpaid;
    public string? Notes { get; set; }

    public Farm? Farm { get; set; }
    public SalesOrder? SalesOrder { get; set; }
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public class Payment : BaseEntity
{
    public int InvoiceId { get; set; }
    public int FarmId { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
    public string Method { get; set; } = PaymentMethod.Cash;
    public string? Reference { get; set; }
    public string? Notes { get; set; }

    public Invoice? Invoice { get; set; }
}

public class Expense : BaseEntity
{
    public int FarmId { get; set; }
    public string Category { get; set; } = ExpenseCategory.Other;
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;
    public string Description { get; set; } = string.Empty;
    public int? SupplierId { get; set; }
    public string? Reference { get; set; }
    public string? RecordedBy { get; set; }

    public Farm? Farm { get; set; }
    public Supplier? Supplier { get; set; }
}

public static class OrderStatus
{
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string Fulfilled = "Fulfilled";
    public const string Cancelled = "Cancelled";
}

public static class InvoiceStatus
{
    public const string Unpaid = "Unpaid";
    public const string PartiallyPaid = "PartiallyPaid";
    public const string Paid = "Paid";
    public const string Overdue = "Overdue";
    public const string Voided = "Voided";
}

public static class PaymentMethod
{
    public const string Cash = "Cash";
    public const string BankTransfer = "BankTransfer";
    public const string MobileMoney = "MobileMoney";
    public const string Cheque = "Cheque";
    public const string Other = "Other";
}

public static class ExpenseCategory
{
    public const string Feed = "Feed";
    public const string Veterinary = "Veterinary";
    public const string Labour = "Labour";
    public const string Transport = "Transport";
    public const string Utilities = "Utilities";
    public const string Equipment = "Equipment";
    public const string Medicine = "Medicine";
    public const string Maintenance = "Maintenance";
    public const string Other = "Other";
}
