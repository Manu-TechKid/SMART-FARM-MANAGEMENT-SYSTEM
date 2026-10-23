IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetRoles] (
        [Id] nvarchar(450) NOT NULL,
        [Name] nvarchar(256) NULL,
        [NormalizedName] nvarchar(256) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUsers] (
        [Id] nvarchar(450) NOT NULL,
        [FirstName] nvarchar(max) NOT NULL,
        [LastName] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [IsActive] bit NOT NULL,
        [UserName] nvarchar(256) NULL,
        [NormalizedUserName] nvarchar(256) NULL,
        [Email] nvarchar(256) NULL,
        [NormalizedEmail] nvarchar(256) NULL,
        [EmailConfirmed] bit NOT NULL,
        [PasswordHash] nvarchar(max) NULL,
        [SecurityStamp] nvarchar(max) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        [PhoneNumber] nvarchar(max) NULL,
        [PhoneNumberConfirmed] bit NOT NULL,
        [TwoFactorEnabled] bit NOT NULL,
        [LockoutEnd] datetimeoffset NULL,
        [LockoutEnabled] bit NOT NULL,
        [AccessFailedCount] int NOT NULL,
        CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetRoleClaims] (
        [Id] int NOT NULL IDENTITY,
        [RoleId] nvarchar(450) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserClaims] (
        [Id] int NOT NULL IDENTITY,
        [UserId] nvarchar(450) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserLogins] (
        [LoginProvider] nvarchar(450) NOT NULL,
        [ProviderKey] nvarchar(450) NOT NULL,
        [ProviderDisplayName] nvarchar(max) NULL,
        [UserId] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
        CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserRoles] (
        [UserId] nvarchar(450) NOT NULL,
        [RoleId] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
        CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserTokens] (
        [UserId] nvarchar(450) NOT NULL,
        [LoginProvider] nvarchar(450) NOT NULL,
        [Name] nvarchar(450) NOT NULL,
        [Value] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
        CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [Farms] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(200) NOT NULL,
        [Description] nvarchar(max) NULL,
        [Address] nvarchar(max) NULL,
        [County] nvarchar(max) NULL,
        [Country] nvarchar(max) NULL,
        [PhoneNumber] nvarchar(max) NULL,
        [Email] nvarchar(max) NULL,
        [LogoUrl] nvarchar(max) NULL,
        [OwnerId] nvarchar(450) NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_Farms] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Farms_AspNetUsers_OwnerId] FOREIGN KEY ([OwnerId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [AuditLogs] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [UserId] nvarchar(max) NOT NULL,
        [UserName] nvarchar(max) NOT NULL,
        [Action] nvarchar(max) NOT NULL,
        [EntityType] nvarchar(max) NOT NULL,
        [EntityId] int NULL,
        [OldValues] nvarchar(max) NULL,
        [NewValues] nvarchar(max) NULL,
        [IpAddress] nvarchar(max) NULL,
        [Timestamp] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_AuditLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AuditLogs_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [Customers] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [ContactPerson] nvarchar(max) NULL,
        [Phone] nvarchar(max) NULL,
        [Email] nvarchar(max) NULL,
        [Address] nvarchar(max) NULL,
        [OutstandingBalance] decimal(18,2) NOT NULL,
        [IsActive] bit NOT NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_Customers] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Customers_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [FarmLocations] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [Type] nvarchar(max) NOT NULL,
        [Description] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_FarmLocations] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_FarmLocations_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [FarmTasks] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [Title] nvarchar(max) NOT NULL,
        [Description] nvarchar(max) NULL,
        [AssignedToUserId] nvarchar(450) NULL,
        [DueDate] datetime2 NULL,
        [Status] nvarchar(max) NOT NULL,
        [Priority] nvarchar(max) NOT NULL,
        [Category] nvarchar(max) NULL,
        [RelatedEntityType] nvarchar(max) NULL,
        [RelatedEntityId] int NULL,
        [CompletedAt] datetime2 NULL,
        [CompletedBy] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_FarmTasks] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_FarmTasks_AspNetUsers_AssignedToUserId] FOREIGN KEY ([AssignedToUserId]) REFERENCES [AspNetUsers] ([Id]),
        CONSTRAINT [FK_FarmTasks_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [FarmUsers] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [UserId] nvarchar(450) NOT NULL,
        [Role] nvarchar(max) NOT NULL,
        [IsActive] bit NOT NULL,
        [JoinedAt] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_FarmUsers] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_FarmUsers_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_FarmUsers_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [Notifications] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [Type] nvarchar(max) NOT NULL,
        [Title] nvarchar(max) NOT NULL,
        [Message] nvarchar(max) NOT NULL,
        [IsRead] bit NOT NULL,
        [TargetUserId] nvarchar(max) NULL,
        [RelatedEntityType] nvarchar(max) NULL,
        [RelatedEntityId] int NULL,
        [ActionUrl] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_Notifications] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Notifications_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [ProductionBatches] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [ProductType] nvarchar(max) NOT NULL,
        [BatchCode] nvarchar(450) NOT NULL,
        [BatchDate] datetime2 NOT NULL,
        [TotalQuantity] decimal(18,3) NOT NULL,
        [AvailableQuantity] decimal(18,3) NOT NULL,
        [Unit] nvarchar(max) NOT NULL,
        [Status] nvarchar(max) NOT NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_ProductionBatches] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProductionBatches_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [Suppliers] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [ContactPerson] nvarchar(max) NULL,
        [Phone] nvarchar(max) NULL,
        [Email] nvarchar(max) NULL,
        [Address] nvarchar(max) NULL,
        [IsActive] bit NOT NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_Suppliers] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Suppliers_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [VaccinationSchedules] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [VaccineName] nvarchar(max) NOT NULL,
        [Species] nvarchar(max) NOT NULL,
        [TargetAgeGroup] nvarchar(max) NULL,
        [IntervalDays] int NOT NULL,
        [Description] nvarchar(max) NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_VaccinationSchedules] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_VaccinationSchedules_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [SalesOrders] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [CustomerId] int NOT NULL,
        [OrderNumber] nvarchar(max) NOT NULL,
        [OrderDate] datetime2 NOT NULL,
        [Status] nvarchar(max) NOT NULL,
        [TotalAmount] decimal(18,2) NOT NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_SalesOrders] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SalesOrders_Customers_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [Customers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_SalesOrders_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [AnimalGroups] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [Species] nvarchar(max) NOT NULL,
        [GroupType] nvarchar(max) NOT NULL,
        [Count] int NOT NULL,
        [LocationId] int NULL,
        [Description] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_AnimalGroups] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AnimalGroups_FarmLocations_LocationId] FOREIGN KEY ([LocationId]) REFERENCES [FarmLocations] ([Id]),
        CONSTRAINT [FK_AnimalGroups_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [Beehives] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [HiveCode] nvarchar(100) NOT NULL,
        [LocationId] int NULL,
        [ApiaryName] nvarchar(max) NULL,
        [HiveType] nvarchar(max) NOT NULL,
        [ColonyStatus] nvarchar(max) NOT NULL,
        [QueenStatus] nvarchar(max) NOT NULL,
        [LastInspectionDate] datetime2 NULL,
        [QueenIntroducedDate] datetime2 NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_Beehives] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Beehives_FarmLocations_LocationId] FOREIGN KEY ([LocationId]) REFERENCES [FarmLocations] ([Id]),
        CONSTRAINT [FK_Beehives_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [Expenses] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [Category] nvarchar(max) NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [ExpenseDate] datetime2 NOT NULL,
        [Description] nvarchar(max) NOT NULL,
        [SupplierId] int NULL,
        [Reference] nvarchar(max) NULL,
        [RecordedBy] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_Expenses] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Expenses_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Expenses_Suppliers_SupplierId] FOREIGN KEY ([SupplierId]) REFERENCES [Suppliers] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [InventoryItems] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [Category] nvarchar(max) NOT NULL,
        [Unit] nvarchar(max) NOT NULL,
        [CurrentStock] decimal(18,3) NOT NULL,
        [MinimumStock] decimal(18,3) NOT NULL,
        [UnitCost] decimal(18,2) NULL,
        [ExpiryDate] datetime2 NULL,
        [SupplierId] int NULL,
        [Description] nvarchar(max) NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_InventoryItems] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_InventoryItems_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_InventoryItems_Suppliers_SupplierId] FOREIGN KEY ([SupplierId]) REFERENCES [Suppliers] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [Deliveries] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [DeliveryNumber] nvarchar(max) NOT NULL,
        [CustomerId] int NULL,
        [SalesOrderId] int NULL,
        [Status] nvarchar(max) NOT NULL,
        [DispatchDate] datetime2 NULL,
        [ExpectedArrival] datetime2 NULL,
        [ActualArrival] datetime2 NULL,
        [DriverName] nvarchar(max) NULL,
        [VehicleReg] nvarchar(max) NULL,
        [ProofOfDelivery] nvarchar(max) NULL,
        [DiscrepancyReason] nvarchar(max) NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_Deliveries] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Deliveries_Customers_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [Customers] ([Id]),
        CONSTRAINT [FK_Deliveries_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Deliveries_SalesOrders_SalesOrderId] FOREIGN KEY ([SalesOrderId]) REFERENCES [SalesOrders] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [Invoices] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [SalesOrderId] int NOT NULL,
        [InvoiceNumber] nvarchar(450) NOT NULL,
        [InvoiceDate] datetime2 NOT NULL,
        [DueDate] datetime2 NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [PaidAmount] decimal(18,2) NOT NULL,
        [Status] nvarchar(max) NOT NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_Invoices] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Invoices_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Invoices_SalesOrders_SalesOrderId] FOREIGN KEY ([SalesOrderId]) REFERENCES [SalesOrders] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [SalesOrderItems] (
        [Id] int NOT NULL IDENTITY,
        [SalesOrderId] int NOT NULL,
        [ProductType] nvarchar(max) NOT NULL,
        [BatchId] int NULL,
        [Quantity] decimal(18,3) NOT NULL,
        [Unit] nvarchar(max) NOT NULL,
        [UnitPrice] decimal(18,2) NOT NULL,
        [TotalPrice] decimal(18,2) NOT NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_SalesOrderItems] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SalesOrderItems_ProductionBatches_BatchId] FOREIGN KEY ([BatchId]) REFERENCES [ProductionBatches] ([Id]),
        CONSTRAINT [FK_SalesOrderItems_SalesOrders_SalesOrderId] FOREIGN KEY ([SalesOrderId]) REFERENCES [SalesOrders] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [Animals] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [LocationId] int NULL,
        [TagId] nvarchar(100) NOT NULL,
        [Name] nvarchar(max) NULL,
        [Species] nvarchar(50) NOT NULL,
        [Breed] nvarchar(max) NULL,
        [Sex] nvarchar(max) NOT NULL,
        [DateOfBirth] datetime2 NULL,
        [AcquisitionType] nvarchar(max) NOT NULL,
        [AcquisitionDate] datetime2 NOT NULL,
        [AcquisitionCost] decimal(18,2) NULL,
        [CurrentWeightKg] decimal(10,2) NULL,
        [Status] nvarchar(max) NOT NULL,
        [Notes] nvarchar(max) NULL,
        [GroupId] int NULL,
        [SireId] int NULL,
        [DamId] int NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_Animals] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Animals_AnimalGroups_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [AnimalGroups] ([Id]),
        CONSTRAINT [FK_Animals_Animals_DamId] FOREIGN KEY ([DamId]) REFERENCES [Animals] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Animals_Animals_SireId] FOREIGN KEY ([SireId]) REFERENCES [Animals] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Animals_FarmLocations_LocationId] FOREIGN KEY ([LocationId]) REFERENCES [FarmLocations] ([Id]),
        CONSTRAINT [FK_Animals_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [HiveInspections] (
        [Id] int NOT NULL IDENTITY,
        [BeehiveId] int NOT NULL,
        [InspectedAt] datetime2 NOT NULL,
        [InspectedBy] nvarchar(max) NOT NULL,
        [QueenSeen] bit NOT NULL,
        [HealthScore] int NOT NULL,
        [ColonyTemperament] nvarchar(max) NULL,
        [HasEggs] bit NOT NULL,
        [HasLarvae] bit NOT NULL,
        [HasCappedBrood] bit NOT NULL,
        [FramesOfBees] int NULL,
        [FramesOfBrood] int NULL,
        [FramesOfHoney] int NULL,
        [PestObservations] nvarchar(max) NULL,
        [DiseaseObservations] nvarchar(max) NULL,
        [ActionTaken] nvarchar(max) NULL,
        [NextInspectionDue] datetime2 NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_HiveInspections] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_HiveInspections_Beehives_BeehiveId] FOREIGN KEY ([BeehiveId]) REFERENCES [Beehives] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [StockMovements] (
        [Id] int NOT NULL IDENTITY,
        [ItemId] int NOT NULL,
        [FarmId] int NOT NULL,
        [MovementType] nvarchar(max) NOT NULL,
        [Quantity] decimal(18,3) NOT NULL,
        [UnitCost] decimal(18,2) NULL,
        [MovementDate] datetime2 NOT NULL,
        [Reference] nvarchar(max) NULL,
        [RecordedBy] nvarchar(max) NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_StockMovements] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_StockMovements_InventoryItems_ItemId] FOREIGN KEY ([ItemId]) REFERENCES [InventoryItems] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [DeliveryItems] (
        [Id] int NOT NULL IDENTITY,
        [DeliveryId] int NOT NULL,
        [BatchId] int NULL,
        [ProductType] nvarchar(max) NOT NULL,
        [QuantityDispatched] decimal(18,3) NOT NULL,
        [QuantityReceived] decimal(18,3) NOT NULL,
        [QuantityRejected] decimal(18,3) NOT NULL,
        [Unit] nvarchar(max) NOT NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_DeliveryItems] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DeliveryItems_Deliveries_DeliveryId] FOREIGN KEY ([DeliveryId]) REFERENCES [Deliveries] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_DeliveryItems_ProductionBatches_BatchId] FOREIGN KEY ([BatchId]) REFERENCES [ProductionBatches] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [Payments] (
        [Id] int NOT NULL IDENTITY,
        [InvoiceId] int NOT NULL,
        [FarmId] int NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [PaidAt] datetime2 NOT NULL,
        [Method] nvarchar(max) NOT NULL,
        [Reference] nvarchar(max) NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_Payments] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Payments_Invoices_InvoiceId] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [AnimalEvents] (
        [Id] int NOT NULL IDENTITY,
        [AnimalId] int NOT NULL,
        [EventType] nvarchar(max) NOT NULL,
        [EventDate] datetime2 NOT NULL,
        [Description] nvarchar(max) NULL,
        [Amount] decimal(18,2) NULL,
        [RecordedBy] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_AnimalEvents] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AnimalEvents_Animals_AnimalId] FOREIGN KEY ([AnimalId]) REFERENCES [Animals] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [BreedingRecords] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [SireId] int NULL,
        [DamId] int NOT NULL,
        [MatingDate] datetime2 NOT NULL,
        [ExpectedDOB] datetime2 NULL,
        [ActualDOB] datetime2 NULL,
        [OffspringCount] int NULL,
        [Status] nvarchar(max) NOT NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_BreedingRecords] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_BreedingRecords_Animals_DamId] FOREIGN KEY ([DamId]) REFERENCES [Animals] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_BreedingRecords_Animals_SireId] FOREIGN KEY ([SireId]) REFERENCES [Animals] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_BreedingRecords_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [HealthRecords] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [AnimalId] int NULL,
        [GroupId] int NULL,
        [RecordDate] datetime2 NOT NULL,
        [RecordType] nvarchar(max) NOT NULL,
        [Symptoms] nvarchar(max) NULL,
        [Diagnosis] nvarchar(max) NULL,
        [Treatment] nvarchar(max) NULL,
        [VeterinarianName] nvarchar(max) NULL,
        [VeterinaryCost] decimal(18,2) NOT NULL,
        [WithdrawalPeriodEnd] datetime2 NULL,
        [FollowUpDate] datetime2 NULL,
        [Status] nvarchar(max) NOT NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_HealthRecords] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_HealthRecords_AnimalGroups_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [AnimalGroups] ([Id]),
        CONSTRAINT [FK_HealthRecords_Animals_AnimalId] FOREIGN KEY ([AnimalId]) REFERENCES [Animals] ([Id]),
        CONSTRAINT [FK_HealthRecords_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [ProductionRecords] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [ProductType] nvarchar(max) NOT NULL,
        [ProductionDate] datetime2 NOT NULL,
        [LocationId] int NULL,
        [AnimalId] int NULL,
        [GroupId] int NULL,
        [BeehiveId] int NULL,
        [Quantity] decimal(18,3) NOT NULL,
        [Unit] nvarchar(max) NOT NULL,
        [RejectedQuantity] decimal(18,3) NOT NULL,
        [QualityStatus] nvarchar(max) NOT NULL,
        [BatchCode] nvarchar(max) NULL,
        [BatchId] int NULL,
        [RecordedBy] nvarchar(max) NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_ProductionRecords] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProductionRecords_AnimalGroups_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [AnimalGroups] ([Id]),
        CONSTRAINT [FK_ProductionRecords_Animals_AnimalId] FOREIGN KEY ([AnimalId]) REFERENCES [Animals] ([Id]),
        CONSTRAINT [FK_ProductionRecords_Beehives_BeehiveId] FOREIGN KEY ([BeehiveId]) REFERENCES [Beehives] ([Id]),
        CONSTRAINT [FK_ProductionRecords_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ProductionRecords_ProductionBatches_BatchId] FOREIGN KEY ([BatchId]) REFERENCES [ProductionBatches] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE TABLE [VaccinationRecords] (
        [Id] int NOT NULL IDENTITY,
        [FarmId] int NOT NULL,
        [ScheduleId] int NULL,
        [VaccineName] nvarchar(max) NOT NULL,
        [Species] nvarchar(max) NOT NULL,
        [AnimalId] int NULL,
        [GroupId] int NULL,
        [ScheduledDate] datetime2 NULL,
        [DateAdministered] datetime2 NULL,
        [BatchNumber] nvarchar(max) NULL,
        [Administrator] nvarchar(max) NULL,
        [FollowUpDate] datetime2 NULL,
        [Status] nvarchar(max) NOT NULL,
        [Notes] nvarchar(max) NULL,
        [DosageNotes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_VaccinationRecords] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_VaccinationRecords_AnimalGroups_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [AnimalGroups] ([Id]),
        CONSTRAINT [FK_VaccinationRecords_Animals_AnimalId] FOREIGN KEY ([AnimalId]) REFERENCES [Animals] ([Id]),
        CONSTRAINT [FK_VaccinationRecords_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_VaccinationRecords_VaccinationSchedules_ScheduleId] FOREIGN KEY ([ScheduleId]) REFERENCES [VaccinationSchedules] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AnimalEvents_AnimalId] ON [AnimalEvents] ([AnimalId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AnimalGroups_FarmId] ON [AnimalGroups] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AnimalGroups_LocationId] ON [AnimalGroups] ([LocationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Animals_DamId] ON [Animals] ([DamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Animals_FarmId_TagId] ON [Animals] ([FarmId], [TagId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Animals_GroupId] ON [Animals] ([GroupId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Animals_LocationId] ON [Animals] ([LocationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Animals_SireId] ON [Animals] ([SireId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AuditLogs_FarmId] ON [AuditLogs] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Beehives_FarmId_HiveCode] ON [Beehives] ([FarmId], [HiveCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Beehives_LocationId] ON [Beehives] ([LocationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_BreedingRecords_DamId] ON [BreedingRecords] ([DamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_BreedingRecords_FarmId] ON [BreedingRecords] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_BreedingRecords_SireId] ON [BreedingRecords] ([SireId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Customers_FarmId] ON [Customers] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Deliveries_CustomerId] ON [Deliveries] ([CustomerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Deliveries_FarmId] ON [Deliveries] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Deliveries_SalesOrderId] ON [Deliveries] ([SalesOrderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_DeliveryItems_BatchId] ON [DeliveryItems] ([BatchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_DeliveryItems_DeliveryId] ON [DeliveryItems] ([DeliveryId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Expenses_FarmId] ON [Expenses] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Expenses_SupplierId] ON [Expenses] ([SupplierId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_FarmLocations_FarmId] ON [FarmLocations] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Farms_OwnerId] ON [Farms] ([OwnerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_FarmTasks_AssignedToUserId] ON [FarmTasks] ([AssignedToUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_FarmTasks_FarmId] ON [FarmTasks] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_FarmUsers_FarmId_UserId] ON [FarmUsers] ([FarmId], [UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_FarmUsers_UserId] ON [FarmUsers] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_HealthRecords_AnimalId] ON [HealthRecords] ([AnimalId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_HealthRecords_FarmId] ON [HealthRecords] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_HealthRecords_GroupId] ON [HealthRecords] ([GroupId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_HiveInspections_BeehiveId] ON [HiveInspections] ([BeehiveId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_InventoryItems_FarmId] ON [InventoryItems] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_InventoryItems_SupplierId] ON [InventoryItems] ([SupplierId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Invoices_FarmId] ON [Invoices] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Invoices_InvoiceNumber] ON [Invoices] ([InvoiceNumber]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Invoices_SalesOrderId] ON [Invoices] ([SalesOrderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Notifications_FarmId] ON [Notifications] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Payments_InvoiceId] ON [Payments] ([InvoiceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProductionBatches_FarmId_BatchCode] ON [ProductionBatches] ([FarmId], [BatchCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ProductionRecords_AnimalId] ON [ProductionRecords] ([AnimalId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ProductionRecords_BatchId] ON [ProductionRecords] ([BatchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ProductionRecords_BeehiveId] ON [ProductionRecords] ([BeehiveId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ProductionRecords_FarmId] ON [ProductionRecords] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ProductionRecords_GroupId] ON [ProductionRecords] ([GroupId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_SalesOrderItems_BatchId] ON [SalesOrderItems] ([BatchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_SalesOrderItems_SalesOrderId] ON [SalesOrderItems] ([SalesOrderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_SalesOrders_CustomerId] ON [SalesOrders] ([CustomerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_SalesOrders_FarmId] ON [SalesOrders] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_StockMovements_ItemId] ON [StockMovements] ([ItemId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Suppliers_FarmId] ON [Suppliers] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_VaccinationRecords_AnimalId] ON [VaccinationRecords] ([AnimalId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_VaccinationRecords_FarmId] ON [VaccinationRecords] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_VaccinationRecords_GroupId] ON [VaccinationRecords] ([GroupId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_VaccinationRecords_ScheduleId] ON [VaccinationRecords] ([ScheduleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_VaccinationSchedules_FarmId] ON [VaccinationSchedules] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023062252_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261023062252_InitialCreate', N'9.0.0');
END;

COMMIT;
GO

