using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SmartFarm.Api.Models;

namespace SmartFarm.Api.Data;

public class SmartFarmDbContext : IdentityDbContext<ApplicationUser>
{
    public SmartFarmDbContext(DbContextOptions<SmartFarmDbContext> options) : base(options) { }

    // Farm core
    public DbSet<Farm> Farms => Set<Farm>();
    public DbSet<FarmUser> FarmUsers => Set<FarmUser>();
    public DbSet<FarmLocation> FarmLocations => Set<FarmLocation>();

    // Livestock
    public DbSet<Animal> Animals => Set<Animal>();
    public DbSet<AnimalGroup> AnimalGroups => Set<AnimalGroup>();
    public DbSet<AnimalEvent> AnimalEvents => Set<AnimalEvent>();
    public DbSet<BreedingRecord> BreedingRecords => Set<BreedingRecord>();

    // Beehives
    public DbSet<Beehive> Beehives => Set<Beehive>();
    public DbSet<HiveInspection> HiveInspections => Set<HiveInspection>();

    // Production
    public DbSet<ProductionRecord> ProductionRecords => Set<ProductionRecord>();
    public DbSet<ProductionBatch> ProductionBatches => Set<ProductionBatch>();

    // Veterinary
    public DbSet<VaccinationSchedule> VaccinationSchedules => Set<VaccinationSchedule>();
    public DbSet<VaccinationRecord> VaccinationRecords => Set<VaccinationRecord>();
    public DbSet<HealthRecord> HealthRecords => Set<HealthRecord>();

    // Inventory
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();

    // Finance
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<SalesOrder> SalesOrders => Set<SalesOrder>();
    public DbSet<SalesOrderItem> SalesOrderItems => Set<SalesOrderItem>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Expense> Expenses => Set<Expense>();

    // Deliveries
    public DbSet<Delivery> Deliveries => Set<Delivery>();
    public DbSet<DeliveryItem> DeliveryItems => Set<DeliveryItem>();

    // Tasks & Notifications
    public DbSet<FarmTask> FarmTasks => Set<FarmTask>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // ---- Soft delete ----
        // IsDeleted exists on BaseEntity, but no global query filters are applied yet: a filter on a
        // parent (Animal, Beehive) that is the required end of child relationships would silently hide
        // child rows. When soft delete is introduced, add matching filters on all dependents and
        // exclude IsDeleted explicitly in queries until then.

        // ---- Money / quantity precision for properties not configured elsewhere ----
        builder.Entity<AnimalEvent>().Property(x => x.Amount).HasColumnType("decimal(18,2)");
        builder.Entity<HealthRecord>().Property(x => x.VeterinaryCost).HasColumnType("decimal(18,2)");

        // ---- Farm ----
        builder.Entity<Farm>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).IsRequired().HasMaxLength(200);
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Restrict);
        });

        // ---- FarmUser ----
        builder.Entity<FarmUser>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.FarmId, x.UserId }).IsUnique();
            e.HasOne(x => x.Farm).WithMany(f => f.FarmUsers).HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User).WithMany(u => u.FarmUsers).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        // ---- FarmLocation ----
        builder.Entity<FarmLocation>(e =>
        {
            e.HasOne(x => x.Farm).WithMany(f => f.Locations).HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
        });

        // ---- Animal ----
        builder.Entity<Animal>(e =>
        {
            e.Property(x => x.TagId).IsRequired().HasMaxLength(100);
            e.Property(x => x.Species).IsRequired().HasMaxLength(50);
            e.Property(x => x.CurrentWeightKg).HasColumnType("decimal(10,2)");
            e.Property(x => x.AcquisitionCost).HasColumnType("decimal(18,2)");
            e.HasIndex(x => new { x.FarmId, x.TagId }).IsUnique();
            e.HasOne(x => x.Farm).WithMany(f => f.Animals).HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Location).WithMany(l => l.Animals).HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Group).WithMany(g => g.Animals).HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Sire).WithMany(a => a.Offspring).HasForeignKey(x => x.SireId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Dam).WithMany().HasForeignKey(x => x.DamId).OnDelete(DeleteBehavior.Restrict);
        });

        // ---- AnimalGroup ----
        builder.Entity<AnimalGroup>(e =>
        {
            e.HasOne(x => x.Farm).WithMany(f => f.AnimalGroups).HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
        });

        // ---- BreedingRecord ----
        builder.Entity<BreedingRecord>(e =>
        {
            e.HasOne(x => x.Sire).WithMany(a => a.BreedingAsSire).HasForeignKey(x => x.SireId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Dam).WithMany(a => a.BreedingAsDam).HasForeignKey(x => x.DamId).OnDelete(DeleteBehavior.Restrict);
        });

        // ---- Beehive ----
        builder.Entity<Beehive>(e =>
        {
            e.Property(x => x.HiveCode).IsRequired().HasMaxLength(100);
            e.HasIndex(x => new { x.FarmId, x.HiveCode }).IsUnique();
            e.HasOne(x => x.Farm).WithMany(f => f.Beehives).HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Location).WithMany(l => l.Beehives).HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.SetNull);
        });

        // ---- ProductionRecord ----
        builder.Entity<ProductionRecord>(e =>
        {
            e.Property(x => x.Quantity).HasColumnType("decimal(18,3)");
            e.Property(x => x.RejectedQuantity).HasColumnType("decimal(18,3)");
            e.HasOne(x => x.Farm).WithMany(f => f.ProductionRecords).HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Animal).WithMany(a => a.ProductionRecords).HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Group).WithMany(g => g.ProductionRecords).HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Beehive).WithMany(b => b.ProductionRecords).HasForeignKey(x => x.BeehiveId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Batch).WithMany(b => b.ProductionRecords).HasForeignKey(x => x.BatchId).OnDelete(DeleteBehavior.SetNull);
        });

        // ---- ProductionBatch ----
        builder.Entity<ProductionBatch>(e =>
        {
            e.Property(x => x.TotalQuantity).HasColumnType("decimal(18,3)");
            e.Property(x => x.AvailableQuantity).HasColumnType("decimal(18,3)");
            e.HasIndex(x => new { x.FarmId, x.BatchCode }).IsUnique();
        });

        // ---- VaccinationRecord ----
        builder.Entity<VaccinationRecord>(e =>
        {
            e.HasOne(x => x.Animal).WithMany(a => a.VaccinationRecords).HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Group).WithMany(g => g.VaccinationRecords).HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.SetNull);
        });

        // ---- InventoryItem ----
        builder.Entity<InventoryItem>(e =>
        {
            e.Property(x => x.CurrentStock).HasColumnType("decimal(18,3)");
            e.Property(x => x.MinimumStock).HasColumnType("decimal(18,3)");
            e.Property(x => x.UnitCost).HasColumnType("decimal(18,2)");
            e.HasOne(x => x.Farm).WithMany(f => f.InventoryItems).HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
        });

        // ---- StockMovement ----
        builder.Entity<StockMovement>(e =>
        {
            e.Property(x => x.Quantity).HasColumnType("decimal(18,3)");
            e.Property(x => x.UnitCost).HasColumnType("decimal(18,2)");
            e.HasOne(x => x.Item).WithMany(i => i.StockMovements).HasForeignKey(x => x.ItemId).OnDelete(DeleteBehavior.Restrict);
        });

        // ---- Finance ----
        builder.Entity<SalesOrder>(e =>
        {
            e.Property(x => x.TotalAmount).HasColumnType("decimal(18,2)");
            e.HasOne(x => x.Farm).WithMany().HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Customer).WithMany(c => c.SalesOrders).HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<SalesOrderItem>(e =>
        {
            e.Property(x => x.Quantity).HasColumnType("decimal(18,3)");
            e.Property(x => x.UnitPrice).HasColumnType("decimal(18,2)");
            e.Property(x => x.TotalPrice).HasColumnType("decimal(18,2)");
        });

        builder.Entity<Invoice>(e =>
        {
            e.Property(x => x.Amount).HasColumnType("decimal(18,2)");
            e.Property(x => x.PaidAmount).HasColumnType("decimal(18,2)");
            e.HasIndex(x => x.InvoiceNumber).IsUnique();
        });

        builder.Entity<Payment>(e =>
        {
            e.Property(x => x.Amount).HasColumnType("decimal(18,2)");
        });

        builder.Entity<Expense>(e =>
        {
            e.Property(x => x.Amount).HasColumnType("decimal(18,2)");
            e.HasOne(x => x.Farm).WithMany(f => f.Expenses).HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Customer>(e =>
        {
            e.Property(x => x.OutstandingBalance).HasColumnType("decimal(18,2)");
            e.HasOne(x => x.Farm).WithMany(f => f.Customers).HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Restrict);
        });

        // ---- Delivery ----
        builder.Entity<Delivery>(e =>
        {
            e.HasOne(x => x.Farm).WithMany(f => f.Deliveries).HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Customer).WithMany(c => c.Deliveries).HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<DeliveryItem>(e =>
        {
            e.Property(x => x.QuantityDispatched).HasColumnType("decimal(18,3)");
            e.Property(x => x.QuantityReceived).HasColumnType("decimal(18,3)");
            e.Property(x => x.QuantityRejected).HasColumnType("decimal(18,3)");
        });

        // ---- Tasks ----
        builder.Entity<FarmTask>(e =>
        {
            e.HasOne(x => x.Farm).WithMany(f => f.Tasks).HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.AssignedTo).WithMany(u => u.AssignedTasks).HasForeignKey(x => x.AssignedToUserId).OnDelete(DeleteBehavior.SetNull);
        });

        // ---- Notifications ----
        builder.Entity<Notification>(e =>
        {
            e.HasOne(x => x.Farm).WithMany(f => f.Notifications).HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
        });

        // ---- Audit ----
        builder.Entity<AuditLog>(e =>
        {
            e.HasOne(x => x.Farm).WithMany(f => f.AuditLogs).HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Restrict);
        });

        // ---- Delete-behaviour policy (avoids SQL Server "multiple cascade paths" errors) ----
        // 1. Farm-owned data never cascades from Farm: deleting a farm row must not silently wipe its records
        //    (farms are deactivated via IsActive). Only FarmUser membership rows cascade with their farm.
        // 2. SetNull is converted to ClientSetNull so the database applies no cascading action; several
        //    SetNull paths (Farm/Location/Group/Animal -> children) otherwise form cycles on SQL Server.
        foreach (var fk in builder.Model.GetEntityTypes().SelectMany(t => t.GetForeignKeys()))
        {
            if (fk.PrincipalEntityType.ClrType == typeof(Farm) && fk.DeclaringEntityType.ClrType != typeof(FarmUser))
                fk.DeleteBehavior = DeleteBehavior.Restrict;
            else if (fk.DeleteBehavior == DeleteBehavior.SetNull)
                fk.DeleteBehavior = DeleteBehavior.ClientSetNull;
        }
    }

    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void UpdateTimestamps()
    {
        var entries = ChangeTracker.Entries<BaseEntity>();
        var now = DateTime.UtcNow;
        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added)
                entry.Entity.CreatedAt = now;
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = now;
        }
    }
}
