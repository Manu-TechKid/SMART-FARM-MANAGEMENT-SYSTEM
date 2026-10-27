using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFarm.Api.DTOs;
using SmartFarm.Api.Services;

namespace SmartFarm.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var (success, error, response) = await _auth.RegisterAsync(request);
        if (!success) return BadRequest(new { error });
        return Ok(response);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var (success, error, response) = await _auth.LoginAsync(request);
        if (!success) return Unauthorized(new { error });
        return Ok(response);
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var (success, error, resetLink, token, otp) = await _auth.ForgotPasswordAsync(request.Email);
        return Ok(new
        {
            message = "If the email is registered, password reset instructions and OTP have been dispatched.",
            resetLink,
            token,
            otp
        });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var (success, error) = await _auth.ResetPasswordAsync(request);
        if (!success) return BadRequest(new { error });
        return Ok(new { message = "Password reset successful." });
    }

    [HttpPost("reset-password-otp")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPasswordWithOtp([FromBody] ResetPasswordWithOtpRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var (success, error) = await _auth.ResetPasswordWithOtpAsync(request);
        if (!success) return BadRequest(new { error });
        return Ok(new { message = "Password reset successfully via OTP. You can now log in with your new password." });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var (success, error) = await _auth.ChangePasswordAsync(userId, request);
        if (!success) return BadRequest(new { error });
        return Ok(new { message = "Password changed successfully." });
    }
}
