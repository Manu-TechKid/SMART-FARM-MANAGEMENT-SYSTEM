using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SmartFarm.Api.Services;

public class ResendEmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<ResendEmailService> _logger;

    public ResendEmailService(
        HttpClient httpClient,
        IConfiguration config,
        ILogger<ResendEmailService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    private class ResendEmailPayload
    {
        [JsonPropertyName("from")]
        public string From { get; set; } = string.Empty;

        [JsonPropertyName("to")]
        public List<string> To { get; set; } = new();

        [JsonPropertyName("subject")]
        public string Subject { get; set; } = string.Empty;

        [JsonPropertyName("html")]
        public string Html { get; set; } = string.Empty;
    }

    public async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlContent)
    {
        var apiKey = _config["Resend:ApiKey"]
            ?? Environment.GetEnvironmentVariable("Resend__ApiKey")
            ?? Environment.GetEnvironmentVariable("RESEND_API_KEY");

        var fromEmail = _config["Resend:FromEmail"]
            ?? Environment.GetEnvironmentVariable("Resend__FromEmail")
            ?? "SmartFarm <onboarding@resend.dev>";

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning(
                "Resend API key is not configured. Email to {ToEmail} with subject '{Subject}' was not sent. " +
                "Configure 'Resend:ApiKey' or set 'Resend__ApiKey' environment variable.",
                toEmail, subject);
            return false;
        }

        try
        {
            var payload = new ResendEmailPayload
            {
                From = fromEmail,
                To = new List<string> { toEmail },
                Subject = subject,
                Html = htmlContent
            };

            var json = JsonSerializer.Serialize(payload);
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };

            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey.Trim());

            var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "Resend email dispatch to {ToEmail} failed with status {StatusCode}: {Response}",
                    toEmail, response.StatusCode, responseBody);

                // Handle Resend Free Tier restriction: can only send to account owner's email
                var match = System.Text.RegularExpressions.Regex.Match(responseBody, @"to your own email address \(([^)]+)\)");
                if (match.Success)
                {
                    var ownerEmail = match.Groups[1].Value.Trim();
                    _logger.LogInformation("Falling back to Resend account owner email: {OwnerEmail}", ownerEmail);

                    var fallbackHtml = $@"<div style='background: #fff3cd; color: #856404; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; border: 1px solid #ffeeba;'>
                        <strong>Resend Testing Mode Notice:</strong> This password reset was requested for <strong>{toEmail}</strong>, but was forwarded to your verified Resend account (<strong>{ownerEmail}</strong>) because a custom domain has not yet been verified at resend.com.
                    </div>" + htmlContent;

                    var retryPayload = new ResendEmailPayload
                    {
                        From = fromEmail,
                        To = new List<string> { ownerEmail },
                        Subject = $"[For: {toEmail}] {subject}",
                        Html = fallbackHtml
                    };

                    using var retryRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
                    {
                        Content = new StringContent(JsonSerializer.Serialize(retryPayload), Encoding.UTF8, "application/json")
                    };
                    retryRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey.Trim());

                    var retryResponse = await _httpClient.SendAsync(retryRequest);
                    if (retryResponse.IsSuccessStatusCode)
                    {
                        _logger.LogInformation("Successfully sent testing email to Resend account owner: {OwnerEmail}", ownerEmail);
                        return true;
                    }
                }

                return false;
            }

            _logger.LogInformation("Successfully dispatched email to {ToEmail} via Resend: {Response}", toEmail, responseBody);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected exception dispatching email to {ToEmail} via Resend", toEmail);
            return false;
        }
    }
}
