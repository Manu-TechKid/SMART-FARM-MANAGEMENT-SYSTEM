using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using SmartFarm.Api.Data;
using SmartFarm.Api.DTOs;
using SmartFarm.Api.Models;

namespace SmartFarm.Api.Services;

public interface IAuthService
{
    Task<(bool Success, string? Error, AuthResponse? Response)> RegisterAsync(RegisterRequest request);
    Task<(bool Success, string? Error, AuthResponse? Response)> LoginAsync(LoginRequest request);
    Task<(bool Success, string? Error, AuthResponse? Response)> RefreshTokenAsync(string refreshToken);
    Task<bool> ForgotPasswordAsync(string email);
    Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordRequest request);
}

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtService _jwtService;
    private readonly SmartFarmDbContext _db;
    private readonly JwtSettings _jwtSettings;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        IJwtService jwtService,
        SmartFarmDbContext db,
        JwtSettings jwtSettings)
    {
        _userManager = userManager;
        _jwtService = jwtService;
        _db = db;
        _jwtSettings = jwtSettings;
    }

    public async Task<(bool Success, string? Error, AuthResponse? Response)> RegisterAsync(RegisterRequest request)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing != null)
            return (false, "Email already registered.", null);

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return (false, string.Join("; ", result.Errors.Select(e => e.Description)), null);

        await _userManager.AddToRoleAsync(user, FarmRole.Viewer);

        var roles = await _userManager.GetRolesAsync(user);
        var token = _jwtService.GenerateAccessToken(user, roles);
        var refresh = _jwtService.GenerateRefreshToken();

        user.SecurityStamp = await _userManager.GetSecurityStampAsync(user); // store refresh via SecurityStamp extension in production
        return (true, null, new AuthResponse(token, refresh, user.Id, user.Email!, user.FirstName, user.LastName, roles));
    }

    public async Task<(bool Success, string? Error, AuthResponse? Response)> LoginAsync(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null || !user.IsActive)
            return (false, "Invalid credentials.", null);

        var valid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!valid)
            return (false, "Invalid credentials.", null);

        var roles = await _userManager.GetRolesAsync(user);
        var token = _jwtService.GenerateAccessToken(user, roles);
        var refresh = _jwtService.GenerateRefreshToken();

        return (true, null, new AuthResponse(token, refresh, user.Id, user.Email!, user.FirstName, user.LastName, roles));
    }

    public async Task<(bool Success, string? Error, AuthResponse? Response)> RefreshTokenAsync(string refreshToken)
    {
        // In production: validate stored refresh token. Here we validate via JWT claims.
        // A full implementation stores refresh tokens in DB with expiry.
        return (false, "Use login to get a new token.", null);
    }

    public async Task<bool> ForgotPasswordAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null) return true; // don't reveal existence

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        // TODO: send email with token (integrate email service)
        return true;
    }

    public async Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null) return (false, "Invalid request.");

        var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
            return (false, string.Join("; ", result.Errors.Select(e => e.Description)));

        return (true, null);
    }
}
