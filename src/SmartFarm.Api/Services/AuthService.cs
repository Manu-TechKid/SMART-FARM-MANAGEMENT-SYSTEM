using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Memory;
using SmartFarm.Api.Data;
using SmartFarm.Api.DTOs;
using SmartFarm.Api.Models;

namespace SmartFarm.Api.Services;

public interface IAuthService
{
    Task<(bool Success, string? Error, AuthResponse? Response)> RegisterAsync(RegisterRequest request);
    Task<(bool Success, string? Error, AuthResponse? Response)> LoginAsync(LoginRequest request);
    Task<(bool Success, string? Error, AuthResponse? Response)> RefreshTokenAsync(string refreshToken);
    Task<(bool Success, string? Error, string? ResetLink, string? Token, string? Otp)> ForgotPasswordAsync(string email);
    Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordRequest request);
    Task<(bool Success, string? Error)> ResetPasswordWithOtpAsync(ResetPasswordWithOtpRequest request);
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
    private readonly IMemoryCache _cache;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        IJwtService jwtService,
        SmartFarmDbContext db,
        JwtSettings jwtSettings,
        IEmailService emailService,
        IConfiguration config,
        IMemoryCache cache,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _jwtService = jwtService;
        _db = db;
        _jwtSettings = jwtSettings;
        _emailService = emailService;
        _config = config;
        _cache = cache;
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
            user.Email,
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
            user.Email,
            user.FirstName,
            user.LastName,
            roles
        ));
    }

    public Task<(bool Success, string? Error, AuthResponse? Response)> RefreshTokenAsync(string refreshToken)
    {
        return Task.FromResult<(bool, string?, AuthResponse?)>((false, "Use login to get a new token.", null));
    }

    public async Task<(bool Success, string? Error, string? ResetLink, string? Token, string? Otp)> ForgotPasswordAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            _logger.LogInformation("Password reset requested for non-existent email: {Email}", email);
            return (true, null, null, null, null); // don't reveal existence to avoid enumeration
        }

        // Generate 6-digit OTP
        var otp = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
        var emailKey = email.Trim().ToLowerInvariant();
        _cache.Set($"reset_otp_{emailKey}", otp, TimeSpan.FromMinutes(15));

        // Generate standard Identity password reset token & cache it alongside OTP
        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        _cache.Set($"reset_token_{emailKey}", token, TimeSpan.FromMinutes(15));

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
    .otp-box {{ background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }}
    .otp-label {{ font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; color: #15803d; }}
    .otp-code {{ font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #166534; font-family: ui-monospace, Menlo, Consolas, monospace; margin: 10px 0; }}
    .otp-sub {{ font-size: 12px; color: #16a34a; font-weight: 600; }}
    .btn-container {{ text-align: center; margin: 28px 0; }}
    .btn {{ display: inline-block; background-color: #2e7d32; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 10px; box-shadow: 0 4px 14px rgba(46,125,50,0.35); }}
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

      <div class='otp-box'>
        <div class='otp-label'>Your 6-Digit Password Reset OTP</div>
        <div class='otp-code'>{otp}</div>
        <div class='otp-sub'>Expires in 15 minutes &bull; Enter this on the password reset screen</div>
      </div>

      <div class='btn-container'>
        <a href='{resetLink}' class='btn' target='_blank'>Or Click Here to Reset Instantly</a>
      </div>
      
      <p style='font-size: 13px; color: #9ca3af; margin-top: 24px;'>If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    </div>
    <div class='footer'>
      &copy; {DateTime.UtcNow.Year} Smart Farm Management System &bull; Secure AgriTech Infrastructure
    </div>
  </div>
</body>
</html>";

        var sent = await _emailService.SendEmailAsync(email, $"Your SmartFarm Password Reset Code: {otp}", html);
        if (!sent)
        {
            _logger.LogWarning("Email delivery failed for password reset token for {Email}", email);
        }

        return (true, null, resetLink, token, otp);
    }

    public async Task<(bool Success, string? Error)> ResetPasswordWithOtpAsync(ResetPasswordWithOtpRequest request)
    {
        var emailKey = request.Email.Trim().ToLowerInvariant();
        if (!_cache.TryGetValue($"reset_otp_{emailKey}", out string? cachedOtp) || cachedOtp != request.Otp.Trim())
        {
            return (false, "Invalid or expired 6-digit OTP code. Please request a new code.");
        }

        var user = await _userManager.FindByEmailAsync(request.Email.Trim());
        if (user == null)
        {
            return (false, "User account not found.");
        }

        // Get cached Identity token or generate fresh
        if (!_cache.TryGetValue($"reset_token_{emailKey}", out string? token) || string.IsNullOrWhiteSpace(token))
        {
            token = await _userManager.GeneratePasswordResetTokenAsync(user);
        }

        var result = await _userManager.ResetPasswordAsync(user, token, request.NewPassword);
        if (!result.Succeeded)
        {
            return (false, string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        _cache.Remove($"reset_otp_{emailKey}");
        _cache.Remove($"reset_token_{emailKey}");

        _logger.LogInformation("Password reset successfully via OTP for user: {Email}", request.Email);
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
