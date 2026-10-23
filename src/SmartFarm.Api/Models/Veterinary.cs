namespace SmartFarm.Api.Models;

public class VaccinationSchedule : BaseEntity
{
    public int FarmId { get; set; }
    public string VaccineName { get; set; } = string.Empty;
    public string Species { get; set; } = string.Empty;
    public string? TargetAgeGroup { get; set; }
    public int IntervalDays { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public Farm? Farm { get; set; }
    public ICollection<VaccinationRecord> Records { get; set; } = new List<VaccinationRecord>();
}

public class VaccinationRecord : BaseEntity
{
    public int FarmId { get; set; }
    public int? ScheduleId { get; set; }
    public string VaccineName { get; set; } = string.Empty;
    public string Species { get; set; } = string.Empty;
    public int? AnimalId { get; set; }
    public int? GroupId { get; set; }
    public DateTime? ScheduledDate { get; set; }
    public DateTime? DateAdministered { get; set; }
    public string? BatchNumber { get; set; }
    public string? Administrator { get; set; }
    public DateTime? FollowUpDate { get; set; }
    public string Status { get; set; } = VaccinationStatus.Scheduled;
    public string? Notes { get; set; }
    public string? DosageNotes { get; set; }
    public Farm? Farm { get; set; }
    public VaccinationSchedule? Schedule { get; set; }
    public Animal? Animal { get; set; }
    public AnimalGroup? Group { get; set; }
}

public class HealthRecord : BaseEntity
{
    public int FarmId { get; set; }
    public int? AnimalId { get; set; }
    public int? GroupId { get; set; }
    public DateTime RecordDate { get; set; }
    public string RecordType { get; set; } = HealthRecordType.Examination;
    public string? Symptoms { get; set; }
    public string? Diagnosis { get; set; }
    public string? Treatment { get; set; }
    public string? VeterinarianName { get; set; }
    public decimal VeterinaryCost { get; set; }
    public DateTime? WithdrawalPeriodEnd { get; set; }
    public DateTime? FollowUpDate { get; set; }
    public string Status { get; set; } = HealthStatus.Open;
    public string? Notes { get; set; }
    public Farm? Farm { get; set; }
    public Animal? Animal { get; set; }
    public AnimalGroup? Group { get; set; }
}

public static class VaccinationStatus
{
    public const string Scheduled = "Scheduled";
    public const string Completed = "Completed";
    public const string Overdue = "Overdue";
    public const string Missed = "Missed";
    public const string Cancelled = "Cancelled";
}

public static class HealthRecordType
{
    public const string Examination = "Examination";
    public const string Treatment = "Treatment";
    public const string Surgery = "Surgery";
    public const string Illness = "Illness";
    public const string Injury = "Injury";
    public const string Quarantine = "Quarantine";
    public const string Death = "Death";
    public const string Other = "Other";
}

public static class HealthStatus
{
    public const string Open = "Open";
    public const string Resolved = "Resolved";
    public const string Monitoring = "Monitoring";
    public const string Referred = "Referred";
}