using Microsoft.AspNetCore.Identity;

namespace SmartFarm.Api.Models;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<FarmUser> FarmUsers { get; set; } = new List<FarmUser>();
    public ICollection<FarmTask> AssignedTasks { get; set; } = new List<FarmTask>();
}
