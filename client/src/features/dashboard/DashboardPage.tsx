import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Card, CardContent, CircularProgress, Grid, List, ListItem, ListItemText, Stack, TextField, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState } from 'react';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import type { DashboardSummary } from '../../types';

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={700}>{value}</Typography>
        {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
      </CardContent>
    </Card>
  );
}

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardPage() {
  const { farmId } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', farmId, date],
    enabled: !!farmId,
    queryFn: async () => (await api.get<DashboardSummary>(`/farms/${farmId}/dashboard`, { params: { date } })).data,
  });

  if (!farmId) return <Alert severity="info">Create or select a farm in Farm Settings to see your dashboard.</Alert>;
  if (isLoading) return <CircularProgress aria-label="Loading dashboard" />;
  if (error || !data) return <Alert severity="error">{errorMessage(error)}</Alert>;

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Typography variant="h5" fontWeight={700}>Farm overview</Typography>
        <TextField label="Date" type="date" size="small" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Stack>

      <Grid container spacing={2}>
        {[
          ['Total livestock', data.totalAnimals], ['Goats', data.totalGoats], ['Sheep', data.totalSheep],
          ['Cows', data.totalCows], ['Chickens', data.totalChickens], ['Active beehives', data.activeBeehives],
          ['Milk today (L)', data.todayMilkLitres], ['Eggs today', data.todayEggsCount], ['Honey today (kg)', data.todayHoneyKg],
          ['Vaccinations due (7d)', data.upcomingVaccinations], ['Pending deliveries', data.pendingDeliveries], ['Low-stock items', data.lowStockItems],
        ].map(([label, value]) => (
          <Grid key={label as string} size={{ xs: 6, sm: 4, md: 2 }}><Stat label={label as string} value={value as number} /></Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}><Stat label="Monthly revenue (cash received)" value={money(data.monthlyRevenue)} hint="Payments received this month" /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><Stat label="Monthly expenses" value={money(data.monthlyExpenses)} /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><Stat label="Operating profit (cash basis)" value={money(data.monthlyProfit)} hint="Cash received minus expenses; not accrual profit" /></Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card><CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Production — last 7 days</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={data.productionChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" /><YAxis /><Tooltip /><Legend />
                  <Bar dataKey="milk" name="Milk (L)" fill="#2e7d32" />
                  <Bar dataKey="eggs" name="Eggs" fill="#f9a825" />
                  <Bar dataKey="honey" name="Honey (kg)" fill="#ef6c00" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}><CardContent>
            <Typography variant="subtitle1" fontWeight={600}>Alerts</Typography>
            {data.recentAlerts.length === 0
              ? <Typography variant="body2" color="text.secondary">No active alerts.</Typography>
              : <List dense>{data.recentAlerts.map((a, i) => (
                  <ListItem key={i} disableGutters><ListItemText primary={a.message} secondary={a.type} /></ListItem>
                ))}</List>}
          </CardContent></Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
