# Smart Farm Management System

A full-stack, multi-species **Smart Farm Management System** for managing **Goats, Sheep, Beehives, Cows, and Chickens** across livestock registration, flock/batch management, breeding, daily production, veterinarian-approved vaccination & clinical records, stock-deducting deliveries, feed & inventory, sales/invoicing/finance, smart reminders, role-based staff permissions, audit trails, and exportable PDF/Excel reports.

---

## Technology Stack

- **Frontend:** React + TypeScript + Vite + Material UI + Recharts + TanStack React Query (`client/` and bundled into `src/SmartFarm.Api/wwwroot/`)
- **Backend:** ASP.NET Core 9 Web API + REST Controllers (`src/SmartFarm.Api/`)
- **Database & ORM:** Microsoft SQL Server / SQL Server LocalDB + Entity Framework Core 9 (`src/SmartFarm.Api/Migrations/`)
- **Security:** ASP.NET Core Identity + JWT Bearer authentication + Farm-level multi-tenant isolation + Role permissions + Audit logging
- **Testing:** Backend xUnit unit/integration test suite (`src/SmartFarm.Tests/`) + Frontend Vitest component tests (`client/`)

---

## Step-by-Step Database Migration Guide

### Step 1: Configure Your SQL Server Connection String
Open `src/SmartFarm.Api/appsettings.Development.json` (or `src/SmartFarm.Api/appsettings.json` for production) and verify `ConnectionStrings:DefaultConnection`:

- **SQL Server LocalDB (Default for Development):**
  ```json
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\MSSQLLocalDB;Database=SmartFarmDb_Dev;Trusted_Connection=True;TrustServerCertificate=True;"
  }
  ```
- **SQL Server Express / Full SQL Server (Windows Authentication):**
  ```json
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost\\SQLEXPRESS;Database=SmartFarmDb;Trusted_Connection=True;TrustServerCertificate=True;"
  }
  ```
- **SQL Server (SQL Login / Username & Password):**
  ```json
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SERVER_NAME;Database=SmartFarmDb;User Id=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=True;"
  }
  ```

---

### Step 2: Apply Migrations to Create/Update the Database

You can migrate the database using **any one** of the following three methods:

#### Method A: Automatic Migration on Startup (Easiest)
When you run `SmartFarm.Api` (by pressing **F5** / **Start** in Visual Studio or running `dotnet run`), `Program.cs` automatically executes:
```csharp
await db.Database.MigrateAsync();
await DbSeeder.SeedRolesAsync(roleManager);
```
This creates the database (`SmartFarmDb_Dev`), applies all pending migrations (`20261023062252_InitialCreate`), and seeds all 9 farm system roles automatically.

#### Method B: Using Visual Studio Package Manager Console (PMC)
1. In Visual Studio, go to **Tools** $\rightarrow$ **NuGet Package Manager** $\rightarrow$ **Package Manager Console**.
2. In the **Default project** dropdown at the top of the console, select **`src\SmartFarm.Api`** (or `SmartFarm.Api`).
3. Ensure `SmartFarm.Api` is not currently running (click Stop if debugging).
4. Run the following command to apply all migrations to SQL Server:
   ```powershell
   Update-Database
   ```
5. *(Optional)* If you modify or add any entity models in `src/SmartFarm.Api/Models/` later, create and apply a new migration with:
   ```powershell
   Add-Migration AddNewModuleChanges
   Update-Database
   ```

#### Method C: Using the .NET CLI (`dotnet ef`) in PowerShell / Terminal
1. Install the EF Core CLI tool globally (if not already installed):
   ```powershell
   dotnet tool install --global dotnet-ef
   ```
2. Start LocalDB (if using LocalDB) and navigate to the API project folder:
   ```powershell
   sqllocaldb start MSSQLLocalDB
   cd "d:\SMART FARM MANAGEMENT SYSTEM\src\SmartFarm.Api"
   ```
3. Apply the migrations to the database:
   ```powershell
   dotnet ef database update
   ```
4. *(Optional)* To create a new migration after editing domain models:
   ```powershell
   dotnet ef migrations add YourMigrationName
   dotnet ef database update
   ```
5. *(Optional)* To generate an idempotent SQL script for production DBA deployment:
   ```powershell
   dotnet ef migrations script --idempotent --output SmartFarm_Migration.sql
   ```

---

## Running the Application

### Option 1: Directly from Visual Studio (`SmartFarm.sln`)
1. Open `SmartFarm.sln` in Visual Studio 2022.
2. Set **`SmartFarm.Api`** as the Startup Project.
3. Press **F5** (or click the green **https** / **http** Start button).
4. The browser will open **`https://localhost:7268/`** serving the full **Smart Farm Management System React UI** (and API endpoints at `/api/...`, Swagger docs at `/api-docs`, and health check at `/health`).

### Option 2: From the Command Line (Backend + Frontend Dev Server)
```powershell
# Terminal 1: Run ASP.NET Core 9 Backend API
cd "d:\SMART FARM MANAGEMENT SYSTEM\src\SmartFarm.Api"
dotnet run --urls http://localhost:5080

# Terminal 2: Run Vite React Frontend with HMR (Optional during UI development)
cd "d:\SMART FARM MANAGEMENT SYSTEM\client"
npm install
npm run dev
```

---

## Demo Data Policy

No fake production records are created automatically. On the Login screen, you can either register your own farm account or click **"🚀 Open Interactive [DEMO] Farm Dashboard"** (or click **"Load `[DEMO]` Sample Records"** inside **Farm Settings**) to explicitly load clearly labeled `[DEMO]` livestock, flocks, beehives, production batches, vaccinations, inventory, and sales.

---

## Running Automated Tests

```powershell
# Backend xUnit Unit & Integration Tests (5 tests)
cd "d:\SMART FARM MANAGEMENT SYSTEM"
dotnet test

# Frontend Vitest Component Tests
cd "d:\SMART FARM MANAGEMENT SYSTEM\client"
npm test
```
