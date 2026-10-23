import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './features/auth/AuthContext';
import AppLayout from './layouts/AppLayout';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const LivestockPage = lazy(() => import('./features/livestock/LivestockPage'));
const BeehivesPage = lazy(() => import('./features/beehives/BeehivesPage'));
const ProductionPage = lazy(() => import('./features/production/ProductionPage'));
const VeterinaryPage = lazy(() => import('./features/veterinary/VeterinaryPage'));
const BreedingPage = lazy(() => import('./features/breeding/BreedingPage'));
const DeliveriesPage = lazy(() => import('./features/deliveries/DeliveriesPage'));
const InventoryPage = lazy(() => import('./features/inventory/InventoryPage'));
const SalesPage = lazy(() => import('./features/sales/SalesPage'));
const FinancePage = lazy(() => import('./features/finance/FinancePage'));
const TasksPage = lazy(() => import('./features/tasks/TasksPage'));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage'));
const UsersPage = lazy(() => import('./features/users/UsersPage'));
const FarmSettingsPage = lazy(() => import('./features/settings/FarmSettingsPage'));

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Box sx={{ p: 4, display: 'grid', placeItems: 'center' }}><CircularProgress aria-label="Loading" /></Box>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<Box sx={{ p: 4, display: 'grid', placeItems: 'center' }}><CircularProgress aria-label="Loading page" /></Box>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<Protected><AppLayout /></Protected>}>
          <Route index element={<DashboardPage />} />
          <Route path="livestock" element={<LivestockPage />} />
          <Route path="beehives" element={<BeehivesPage />} />
          <Route path="production" element={<ProductionPage />} />
          <Route path="veterinary" element={<VeterinaryPage />} />
          <Route path="breeding" element={<BreedingPage />} />
          <Route path="deliveries" element={<DeliveriesPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<FarmSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
