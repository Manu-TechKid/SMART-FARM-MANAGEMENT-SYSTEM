using Microsoft.AspNetCore.Identity;
using SmartFarm.Api.Models;

namespace SmartFarm.Api.Data;

public static class DbSeeder
{
    public static async System.Threading.Tasks.Task SeedRolesAsync(RoleManager<IdentityRole> roleManager)
    {
        var roles = new[]
        {
            FarmRole.SystemAdmin,
            FarmRole.FarmManager,
            FarmRole.LivestockOfficer,
            FarmRole.VeterinaryOfficer,
            FarmRole.ProductionOfficer,
            FarmRole.Storekeeper,
            FarmRole.DeliveryOfficer,
            FarmRole.Accountant,
            FarmRole.Viewer
        };

        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }
    }
}
