namespace SmartFarm.Api.Models;

public class FarmTask : BaseEntity
{
    public int FarmId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? AssignedToUserId { get; set; }
    public DateTime? DueDate { get; set; }
    public string Status { get; set; } = TaskStatus.Pending;
    public string Priority { get; set; } = TaskPriority.Medium;
    public string? Category { get; set; }
    public string? RelatedEntityType { get; set; }
    public int? RelatedEntityId { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? CompletedBy { get; set; }

    public Farm? Farm { get; set; }
    public ApplicationUser? AssignedTo { get; set; }
}

public class Notification : BaseEntity
{
    public int FarmId { get; set; }
    public string Type { get; set; } = NotificationType.Info;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;
    public string? TargetUserId { get; set; }
    public string? RelatedEntityType { get; set; }
    public int? RelatedEntityId { get; set; }
    public string? ActionUrl { get; set; }

    public Farm? Farm { get; set; }
}

public class AuditLog : BaseEntity
{
    public int FarmId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public int? EntityId { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string? IpAddress { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public Farm? Farm { get; set; }
}

public static class TaskStatus
{
    public const string Pending = "Pending";
    public const string InProgress = "InProgress";
    public const string Completed = "Completed";
    public const string Overdue = "Overdue";
    public const string Cancelled = "Cancelled";
}

public static class TaskPriority
{
    public const string Low = "Low";
    public const string Medium = "Medium";
    public const string High = "High";
    public const string Critical = "Critical";
}

public static class NotificationType
{
    public const string Info = "Info";
    public const string Warning = "Warning";
    public const string Alert = "Alert";
    public const string Reminder = "Reminder";
    public const string Success = "Success";
}
