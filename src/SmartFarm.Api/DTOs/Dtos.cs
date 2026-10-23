using System.ComponentModel.DataAnnotations;

namespace SmartFarm.Api.DTOs;

// -------- Auth --------
public record RegisterRequest(
    [Required, MaxLength(100)] string FirstName,
    [Required, MaxLength(100)] string LastName,
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password
);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    string UserId,
    string Email,
    string FirstName,
    string LastName,
    IList<string> Roles
);

public record RefreshTokenRequest([Required] string RefreshToken);

public record ForgotPasswordRequest([Required, EmailAddress] string Email);

public record ResetPasswordRequest(
    [Required] string Email,
    [Required] string Token,
    [Required, MinLength(8)] string NewPassword
);

// -------- Farm --------
public record CreateFarmRequest(
    [Required, MaxLength(200)] string Name,
    string? Description,
    string? Address,
    string? County,
    string? Country,
    string? PhoneNumber,
    string? Email
);

public record UpdateFarmRequest(
    [Required, MaxLength(200)] string Name,
    string? Description,
    string? Address,
    string? County,
    string? Country,
    string? PhoneNumber,
    string? Email
);

public record FarmResponse(
    int Id,
    string Name,
    string? Description,
    string? Address,
    string? County,
    string? Country,
    string? PhoneNumber,
    string? Email,
    string OwnerId,
    DateTime CreatedAt
);

// -------- Animal --------
public record CreateAnimalRequest(
    [Required, MaxLength(100)] string TagId,
    string? Name,
    [Required] string Species,
    string? Breed,
    [Required] string Sex,
    DateTime? DateOfBirth,
    string AcquisitionType,
    DateTime? AcquisitionDate,
    decimal? AcquisitionCost,
    decimal? CurrentWeightKg,
    int? LocationId,
    int? GroupId,
    int? SireId,
    int? DamId,
    string? Notes
);

public record UpdateAnimalRequest(
    string? Name,
    string? Breed,
    string? Sex,
    DateTime? DateOfBirth,
    decimal? CurrentWeightKg,
    string? Status,
    int? LocationId,
    int? GroupId,
    string? Notes
);

public record AnimalResponse(
    int Id,
    string TagId,
    string? Name,
    string Species,
    string? Breed,
    string Sex,
    DateTime? DateOfBirth,
    string Status,
    decimal? CurrentWeightKg,
    string AcquisitionType,
    int? LocationId,
    string? LocationName,
    int? GroupId,
    string? GroupName,
    DateTime CreatedAt
);

// -------- AnimalGroup --------
public record CreateGroupRequest(
    [Required] string Name,
    [Required] string Species,
    string GroupType,
    int Count,
    int? LocationId,
    string? Description
);

public record AnimalGroupResponse(
    int Id,
    string Name,
    string Species,
    string GroupType,
    int Count,
    int? LocationId,
    string? LocationName,
    DateTime CreatedAt
);

// -------- Animal Event --------
public record AddEventRequest(
    [Required] string EventType,
    DateTime EventDate,
    string? Description,
    decimal? Amount
);

// -------- Breeding --------
public record CreateBreedingRequest(
    int? SireId,
    [Required] int DamId,
    DateTime MatingDate,
    DateTime? ExpectedDOB,
    string? Notes
);

public record BreedingResponse(
    int Id,
    int? SireId,
    string? SireTag,
    int DamId,
    string DamTag,
    DateTime MatingDate,
    DateTime? ExpectedDOB,
    DateTime? ActualDOB,
    int? OffspringCount,
    string Status,
    string? Notes
);

// -------- Beehive --------
public record CreateBeehiveRequest(
    [Required, MaxLength(100)] string HiveCode,
    int? LocationId,
    string? ApiaryName,
    string HiveType,
    string? Notes
);

public record UpdateBeehiveRequest(
    int? LocationId,
    string? ApiaryName,
    string? HiveType,
    string? ColonyStatus,
    string? QueenStatus,
    string? Notes
);

public record BeehiveResponse(
    int Id,
    string HiveCode,
    int? LocationId,
    string? LocationName,
    string? ApiaryName,
    string HiveType,
    string ColonyStatus,
    string QueenStatus,
    DateTime? LastInspectionDate,
    DateTime CreatedAt
);

public record CreateInspectionRequest(
    DateTime InspectedAt,
    [Required] string InspectedBy,
    bool QueenSeen,
    int HealthScore,
    bool HasEggs,
    bool HasLarvae,
    bool HasCappedBrood,
    int? FramesOfBees,
    int? FramesOfBrood,
    int? FramesOfHoney,
    string? PestObservations,
    string? DiseaseObservations,
    string? ActionTaken,
    DateTime? NextInspectionDue,
    string? Notes
);

// -------- Production --------
public record CreateProductionRequest(
    [Required] string ProductType,
    DateTime ProductionDate,
    int? AnimalId,
    int? GroupId,
    int? BeehiveId,
    [Required] decimal Quantity,
    string Unit,
    decimal RejectedQuantity,
    string QualityStatus,
    string? BatchCode,
    int? LocationId,
    string? Notes
);

public record ProductionSummaryResponse(
    string ProductType,
    decimal TotalQuantity,
    decimal TotalRejected,
    int RecordCount,
    DateTime PeriodStart,
    DateTime PeriodEnd
);

// -------- Vaccination --------
public record CreateVaccinationScheduleRequest(
    [Required] string VaccineName,
    [Required] string Species,
    string? TargetAgeGroup,
    int IntervalDays,
    string? Description
);

public record CreateVaccinationRecordRequest(
    int? ScheduleId,
    [Required] string VaccineName,
    [Required] string Species,
    int? AnimalId,
    int? GroupId,
    DateTime? ScheduledDate,
    DateTime? DateAdministered,
    string? BatchNumber,
    string? Administrator,
    DateTime? FollowUpDate,
    string? DosageNotes,
    string? Notes
);

public record VaccinationRecordResponse(
    int Id,
    string VaccineName,
    string Species,
    int? AnimalId,
    string? AnimalTag,
    int? GroupId,
    string? GroupName,
    DateTime? ScheduledDate,
    DateTime? DateAdministered,
    string Status,
    string? Administrator,
    DateTime? FollowUpDate,
    string? Notes
);

// -------- Health Record --------
public record CreateHealthRecordRequest(
    int? AnimalId,
    int? GroupId,
    DateTime RecordDate,
    [Required] string RecordType,
    string? Symptoms,
    string? Diagnosis,
    string? Treatment,
    string? VeterinarianName,
    decimal VeterinaryCost,
    DateTime? WithdrawalPeriodEnd,
    DateTime? FollowUpDate,
    string? Notes
);

// -------- Inventory --------
public record CreateInventoryItemRequest(
    [Required] string Name,
    string Category,
    string Unit,
    decimal MinimumStock,
    decimal? UnitCost,
    DateTime? ExpiryDate,
    int? SupplierId,
    string? Description
);

public record AddStockMovementRequest(
    [Required] string MovementType,
    [Required] decimal Quantity,
    decimal? UnitCost,
    DateTime MovementDate,
    string? Reference,
    string? Notes
);

public record InventoryItemResponse(
    int Id,
    string Name,
    string Category,
    string Unit,
    decimal CurrentStock,
    decimal MinimumStock,
    decimal? UnitCost,
    DateTime? ExpiryDate,
    bool IsLowStock,
    bool IsExpiringSoon,
    DateTime CreatedAt
);

// -------- Customer / Supplier --------
public record CreateCustomerRequest(
    [Required] string Name,
    string? ContactPerson,
    string? Phone,
    string? Email,
    string? Address,
    string? Notes
);

public record CustomerResponse(
    int Id,
    string Name,
    string? ContactPerson,
    string? Phone,
    string? Email,
    decimal OutstandingBalance,
    DateTime CreatedAt
);

public record CreateSupplierRequest(
    [Required] string Name,
    string? ContactPerson,
    string? Phone,
    string? Email,
    string? Address,
    string? Notes
);

// -------- Sales --------
public record CreateSalesOrderRequest(
    [Required] int CustomerId,
    DateTime OrderDate,
    string? Notes,
    List<SalesOrderItemRequest> Items
);

public record SalesOrderItemRequest(
    [Required] string ProductType,
    int? BatchId,
    [Required] decimal Quantity,
    string Unit,
    [Required] decimal UnitPrice
);

// -------- Invoice / Payment --------
public record CreateInvoiceRequest(
    [Required] int SalesOrderId,
    DateTime DueDate,
    string? Notes
);

public record RecordPaymentRequest(
    [Required] decimal Amount,
    DateTime PaidAt,
    string Method,
    string? Reference,
    string? Notes
);

// -------- Expense --------
public record CreateExpenseRequest(
    [Required] string Category,
    [Required] decimal Amount,
    DateTime ExpenseDate,
    [Required] string Description,
    int? SupplierId,
    string? Reference
);

// -------- Delivery --------
public record CreateDeliveryRequest(
    int? CustomerId,
    int? SalesOrderId,
    DateTime? ExpectedArrival,
    string? DriverName,
    string? VehicleReg,
    string? Notes,
    List<DeliveryItemRequest> Items
);

public record DeliveryItemRequest(
    int? BatchId,
    [Required] string ProductType,
    [Required] decimal QuantityDispatched,
    string Unit
);

public record DispatchDeliveryRequest(
    DateTime DispatchDate,
    string? DriverName,
    string? VehicleReg
);

public record ReceiveDeliveryRequest(
    DateTime ActualArrival,
    string? ProofOfDelivery,
    string? DiscrepancyReason,
    List<DeliveryItemReceiptRequest> Items
);

public record DeliveryItemReceiptRequest(
    int DeliveryItemId,
    decimal QuantityReceived,
    decimal QuantityRejected
);

// -------- Tasks --------
public record CreateTaskRequest(
    [Required] string Title,
    string? Description,
    string? AssignedToUserId,
    DateTime? DueDate,
    string Priority,
    string? Category,
    string? RelatedEntityType,
    int? RelatedEntityId
);

public record UpdateTaskStatusRequest(
    [Required] string Status,
    string? Notes
);

// -------- Finance Summary --------
public record FinanceSummaryResponse(
    decimal TotalRevenue,
    decimal TotalExpenses,
    decimal GrossProfit,
    decimal NetOperatingProfit,
    DateTime PeriodStart,
    DateTime PeriodEnd,
    decimal InvoicedRevenue = 0,
    decimal OutstandingReceivables = 0,
    decimal NetCashFlow = 0
);

// -------- Farm Users & Locations --------
public record CreateLocationRequest(
    [Required] string Name,
    string Type = "Field",
    string? Description = null
);

public record AddFarmUserRequest(
    [Required, EmailAddress] string Email,
    [Required] string Role
);

public record UpdateFarmUserRequest(
    [Required] string Role,
    bool IsActive = true
);

public record UpdateBreedingRequest(
    string Status,
    DateTime? ExpectedDOB,
    DateTime? ActualDOB,
    int? OffspringCount,
    string? Notes
);

public record UpdateDeliveryStatusRequest(
    [Required] string Status,
    string? Reason
);

// -------- Dashboard --------
public record DashboardSummaryResponse(
    int TotalAnimals,
    int TotalGoats,
    int TotalSheep,
    int TotalCows,
    int TotalChickens,
    int ActiveBeehives,
    decimal TodayMilkLitres,
    int TodayEggsCount,
    decimal TodayHoneyKg,
    int UpcomingVaccinations,
    int PendingDeliveries,
    int LowStockItems,
    decimal MonthlyRevenue,
    decimal MonthlyExpenses,
    decimal MonthlyProfit,
    List<ProductionChartPoint> ProductionChart,
    List<AlertItem> RecentAlerts
);

public record ProductionChartPoint(string Date, decimal Milk, decimal Eggs, decimal Honey);
public record AlertItem(string Type, string Message, string Severity, DateTime CreatedAt);

// -------- Pagination --------
public record PagedResult<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

public record QueryParams(
    int Page = 1,
    int PageSize = 25,
    string? Search = null,
    string? SortBy = null,
    string? SortDir = "asc"
);
