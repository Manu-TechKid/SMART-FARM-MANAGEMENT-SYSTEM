# Smart Farm Management System

A full-stack, multi-species **Smart Farm Management System** for managing **Goats, Sheep, Beehives, Cows, and Chickens** across livestock registration, flock/batch management, breeding, daily production, veterinarian-approved vaccination & clinical records, stock-deducting deliveries, feed & inventory, sales/invoicing/finance, smart reminders, role-based staff permissions, audit trails, and exportable PDF/Excel reports.

---

## Technology Stack

- **Frontend:** React + TypeScript + Vite + Material UI + Recharts + TanStack React Query (`client/`)
- **Backend:** ASP.NET Core 9 Web API + REST Controllers (`src/SmartFarm.Api/`)
- **Database & ORM:** Microsoft SQL Server / SQL Server LocalDB + Entity Framework Core 9 (`Migrations/`)
- **Security:** ASP.NET Core Identity + JWT Bearer authentication + Farm-level multi-tenant isolation + Role permissions + Audit logging
- **Testing:** xUnit unit/integration test suite (`src/SmartFarm.Tests/`) + end-to-end API smoke test suite

---

## Setup & Running Instructions

### 1. Configure SQL Server & Apply Migrations

By default, `src/SmartFarm.Api/appsettings.Development.json` uses SQL Server LocalDB (`(localdb)\MSSQLLocalDB`), or you can point `DefaultConnection` to any SQL Server instance:

```powershell
cd "d:\SMART FARM MANAGEMENT SYSTEM\src\SmartFarm.Api"
sqllocaldb start MSSQLLocalDB
dotnet ef database update
```

### 2. Run the .NET Backend API

```powershell
cd "d:\SMART FARM MANAGEMENT SYSTEM\src\SmartFarm.Api"
dotnet run --urls http://localhost:5080
```
- Swagger UI: `http://localhost:5080/swagger`
- Health Check: `http://localhost:5080/health`

### 3. Run the React Frontend

```powershell
cd "d:\SMART FARM MANAGEMENT SYSTEM\client"
npm install
npm run dev
```
- Web App: `http://localhost:5173`

### 4. Demo Data Policy

No fake production records are created automatically. After registering a user and creating a farm in **Farm Settings**, you may optionally click **"Load Explicitly Labeled [DEMO] Dataset"** in Farm Settings (`POST /api/farms/{farmId}/seed-demo`) to populate clearly labeled `[DEMO]` livestock, flocks, beehives, production batches, vaccinations, inventory, and sales for evaluation.

### 5. Run Automated Tests

```powershell
cd "d:\SMART FARM MANAGEMENT SYSTEM"
dotnet test src\SmartFarm.Tests\SmartFarm.Tests.csproj
```
