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
    Task<(bool Success, string? Error)> ForgotPasswordAsync(string email);
    Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordRequest request);
    Task<(bool Success, string? Error)> ChangePasswordAsync(string userId, ChangePasswordRequest request);
}

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtService _jwtService;
    private readonly SmartFarmDbContext _db;
    private readonly JwtSettings _jwtSettings;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        IJwtService jwtService,
        SmartFarmDbContext db,
        JwtSettings jwtSettings,
        IEmailService emailService,
        IConfiguration config,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _jwtService = jwtService;
        _db = db;
        _jwtSettings = jwtSettings;
        _emailService = emailService;
        _config = config;
        _logger = logger;
    }

    public async Task<(bool Success, string? Error, AuthResponse? Response)> RegisterAsync(RegisterRequest request)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing != null)
            return (false, "An account with this email already exists.", null);

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return (false, string.Join("; ", result.Errors.Select(e => e.Description)), null);

        await _userManager.AddToRoleAsync(user, FarmRole.Viewer);

        var roles = await _userManager.GetRolesAsync(user);
        var accessToken = _jwtService.GenerateAccessToken(user, roles);
        var refreshToken = _jwtService.GenerateRefreshToken();

        return (true, null, new AuthResponse(
            accessToken,
            refreshToken,
            user.Id,
            user.Email ?? string.Empty,
            user.FirstName,
            user.LastName,
            roles
        ));
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
        var accessToken = _jwtService.GenerateAccessToken(user, roles);
        var refreshToken = _jwtService.GenerateRefreshToken();

        return (true, null, new AuthResponse(
            accessToken,
            refreshToken,
            user.Id,
            user.Email ?? string.Empty,
            user.FirstName,
            user.LastName,
            roles
        ));
    }

    public Task<(bool Success, string? Error, AuthResponse? Response)> RefreshTokenAsync(string refreshToken)
    {
        return Task.FromResult<(bool, string?, AuthResponse?)>((false, "Use login to get a new token.", null));
    }

    public async Task<(bool Success, string? Error)> ForgotPasswordAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            _logger.LogInformation("Password reset requested for non-existent email: {Email}", email);
            return (true, null); // don't reveal user existence
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var baseUrl = _config["Resend:AppBaseUrl"]?.TrimEnd('/')
            ?? Environment.GetEnvironmentVariable("Resend__AppBaseUrl")
            ?? "https://bett-smartfarm.duckdns.org";

        var resetLink = $"{baseUrl}/login?action=reset&email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
        var recipientName = !string.IsNullOrWhiteSpace(user.FirstName)
            ? $"{user.FirstName} {user.LastName}".Trim()
            : user.UserName ?? "Farmer";

        var html = $@"<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>Reset Your Smart Farm Password</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f6f4; margin: 0; padding: 24px; color: #1f2937; }}
    .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }}
    .header {{ background: linear-gradient(135deg, #154726 0%, #2e7d32 100%); padding: 36px 28px; text-align: center; color: #ffffff; }}
    .brand {{ font-size: 24px; font-weight: 800; letter-spacing: 0.5px; margin: 0; }}
    .tagline {{ font-size: 13px; color: #c8e6c9; margin: 6px 0 0; letter-spacing: 0.3px; }}
    .body {{ padding: 36px 32px; }}
    .greeting {{ font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 14px; }}
    p {{ font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 18px; }}
    .btn-container {{ text-align: center; margin: 32px 0; }}
    .btn {{ display: inline-block; background-color: #2e7d32; color: #ffffff !important; font-size: 16px; font-weight: 700; text-decoration: none; padding: 15px 36px; border-radius: 10px; box-shadow: 0 4px 14px rgba(46,125,50,0.35); }}
    .link-box {{ background-color: #f8faf9; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; word-break: break-all; font-size: 13px; color: #2e7d32; margin: 20px 0; }}
    .footer {{ background-color: #f9fafb; padding: 22px 32px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af; }}
  </style>
</head>
<body>
  <div class='container'>
    <div class='header'>
      <div class='brand'>🌾 SMART FARM</div>
      <div class='tagline'>Unified Farm &amp; Livestock Management System</div>
    </div>
    <div class='body'>
      <div class='greeting'>Hello {recipientName},</div>
      <p>We received a request to reset your password for your Smart Farm account (<strong>{email}</strong>).</p>

      <p>Click the button below to set a new password for your account:</p>

      <div class='btn-container'>
        <a href='{resetLink}' class='btn' target='_blank'>Reset My Password</a>
      </div>

      <p style='font-size: 13px; color: #6b7280; margin-top: 24px;'>If the button above does not work, copy and paste this link into your web browser:</p>
      <div class='link-box'>
        <a href='{resetLink}' style='color: #2e7d32; text-decoration: underline;'>{resetLink}</a>
      </div>
      
      <p style='font-size: 13px; color: #9ca3af; margin-top: 24px;'>This link will expire in 24 hours. If you did not request a password reset, you can safely ignore this email.</p>
    </div>
    <div class='footer'>
      &copy; {DateTime.UtcNow.Year} Smart Farm Management System &bull; Secure AgriTech Infrastructure
    </div>
  </div>
</body>
</html>";

        var sent = await _emailService.SendEmailAsync(email, "Reset Your Smart Farm Password", html);
        if (!sent)
        {
            _logger.LogWarning("Email delivery failed for password reset link for {Email}", email);
        }

        return (true, null);
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

    public async Task<(bool Success, string? Error)> ChangePasswordAsync(string userId, ChangePasswordRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return (false, "User not found.");

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            return (false, string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        _logger.LogInformation("User {UserId} ({Email}) changed password successfully", user.Id, user.Email);
        return (true, null);
    }
}
