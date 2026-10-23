using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFarm.Api.Data;
using SmartFarm.Api.DTOs;
using SmartFarm.Api.Models;
using SmartFarm.Api.Services;

namespace SmartFarm.Api.Controllers;

[ApiController]
[Route("api/farms/{farmId:int}")]
[Authorize]
public class FinanceController : ControllerBase
{
    private readonly SmartFarmDbContext _db;
    private readonly IFarmService _farmService;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public FinanceController(SmartFarmDbContext db, IFarmService farmService)
    {
        _db = db;
        _farmService = farmService;
    }

    // ---- Customers ----
    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomers(int farmId)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        return Ok(await _db.Customers.Where(c => c.FarmId == farmId && c.IsActive)
            .Select(c => new CustomerResponse(c.Id, c.Name, c.ContactPerson, c.Phone, c.Email, c.OutstandingBalance, c.CreatedAt))
            .ToListAsync());
    }

    [HttpPost("customers")]
    public async Task<IActionResult> CreateCustomer(int farmId, [FromBody] CreateCustomerRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var customer = new Customer
        {
            FarmId = farmId, Name = request.Name, ContactPerson = request.ContactPerson,
            Phone = request.Phone, Email = request.Email, Address = request.Address,
            Notes = request.Notes, CreatedBy = UserId
        };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();
        return Ok(customer);
    }

    // ---- Suppliers ----
    [HttpGet("suppliers")]
    public async Task<IActionResult> GetSuppliers(int farmId)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        return Ok(await _db.Suppliers.Where(s => s.FarmId == farmId && s.IsActive).ToListAsync());
    }

    [HttpPost("suppliers")]
    public async Task<IActionResult> CreateSupplier(int farmId, [FromBody] CreateSupplierRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var supplier = new Supplier
        {
            FarmId = farmId, Name = request.Name, ContactPerson = request.ContactPerson,
            Phone = request.Phone, Email = request.Email, Address = request.Address,
            Notes = request.Notes, CreatedBy = UserId
        };
        _db.Suppliers.Add(supplier);
        await _db.SaveChangesAsync();
        return Ok(supplier);
    }

    // ---- Sales Orders ----
    [HttpGet("sales-orders")]
    public async Task<IActionResult> GetSalesOrders(int farmId, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var query = _db.SalesOrders.Include(o => o.Customer).Where(o => o.FarmId == farmId);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(o => o.Status == status);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(o => o.OrderDate).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(o => new { o.Id, o.OrderNumber, o.OrderDate, o.Status, o.TotalAmount, CustomerName = o.Customer != null ? o.Customer.Name : null })
            .ToListAsync();

        return Ok(new { Items = items, TotalCount = total, Page = page });
    }

    [HttpPost("sales-orders")]
    public async Task<IActionResult> CreateSalesOrder(int farmId, [FromBody] CreateSalesOrderRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var orderNo = $"SO-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}";
        var items = request.Items.Select(i => new SalesOrderItem
        {
            ProductType = i.ProductType,
            BatchId = i.BatchId,
            Quantity = i.Quantity,
            Unit = i.Unit,
            UnitPrice = i.UnitPrice,
            TotalPrice = i.Quantity * i.UnitPrice,
            CreatedBy = UserId
        }).ToList();

        var order = new SalesOrder
        {
            FarmId = farmId,
            CustomerId = request.CustomerId,
            OrderNumber = orderNo,
            OrderDate = request.OrderDate,
            Status = OrderStatus.Pending,
            TotalAmount = items.Sum(i => i.TotalPrice),
            Notes = request.Notes,
            Items = items,
            CreatedBy = UserId
        };

        _db.SalesOrders.Add(order);
        await _db.SaveChangesAsync();
        return Ok(order);
    }

    // ---- Invoices ----
    [HttpGet("invoices")]
    public async Task<IActionResult> GetInvoices(int farmId, [FromQuery] string? status)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var query = _db.Invoices.Include(i => i.SalesOrder).ThenInclude(o => o!.Customer).Where(i => i.FarmId == farmId);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(i => i.Status == status);

        return Ok(await query.OrderByDescending(i => i.InvoiceDate).Select(i => new
        {
            i.Id, i.InvoiceNumber, i.InvoiceDate, i.DueDate, i.Amount, i.PaidAmount, i.Status,
            CustomerName = i.SalesOrder != null && i.SalesOrder.Customer != null ? i.SalesOrder.Customer.Name : null
        }).ToListAsync());
    }

    [HttpPost("invoices")]
    public async Task<IActionResult> CreateInvoice(int farmId, [FromBody] CreateInvoiceRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var order = await _db.SalesOrders.Include(o => o.Customer).FirstOrDefaultAsync(o => o.FarmId == farmId && o.Id == request.SalesOrderId);
        if (order == null) return NotFound(new { error = "Sales order not found." });

        if (await _db.Invoices.AnyAsync(i => i.FarmId == farmId && i.SalesOrderId == request.SalesOrderId && i.Status != InvoiceStatus.Voided))
            return Conflict(new { error = "An active invoice already exists for this sales order." });

        var invoiceNo = $"INV-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}";
        var invoice = new Invoice
        {
            FarmId = farmId,
            SalesOrderId = request.SalesOrderId,
            InvoiceNumber = invoiceNo,
            InvoiceDate = DateTime.UtcNow,
            DueDate = request.DueDate,
            Amount = order.TotalAmount,
            Status = InvoiceStatus.Unpaid,
            Notes = request.Notes,
            CreatedBy = UserId
        };
        _db.Invoices.Add(invoice);
        order.Status = OrderStatus.Confirmed;
        if (order.Customer != null)
            order.Customer.OutstandingBalance += order.TotalAmount;

        await _db.SaveChangesAsync();
        return Ok(invoice);
    }

    [HttpPost("invoices/{id:int}/payments")]
    public async Task<IActionResult> RecordPayment(int farmId, int id, [FromBody] RecordPaymentRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();
        if (request.Amount <= 0) return BadRequest(new { error = "Payment amount must be greater than zero." });

        var invoice = await _db.Invoices.FirstOrDefaultAsync(i => i.FarmId == farmId && i.Id == id);
        if (invoice == null) return NotFound();
        if (invoice.Status == InvoiceStatus.Paid) return BadRequest(new { error = "Invoice is already paid in full." });

        if (!string.IsNullOrWhiteSpace(request.Reference) &&
            await _db.Payments.AnyAsync(p => p.FarmId == farmId && p.InvoiceId == id && p.Reference == request.Reference))
        {
            return Conflict(new { error = $"Duplicate payment reference '{request.Reference}' on this invoice." });
        }

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var payment = new Payment
            {
                InvoiceId = id,
                FarmId = farmId,
                Amount = request.Amount,
                PaidAt = request.PaidAt,
                Method = request.Method,
                Reference = request.Reference,
                Notes = request.Notes,
                CreatedBy = UserId
            };

            invoice.PaidAmount += request.Amount;
            invoice.Status = invoice.PaidAmount >= invoice.Amount ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;

            // Update customer balance
            var order = await _db.SalesOrders.Include(o => o.Customer).FirstOrDefaultAsync(o => o.Id == invoice.SalesOrderId);
            if (order?.Customer != null)
                order.Customer.OutstandingBalance = Math.Max(0, order.Customer.OutstandingBalance - request.Amount);

            _db.Payments.Add(payment);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new { payment.Id, invoice.PaidAmount, invoice.Status });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // ---- Expenses ----
    [HttpGet("expenses")]
    public async Task<IActionResult> GetExpenses(int farmId, [FromQuery] string? category, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var query = _db.Expenses.Where(e => e.FarmId == farmId);
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(e => e.Category == category);
        if (from.HasValue) query = query.Where(e => e.ExpenseDate >= from.Value);
        if (to.HasValue) query = query.Where(e => e.ExpenseDate <= to.Value);

        return Ok(await query.OrderByDescending(e => e.ExpenseDate).ToListAsync());
    }

    [HttpPost("expenses")]
    public async Task<IActionResult> AddExpense(int farmId, [FromBody] CreateExpenseRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var expense = new Expense
        {
            FarmId = farmId, Category = request.Category, Amount = request.Amount,
            ExpenseDate = request.ExpenseDate, Description = request.Description,
            SupplierId = request.SupplierId, Reference = request.Reference,
            RecordedBy = UserId, CreatedBy = UserId
        };
        _db.Expenses.Add(expense);
        await _db.SaveChangesAsync();
        return Ok(expense);
    }

    // ---- Finance Summary ----
    [HttpGet("finance/summary")]
    public async Task<IActionResult> GetFinanceSummary(int farmId, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        if (!await _farmService.UserHasFarmAccessAsync(farmId, UserId)) return Forbid();

        var start = from ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var end = to ?? DateTime.UtcNow;

        var cashRevenue = await _db.Payments
            .Where(p => p.FarmId == farmId && p.PaidAt >= start && p.PaidAt <= end)
            .SumAsync(p => (decimal?)p.Amount) ?? 0;

        var invoicedRevenue = await _db.Invoices
            .Where(i => i.FarmId == farmId && i.InvoiceDate >= start && i.InvoiceDate <= end && i.Status != InvoiceStatus.Voided)
            .SumAsync(i => (decimal?)i.Amount) ?? 0;

        var outstandingReceivables = await _db.Invoices
            .Where(i => i.FarmId == farmId && i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Voided)
            .SumAsync(i => (decimal?)(i.Amount - i.PaidAmount)) ?? 0;

        var directExpenses = await _db.Expenses
            .Where(e => e.FarmId == farmId && e.ExpenseDate >= start && e.ExpenseDate <= end &&
                        (e.Category == ExpenseCategory.Feed || e.Category == ExpenseCategory.Medicine || e.Category == ExpenseCategory.Veterinary))
            .SumAsync(e => (decimal?)e.Amount) ?? 0;

        var allExpenses = await _db.Expenses
            .Where(e => e.FarmId == farmId && e.ExpenseDate >= start && e.ExpenseDate <= end)
            .SumAsync(e => (decimal?)e.Amount) ?? 0;

        var vetCosts = await _db.HealthRecords
            .Where(h => h.FarmId == farmId && h.RecordDate >= start && h.RecordDate <= end)
            .SumAsync(h => (decimal?)h.VeterinaryCost) ?? 0;

        var totalExpenses = allExpenses + vetCosts;
        var revenueBasis = invoicedRevenue > 0 ? invoicedRevenue : cashRevenue;
        var grossProfit = revenueBasis - (directExpenses + vetCosts);
        var netOperatingProfit = revenueBasis - totalExpenses;
        var netCashFlow = cashRevenue - totalExpenses;

        return Ok(new FinanceSummaryResponse(
            cashRevenue,
            totalExpenses,
            grossProfit,
            netOperatingProfit,
            start,
            end,
            invoicedRevenue,
            outstandingReceivables,
            netCashFlow));
    }
}
