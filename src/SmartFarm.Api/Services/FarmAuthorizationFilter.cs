using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using SmartFarm.Api.Models;

namespace SmartFarm.Api.Services;

/// <summary>
/// Enforces farm-level role permissions on all farm-scoped routes (/api/farms/{farmId}/...).
/// Users with the Viewer role are permitted to execute read-only (GET/HEAD/OPTIONS) requests
/// but are forbidden from mutating farm data (POST/PUT/PATCH/DELETE).
/// </summary>
public class FarmAuthorizationFilter : IAsyncActionFilter
{
    private readonly IFarmService _farmService;

    public FarmAuthorizationFilter(IFarmService farmService)
    {
        _farmService = farmService;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var method = context.HttpContext.Request.Method;
        var isMutating = HttpMethods.IsPost(method) || HttpMethods.IsPut(method) ||
                         HttpMethods.IsPatch(method) || HttpMethods.IsDelete(method);

        if (isMutating && context.RouteData.Values.TryGetValue("farmId", out var rawFarmId) &&
            RouteValueExtensions.TryNonEmptyFarmId(rawFarmId, out var farmId))
        {
            var userId = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(userId))
            {
                var role = await _farmService.GetUserFarmRoleAsync(farmId, userId);
                if (role == null || string.Equals(role, FarmRole.Viewer, StringComparison.OrdinalIgnoreCase))
                {
                    context.Result = new ObjectResult(new
                    {
                        message = "Insufficient farm permissions. Viewer role has read-only access."
                    })
                    {
                        StatusCode = StatusCodes.Status403Forbidden
                    };
                    return;
                }
            }
        }

        await next();
    }
}

internal static class RouteValueExtensions
{
    public static bool TryNonEmptyFarmId(object? rawValue, out int farmId)
    {
        farmId = 0;
        return rawValue != null && int.TryParse(rawValue.ToString(), out farmId) && farmId > 0;
    }
}
