export interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AuthResponse extends AuthUser {
  accessToken: string;
  refreshToken: string;
}

export interface Farm {
  id: number;
  name: string;
  description?: string;
  address?: string;
  county?: string;
  country?: string;
  phoneNumber?: string;
  email?: string;
  ownerId: string;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

export interface Animal {
  id: number;
  tagId: string;
  name?: string;
  species: string;
  breed?: string;
  sex: string;
  dateOfBirth?: string;
  status: string;
  currentWeightKg?: number;
  acquisitionType: string;
  locationName?: string;
  groupName?: string;
}

export interface Beehive {
  id: number;
  hiveCode: string;
  apiaryName?: string;
  hiveType: string;
  colonyStatus: string;
  queenStatus: string;
  lastInspectionDate?: string;
}

export interface DashboardSummary {
  totalAnimals: number;
  totalGoats: number;
  totalSheep: number;
  totalCows: number;
  totalChickens: number;
  activeBeehives: number;
  todayMilkLitres: number;
  todayEggsCount: number;
  todayHoneyKg: number;
  upcomingVaccinations: number;
  pendingDeliveries: number;
  lowStockItems: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthlyProfit: number;
  productionChart: { date: string; milk: number; eggs: number; honey: number }[];
  recentAlerts: { type: string; message: string; severity: string; createdAt: string }[];
}
