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
    Task<(bool Success, string? Error, string? ResetLink, string? Token)> ForgotPasswordAsync(string email);
    Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordRequest request);
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

    public Task<(bool Success, string? Error, AuthResponse? Response)> RefreshTokenAsync(string refreshToken)
    {
        // In production: validate stored refresh token. Here we validate via JWT claims.
        // A full implementation stores refresh tokens in DB with expiry.
        return Task.FromResult<(bool, string?, AuthResponse?)>((false, "Use login to get a new token.", null));
    }

    public async Task<(bool Success, string? Error, string? ResetLink, string? Token)> ForgotPasswordAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            _logger.LogInformation("Password reset requested for non-existent email: {Email}", email);
            return (true, null, null, null); // don't reveal existence to avoid enumeration
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
    .btn {{ display: inline-block; background-color: #2e7d32; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 10px; box-shadow: 0 4px 14px rgba(46,125,50,0.35); }}
    .token-card {{ background-color: #f8faf9; border: 1px solid #d1fae5; border-radius: 10px; padding: 16px 20px; margin: 24px 0; }}
    .token-label {{ font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #047857; margin-bottom: 8px; }}
    .token-code {{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; word-break: break-all; color: #065f46; font-weight: 600; }}
    .divider {{ height: 1px; background-color: #f3f4f6; margin: 28px 0; }}
    .footer {{ background-color: #f9fafb; padding: 22px 32px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af; }}
  </style>
</head>
<body>
  <div class='container'>
    <div class='header'>
      <div class='brand'>🌾 SMART FARM</div>
      <div class='tagline'>Unified Farm & Livestock Management System</div>
    </div>
    <div class='body'>
      <div class='greeting'>Hello {recipientName},</div>
      <p>We received a request to reset your password for your Smart Farm account (<strong>{email}</strong>).</p>
      <div class='btn-container'>
        <a href='{resetLink}' class='btn' target='_blank'>Reset My Password</a>
      </div>
      <p style='font-size: 13px; color: #6b7280;'>If the button does not work directly, copy and paste this link into your browser:</p>
      <p style='font-size: 12px; word-break: break-all; color: #2e7d32;'><a href='{resetLink}' style='color: #2e7d32;'>{resetLink}</a></p>
      
      <div class='token-card'>
        <div class='token-label'>Manual Reset Token</div>
        <div class='token-code'>{token}</div>
      </div>
      
      <p style='font-size: 13px; color: #9ca3af; margin-top: 24px;'>If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
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
            _logger.LogWarning("Email delivery failed for password reset token for {Email}", email);
        }

        return (true, null, resetLink, token);
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
