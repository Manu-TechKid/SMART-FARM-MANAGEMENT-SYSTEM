using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFarm.Api.Data;
using SmartFarm.Api.Models;
using SmartFarm.Api.Services;

namespace SmartFarm.Api.Controllers;

[ApiController]
[Route("api/farms/{farmId:int}/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly SmartFarmDbContext _db;
    private readonly IFarmService _farmService;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public ReportsController(SmartFarmDbContext db, IFarmService farmService)
    {
        _db = db;
        _farmService = farmService;
    }

    [HttpGet("{reportType}")]
    public async Task<IActionResult> GetReport(
        int farmId,
        string reportType,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int? locationId,
        [FromQuery] string? species)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        var (title, columns, rows, summary) = await BuildReportDataAsync(farmId, reportType, from, to, locationId, species);
        return Ok(new { ReportType = reportType, Title = title, Columns = columns, Rows = rows, Summary = summary });
    }

    [HttpGet("{reportType}/export")]
    public async Task<IActionResult> ExportReport(
        int farmId,
        string reportType,
        [FromQuery] string format = "pdf",
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int? locationId = null,
        [FromQuery] string? species = null)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        var farm = await _db.Farms.FirstOrDefaultAsync(f => f.Id == farmId);
        var farmName = farm?.Name ?? $"Farm #{farmId}";
        var (title, columns, rows, summary) = await BuildReportDataAsync(farmId, reportType, from, to, locationId, species);

        var safeName = $"{reportType}-report-{DateTime.UtcNow:yyyyMMdd}";
        if (string.Equals(format, "excel", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(format, "xlsx", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(format, "xls", StringComparison.OrdinalIgnoreCase))
        {
            var xmlBytes = BuildExcelXml(farmName, title, columns, rows, summary);
            return File(xmlBytes, "application/vnd.ms-excel", $"{safeName}.xls");
        }

        var pdfBytes = BuildSimplePdf(farmName, title, columns, rows, summary);
        return File(pdfBytes, "application/pdf", $"{safeName}.pdf");
    }

    private async Task<(string Title, string[] Columns, List<string[]> Rows, Dictionary<string, string> Summary)> BuildReportDataAsync(
        int farmId, string reportType, DateTime? from, DateTime? to, int? locationId, string? species)
    {
        var start = from ?? DateTime.UtcNow.Date.AddDays(-30);
        var end = (to ?? DateTime.UtcNow.Date).AddDays(1).AddTicks(-1);
        var key = reportType.ToLowerInvariant();

        switch (key)
        {
            case "production":
            {
                var q = _db.ProductionRecords
                    .Include(p => p.Animal).Include(p => p.Group).Include(p => p.Beehive)
                    .Where(p => p.FarmId == farmId && p.ProductionDate >= start && p.ProductionDate <= end);
                if (locationId.HasValue) q = q.Where(p => p.LocationId == locationId);

                var list = await q.OrderByDescending(p => p.ProductionDate).ToListAsync();
                var rows = list.Select(p => new[]
                {
                    p.ProductionDate.ToString("yyyy-MM-dd"),
                    p.ProductType,
                    p.Animal?.TagId ?? p.Group?.Name ?? p.Beehive?.HiveCode ?? "Farm",
                    $"{p.Quantity:N2} {p.Unit}",
                    $"{p.RejectedQuantity:N2} {p.Unit}",
                    $"{(p.Quantity - p.RejectedQuantity):N2} {p.Unit}",
                    p.QualityStatus,
                    p.BatchCode ?? "-"
                }).ToList();

                var summary = new Dictionary<string, string>
                {
                    ["Total Records"] = list.Count.ToString(),
                    ["Gross Output"] = $"{list.Sum(x => x.Quantity):N2}",
                    ["Rejected Output"] = $"{list.Sum(x => x.RejectedQuantity):N2}",
                    ["Net Accepted Output"] = $"{list.Sum(x => x.Quantity - x.RejectedQuantity):N2}"
                };
                return ("Production Report", new[] { "Date", "Product", "Source", "Gross Qty", "Rejected", "Net Qty", "Quality", "Batch" }, rows, summary);
            }

            case "population":
            case "livestock":
            {
                var q = _db.Animals.Include(a => a.Location).Where(a => a.FarmId == farmId);
                if (locationId.HasValue) q = q.Where(a => a.LocationId == locationId);
                if (!string.IsNullOrWhiteSpace(species)) q = q.Where(a => a.Species == species);

                var list = await q.OrderBy(a => a.Species).ThenBy(a => a.TagId).ToListAsync();
                var groups = await _db.AnimalGroups.Where(g => g.FarmId == farmId).ToListAsync();

                var rows = list.Select(a => new[]
                {
                    a.TagId,
                    a.Name ?? "-",
                    a.Species,
                    a.Breed ?? "-",
                    a.Sex,
                    a.Status,
                    a.CurrentWeightKg?.ToString("N1") ?? "-",
                    a.Location?.Name ?? "-"
                }).ToList();

                var summary = new Dictionary<string, string>
                {
                    ["Individual Animals"] = list.Count.ToString(),
                    ["Active Animals"] = list.Count(a => a.Status == AnimalStatus.Active).ToString(),
                    ["Flock/Group Headcount"] = groups.Sum(g => g.Count).ToString(),
                    ["Total Combined Livestock"] = (list.Count(a => a.Status == AnimalStatus.Active) + groups.Sum(g => g.Count)).ToString()
                };
                return ("Animal Population Report", new[] { "Tag ID", "Name", "Species", "Breed", "Sex", "Status", "Weight (kg)", "Location" }, rows, summary);
            }

            case "mortality":
            {
                var q = _db.AnimalEvents
                    .Include(e => e.Animal)
                    .Where(e => e.Animal != null && e.Animal.FarmId == farmId && e.EventType == EventType.Death &&
                                e.EventDate >= start && e.EventDate <= end);
                if (!string.IsNullOrWhiteSpace(species)) q = q.Where(e => e.Animal!.Species == species);

                var events = await q.OrderByDescending(e => e.EventDate).ToListAsync();
                var totalPop = await _db.Animals.CountAsync(a => a.FarmId == farmId);
                var rate = totalPop > 0 ? (decimal)events.Count / totalPop * 100m : 0m;

                var rows = events.Select(e => new[]
                {
                    e.EventDate.ToString("yyyy-MM-dd"),
                    e.Animal?.TagId ?? "-",
                    e.Animal?.Species ?? "-",
                    e.Animal?.Breed ?? "-",
                    e.Description ?? "Recorded death"
                }).ToList();

                var summary = new Dictionary<string, string>
                {
                    ["Recorded Deaths"] = events.Count.ToString(),
                    ["Total Registered Herd"] = totalPop.ToString(),
                    ["Mortality Rate"] = $"{rate:N2}%"
                };
                return ("Mortality Report", new[] { "Date", "Tag ID", "Species", "Breed", "Cause / Notes" }, rows, summary);
            }

            case "vaccination":
            {
                var q = _db.VaccinationRecords
                    .Include(v => v.Animal).Include(v => v.Group)
                    .Where(v => v.FarmId == farmId);
                if (!string.IsNullOrWhiteSpace(species)) q = q.Where(v => v.Species == species);

                var list = await q.OrderByDescending(v => v.ScheduledDate).ToListAsync();
                var completed = list.Count(v => v.Status == VaccinationStatus.Completed);
                var compliance = list.Count > 0 ? (decimal)completed / list.Count * 100m : 100m;

                var rows = list.Select(v => new[]
                {
                    v.VaccineName,
                    v.Species,
                    v.Animal?.TagId ?? v.Group?.Name ?? "-",
                    v.ScheduledDate?.ToString("yyyy-MM-dd") ?? "-",
                    v.DateAdministered?.ToString("yyyy-MM-dd") ?? "-",
                    v.Status,
                    v.Administrator ?? "-"
                }).ToList();

                var summary = new Dictionary<string, string>
                {
                    ["Total Scheduled"] = list.Count.ToString(),
                    ["Completed"] = completed.ToString(),
                    ["Overdue / Missed"] = list.Count(v => v.Status == VaccinationStatus.Overdue || v.Status == VaccinationStatus.Missed).ToString(),
                    ["Compliance Rate"] = $"{compliance:N1}%"
                };
                return ("Vaccination Compliance Report", new[] { "Vaccine", "Species", "Target", "Scheduled", "Administered", "Status", "Administrator" }, rows, summary);
            }

            case "deliveries":
            {
                var list = await _db.Deliveries
                    .Include(d => d.Customer).Include(d => d.Items)
                    .Where(d => d.FarmId == farmId && d.CreatedAt >= start && d.CreatedAt <= end)
                    .OrderByDescending(d => d.CreatedAt)
                    .ToListAsync();

                var rows = list.Select(d => new[]
                {
                    d.DeliveryNumber,
                    d.Customer?.Name ?? "-",
                    d.Status,
                    d.DispatchDate?.ToString("yyyy-MM-dd") ?? "-",
                    d.ActualArrival?.ToString("yyyy-MM-dd") ?? "-",
                    d.Items.Sum(i => i.QuantityDispatched).ToString("N2"),
                    d.Items.Sum(i => i.QuantityReceived).ToString("N2"),
                    d.DriverName ?? "-"
                }).ToList();

                var summary = new Dictionary<string, string>
                {
                    ["Total Deliveries"] = list.Count.ToString(),
                    ["Delivered"] = list.Count(d => d.Status == DeliveryStatus.Delivered).ToString(),
                    ["Dispatched / Pending"] = list.Count(d => d.Status == DeliveryStatus.Dispatched || d.Status == DeliveryStatus.Pending).ToString(),
                    ["Total Dispatched Qty"] = list.SelectMany(d => d.Items).Sum(i => i.QuantityDispatched).ToString("N2")
                };
                return ("Delivery & Distribution Report", new[] { "Delivery No", "Customer", "Status", "Dispatched", "Arrived", "Qty Sent", "Qty Received", "Driver" }, rows, summary);
            }

            case "inventory":
            {
                var list = await _db.InventoryItems
                    .Where(i => i.FarmId == farmId && i.IsActive)
                    .OrderBy(i => i.Category).ThenBy(i => i.Name)
                    .ToListAsync();

                var rows = list.Select(i => new[]
                {
                    i.Name,
                    i.Category,
                    $"{i.CurrentStock:N2} {i.Unit}",
                    $"{i.MinimumStock:N2} {i.Unit}",
                    i.UnitCost?.ToString("N2") ?? "-",
                    ((i.UnitCost ?? 0) * i.CurrentStock).ToString("N2"),
                    i.ExpiryDate?.ToString("yyyy-MM-dd") ?? "-",
                    i.CurrentStock <= i.MinimumStock ? "LOW STOCK" : "OK"
                }).ToList();

                var totalVal = list.Sum(i => (i.UnitCost ?? 0) * i.CurrentStock);
                var summary = new Dictionary<string, string>
                {
                    ["Total SKU Items"] = list.Count.ToString(),
                    ["Low Stock Items"] = list.Count(i => i.CurrentStock <= i.MinimumStock).ToString(),
                    ["Total Stock Valuation"] = totalVal.ToString("N2")
                };
                return ("Inventory & Feed Report", new[] { "Item", "Category", "Current Stock", "Min Threshold", "Unit Cost", "Total Value", "Expiry", "Alert" }, rows, summary);
            }

            case "sales":
            {
                var list = await _db.Invoices
                    .Include(i => i.SalesOrder).ThenInclude(o => o!.Customer)
                    .Where(i => i.FarmId == farmId && i.InvoiceDate >= start && i.InvoiceDate <= end)
                    .OrderByDescending(i => i.InvoiceDate)
                    .ToListAsync();

                var rows = list.Select(i => new[]
                {
                    i.InvoiceNumber,
                    i.InvoiceDate.ToString("yyyy-MM-dd"),
                    i.SalesOrder?.Customer?.Name ?? "-",
                    i.Amount.ToString("N2"),
                    i.PaidAmount.ToString("N2"),
                    (i.Amount - i.PaidAmount).ToString("N2"),
                    i.Status
                }).ToList();

                var summary = new Dictionary<string, string>
                {
                    ["Invoices Issued"] = list.Count.ToString(),
                    ["Total Invoiced"] = list.Sum(i => i.Amount).ToString("N2"),
                    ["Total Collected"] = list.Sum(i => i.PaidAmount).ToString("N2"),
                    ["Outstanding Balance"] = list.Sum(i => i.Amount - i.PaidAmount).ToString("N2")
                };
                return ("Sales & Receivables Report", new[] { "Invoice No", "Date", "Customer", "Amount", "Paid", "Balance", "Status" }, rows, summary);
            }

            case "expenses":
            {
                var list = await _db.Expenses
                    .Where(e => e.FarmId == farmId && e.ExpenseDate >= start && e.ExpenseDate <= end)
                    .OrderByDescending(e => e.ExpenseDate)
                    .ToListAsync();

                var vetCosts = await _db.HealthRecords
                    .Where(h => h.FarmId == farmId && h.RecordDate >= start && h.RecordDate <= end && h.VeterinaryCost > 0)
                    .ToListAsync();

                var rows = list.Select(e => new[]
                {
                    e.ExpenseDate.ToString("yyyy-MM-dd"),
                    e.Category,
                    e.Description,
                    e.Reference ?? "-",
                    e.Amount.ToString("N2")
                }).Concat(vetCosts.Select(v => new[]
                {
                    v.RecordDate.ToString("yyyy-MM-dd"),
                    "Veterinary (Health Record)",
                    v.Diagnosis ?? v.RecordType,
                    v.VeterinarianName ?? "-",
                    v.VeterinaryCost.ToString("N2")
                })).ToList();

                var totalExp = list.Sum(e => e.Amount) + vetCosts.Sum(v => v.VeterinaryCost);
                var summary = new Dictionary<string, string>
                {
                    ["Expense Entries"] = rows.Count.ToString(),
                    ["Operating Expenses"] = list.Sum(e => e.Amount).ToString("N2"),
                    ["Veterinary Treatment Costs"] = vetCosts.Sum(v => v.VeterinaryCost).ToString("N2"),
                    ["Total Combined Expenses"] = totalExp.ToString("N2")
                };
                return ("Expense Breakdown Report", new[] { "Date", "Category", "Description", "Reference", "Amount" }, rows, summary);
            }

            default: // profitability
            {
                var invoiced = await _db.Invoices
                    .Where(i => i.FarmId == farmId && i.InvoiceDate >= start && i.InvoiceDate <= end && i.Status != InvoiceStatus.Voided)
                    .SumAsync(i => (decimal?)i.Amount) ?? 0;

                var cashCollected = await _db.Payments
                    .Where(p => p.FarmId == farmId && p.PaidAt >= start && p.PaidAt <= end)
                    .SumAsync(p => (decimal?)p.Amount) ?? 0;

                var expensesByCat = await _db.Expenses
                    .Where(e => e.FarmId == farmId && e.ExpenseDate >= start && e.ExpenseDate <= end)
                    .GroupBy(e => e.Category)
                    .Select(g => new { Category = g.Key, Total = g.Sum(x => x.Amount) })
                    .ToListAsync();

                var vetCost = await _db.HealthRecords
                    .Where(h => h.FarmId == farmId && h.RecordDate >= start && h.RecordDate <= end)
                    .SumAsync(h => (decimal?)h.VeterinaryCost) ?? 0;

                var totalExpenses = expensesByCat.Sum(x => x.Total) + vetCost;
                var revBasis = invoiced > 0 ? invoiced : cashCollected;
                var netProfit = revBasis - totalExpenses;
                var netCashFlow = cashCollected - totalExpenses;

                var rows = new List<string[]>
                {
                    new[] { "Revenue (Accrual / Invoiced)", "Income", invoiced.ToString("N2") },
                    new[] { "Cash Receipts Collected", "Cash Flow", cashCollected.ToString("N2") }
                };
                rows.AddRange(expensesByCat.Select(c => new[] { $"Expense: {c.Category}", "Operating Cost", (-c.Total).ToString("N2") }));
                if (vetCost > 0)
                    rows.Add(new[] { "Veterinary Clinical Costs", "Operating Cost", (-vetCost).ToString("N2") });
                rows.Add(new[] { "Net Operating Profit (Accrual)", "Profitability", netProfit.ToString("N2") });
                rows.Add(new[] { "Net Cash Flow (Cash Basis)", "Cash Flow", netCashFlow.ToString("N2") });

                var summary = new Dictionary<string, string>
                {
                    ["Invoiced Revenue"] = invoiced.ToString("N2"),
                    ["Cash Collected"] = cashCollected.ToString("N2"),
                    ["Total Expenses"] = totalExpenses.ToString("N2"),
                    ["Net Operating Profit"] = netProfit.ToString("N2"),
                    ["Net Cash Flow"] = netCashFlow.ToString("N2")
                };
                return ("Profitability & Cash Flow Report", new[] { "Line Item", "Classification", "Amount" }, rows, summary);
            }
        }
    }

    private static byte[] BuildExcelXml(string farmName, string title, string[] columns, List<string[]> rows, Dictionary<string, string> summary)
    {
        static string Esc(string? s) => System.Security.SecurityElement.Escape(s ?? "") ?? "";
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<?mso-application progid=\"Excel.Sheet\"?>");
        sb.AppendLine("<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">");
        sb.AppendLine("<Worksheet ss:Name=\"Report\"><Table>");
        sb.AppendLine($"<Row><Cell><Data ss:Type=\"String\">{Esc(farmName)} - {Esc(title)}</Data></Cell></Row>");
        sb.AppendLine($"<Row><Cell><Data ss:Type=\"String\">Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC</Data></Cell></Row>");
        sb.AppendLine("<Row/>");

        foreach (var kv in summary)
            sb.AppendLine($"<Row><Cell><Data ss:Type=\"String\">{Esc(kv.Key)}</Data></Cell><Cell><Data ss:Type=\"String\">{Esc(kv.Value)}</Data></Cell></Row>");

        sb.AppendLine("<Row/>");
        sb.Append("<Row>");
        foreach (var col in columns)
            sb.Append($"<Cell><Data ss:Type=\"String\">{Esc(col)}</Data></Cell>");
        sb.AppendLine("</Row>");

        foreach (var row in rows)
        {
            sb.Append("<Row>");
            foreach (var cell in row)
                sb.Append($"<Cell><Data ss:Type=\"String\">{Esc(cell)}</Data></Cell>");
            sb.AppendLine("</Row>");
        }

        sb.AppendLine("</Table></Worksheet></Workbook>");
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static byte[] BuildSimplePdf(string farmName, string title, string[] columns, List<string[]> rows, Dictionary<string, string> summary)
    {
        static string EscPdf(string s) => s.Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)");

        var lines = new List<string>
        {
            $"{farmName} - {title}",
            $"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC",
            new string('-', 95)
        };
        foreach (var kv in summary)
            lines.Add($"{kv.Key}: {kv.Value}");
        lines.Add(new string('-', 95));
        lines.Add(string.Join(" | ", columns));
        lines.Add(new string('-', 95));
        foreach (var r in rows.Take(45))
            lines.Add(string.Join(" | ", r));

        var contentSb = new StringBuilder();
        contentSb.AppendLine("BT");
        contentSb.AppendLine("/F1 9 Tf");
        int y = 800;
        foreach (var line in lines)
        {
            var clipped = line.Length > 105 ? line[..105] : line;
            contentSb.AppendLine($"1 0 0 1 36 {y} Tm ({EscPdf(clipped)}) Tj");
            y -= 14;
            if (y < 40) break;
        }
        contentSb.AppendLine("ET");
        var streamBytes = Encoding.ASCII.GetBytes(contentSb.ToString());

        using var ms = new MemoryStream();
        void WriteAscii(string s) => ms.Write(Encoding.ASCII.GetBytes(s));

        WriteAscii("%PDF-1.4\n");
        var offsets = new List<long>();

        offsets.Add(ms.Position);
        WriteAscii("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n");

        offsets.Add(ms.Position);
        WriteAscii("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n");

        offsets.Add(ms.Position);
        WriteAscii("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n");

        offsets.Add(ms.Position);
        WriteAscii("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n");

        offsets.Add(ms.Position);
        WriteAscii($"5 0 obj << /Length {streamBytes.Length} >> stream\n");
        ms.Write(streamBytes);
        WriteAscii("\nendstream endobj\n");

        var xrefPos = ms.Position;
        WriteAscii($"xref\n0 {offsets.Count + 1}\n0000000000 65535 f \n");
        foreach (var off in offsets)
            WriteAscii($"{off:D10} 00000 n \n");

        WriteAscii($"trailer << /Size {offsets.Count + 1} /Root 1 0 R >>\nstartxref\n{xrefPos}\n%%EOF");
        return ms.ToArray();
    }
}
