namespace SmartFarm.Api.Models;

public class Beehive : BaseEntity
{
    public int FarmId { get; set; }
    public string HiveCode { get; set; } = string.Empty;
    public int? LocationId { get; set; }
    public string? ApiaryName { get; set; }
    public string HiveType { get; set; } = "Langstroth";
    public string ColonyStatus { get; set; } = "Active";
    public string QueenStatus { get; set; } = "Present";
    public DateTime? LastInspectionDate { get; set; }
    public DateTime? QueenIntroducedDate { get; set; }
    public string? Notes { get; set; }

    public Farm? Farm { get; set; }
    public FarmLocation? Location { get; set; }
    public ICollection<HiveInspection> Inspections { get; set; } = new List<HiveInspection>();
    public ICollection<ProductionRecord> ProductionRecords { get; set; } = new List<ProductionRecord>();
}

public class HiveInspection : BaseEntity
{
    public int BeehiveId { get; set; }
    public DateTime InspectedAt { get; set; }
    public string InspectedBy { get; set; } = string.Empty;
    public bool QueenSeen { get; set; }
    public int HealthScore { get; set; } = 5; // 1-10
    public string? ColonyTemperament { get; set; }
    public bool HasEggs { get; set; }
    public bool HasLarvae { get; set; }
    public bool HasCappedBrood { get; set; }
    public int? FramesOfBees { get; set; }
    public int? FramesOfBrood { get; set; }
    public int? FramesOfHoney { get; set; }
    public string? PestObservations { get; set; }
    public string? DiseaseObservations { get; set; }
    public string? ActionTaken { get; set; }
    public DateTime? NextInspectionDue { get; set; }
    public string? Notes { get; set; }

    public Beehive? Beehive { get; set; }
}

public static class HiveType
{
    public const string Langstroth = "Langstroth";
    public const string TopBar = "TopBar";
    public const string Warre = "Warre";
    public const string Log = "Log";
    public const string Other = "Other";
}

public static class ColonyStatus
{
    public const string Active = "Active";
    public const string Weak = "Weak";
    public const string Dead = "Dead";
    public const string Absconded = "Absconded";
    public const string Swarm = "Swarm";
    public const string Quarantine = "Quarantine";
}

public static class QueenStatus
{
    public const string Present = "Present";
    public const string Missing = "Missing";
    public const string Laying = "Laying";
    public const string NotSeen = "NotSeen";
    public const string Replaced = "Replaced";
}
