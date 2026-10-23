namespace SmartFarm.Api.Models;

public class Animal : BaseEntity
{
    public int FarmId { get; set; }
    public int? LocationId { get; set; }
    public string TagId { get; set; } = string.Empty;   // ear tag or RFID
    public string? Name { get; set; }
    public string Species { get; set; } = string.Empty;  // Goat, Sheep, Cow, Chicken
    public string? Breed { get; set; }
    public string Sex { get; set; } = AnimalSex.Unknown;
    public DateTime? DateOfBirth { get; set; }
    public string AcquisitionType { get; set; } = "Born";
    public DateTime AcquisitionDate { get; set; } = DateTime.UtcNow;
    public decimal? AcquisitionCost { get; set; }
    public decimal? CurrentWeightKg { get; set; }
    public string Status { get; set; } = AnimalStatus.Active;
    public string? Notes { get; set; }
    public int? GroupId { get; set; }

    // Parentage
    public int? SireId { get; set; }
    public int? DamId { get; set; }

    // Navigation
    public Farm? Farm { get; set; }
    public FarmLocation? Location { get; set; }
    public AnimalGroup? Group { get; set; }
    public Animal? Sire { get; set; }
    public Animal? Dam { get; set; }
    public ICollection<Animal> Offspring { get; set; } = new List<Animal>();
    public ICollection<AnimalEvent> Events { get; set; } = new List<AnimalEvent>();
    public ICollection<BreedingRecord> BreedingAsSire { get; set; } = new List<BreedingRecord>();
    public ICollection<BreedingRecord> BreedingAsDam { get; set; } = new List<BreedingRecord>();
    public ICollection<VaccinationRecord> VaccinationRecords { get; set; } = new List<VaccinationRecord>();
    public ICollection<HealthRecord> HealthRecords { get; set; } = new List<HealthRecord>();
    public ICollection<ProductionRecord> ProductionRecords { get; set; } = new List<ProductionRecord>();
}

public class AnimalGroup : BaseEntity
{
    public int FarmId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Species { get; set; } = string.Empty;
    public string GroupType { get; set; } = "Flock";
    public int Count { get; set; }
    public int? LocationId { get; set; }
    public string? Description { get; set; }

    public Farm? Farm { get; set; }
    public FarmLocation? Location { get; set; }
    public ICollection<Animal> Animals { get; set; } = new List<Animal>();
    public ICollection<VaccinationRecord> VaccinationRecords { get; set; } = new List<VaccinationRecord>();
    public ICollection<ProductionRecord> ProductionRecords { get; set; } = new List<ProductionRecord>();
}

public class AnimalEvent : BaseEntity
{
    public int AnimalId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public string? Description { get; set; }
    public decimal? Amount { get; set; }
    public string? RecordedBy { get; set; }

    public Animal? Animal { get; set; }
}

public class BreedingRecord : BaseEntity
{
    public int FarmId { get; set; }
    public int? SireId { get; set; }
    public int DamId { get; set; }
    public DateTime MatingDate { get; set; }
    public DateTime? ExpectedDOB { get; set; }
    public DateTime? ActualDOB { get; set; }
    public int? OffspringCount { get; set; }
    public string Status { get; set; } = BreedingStatus.Mated;
    public string? Notes { get; set; }

    public Farm? Farm { get; set; }
    public Animal? Sire { get; set; }
    public Animal? Dam { get; set; }
}

// ---- Static constants ----
public static class AnimalSex
{
    public const string Male = "Male";
    public const string Female = "Female";
    public const string Unknown = "Unknown";
}

public static class AnimalStatus
{
    public const string Active = "Active";
    public const string Sold = "Sold";
    public const string Deceased = "Deceased";
    public const string Transferred = "Transferred";
    public const string Quarantine = "Quarantine";
}

public static class AcquisitionType
{
    public const string Born = "Born";
    public const string Purchased = "Purchased";
    public const string Transferred = "Transferred";
    public const string Donated = "Donated";
}

public static class GroupType
{
    public const string Flock = "Flock";
    public const string Herd = "Herd";
    public const string Batch = "Batch";
    public const string Pen = "Pen";
}

public static class EventType
{
    public const string Birth = "Birth";
    public const string Purchase = "Purchase";
    public const string Sale = "Sale";
    public const string Transfer = "Transfer";
    public const string Death = "Death";
    public const string WeightCheck = "WeightCheck";
    public const string Shearing = "Shearing";
    public const string Tagging = "Tagging";
    public const string Other = "Other";
}

public static class BreedingStatus
{
    public const string Mated = "Mated";
    public const string Pregnant = "Pregnant";
    public const string BirthConfirmed = "BirthConfirmed";
    public const string Failed = "Failed";
    public const string Cancelled = "Cancelled";
}
