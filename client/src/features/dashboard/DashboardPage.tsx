import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Card, CardActionArea, CardContent, CardMedia, Chip, CircularProgress,
  Grid, List, ListItem, ListItemText, Stack, TextField, Typography,
} from '@mui/material';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { farmId, farms } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const currentFarm = farms.find((f) => f.id === farmId);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', farmId, date],
    enabled: !!farmId,
    queryFn: async () => (await api.get<DashboardSummary>(`/farms/${farmId}/dashboard`, { params: { date } })).data,
  });

  if (!farmId) return <Alert severity="info">Create or select a farm in Farm Settings to see your dashboard.</Alert>;
  if (isLoading) return <CircularProgress aria-label="Loading dashboard" />;
  if (error || !data) return <Alert severity="error">{errorMessage(error)}</Alert>;

  const speciesCards = [
    {
      title: 'Goat Herd',
      count: data.totalGoats,
      unit: 'Active Goats',
      sub: 'Breeding, kidding, milk & vaccinations',
      image: '/images/goats.jpg',
      to: '/livestock',
    },
    {
      title: 'Sheep Flock',
      count: data.totalSheep,
      unit: 'Active Sheep',
      sub: 'Lambing, wool shearing & pasture health',
      image: '/images/sheep.jpg',
      to: '/livestock',
    },
    {
      title: 'Dairy & Beef Cattle',
      count: data.totalCows,
      unit: 'Active Cows',
      sub: `${data.todayMilkLitres} L milk collected today`,
      image: '/images/cows.jpg',
      to: '/livestock',
    },
    {
      title: 'Poultry & Egg Flocks',
      count: data.totalChickens,
      unit: 'Birds in Flocks',
      sub: `${data.todayEggsCount} eggs collected today`,
      image: '/images/farm-harvest-hero.jpg',
      to: '/livestock',
    },
    {
      title: 'Apiaries & Beehives',
      count: data.activeBeehives,
      unit: 'Active Hives',
      sub: `${data.todayHoneyKg} kg honey harvested today`,
      image: '/images/beehives.jpg',
      to: '/beehives',
    },
  ];

  return (
    <Stack spacing={3}>
      {/* Top Visual Hero Banner */}
      <Box
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative',
          backgroundImage: 'linear-gradient(95deg, rgba(14, 42, 24, 0.9) 0%, rgba(20, 62, 35, 0.72) 55%, rgba(14, 42, 24, 0.5) 100%), url(/images/farm-harvest-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#fff',
          p: { xs: 2.5, md: 4 },
          boxShadow: '0 8px 26px rgba(0,0,0,0.12)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Chip label="LIVE FARM COMMAND CENTER" size="small" sx={{ bgcolor: '#43a047', color: '#fff', fontWeight: 700 }} />
              {currentFarm?.county && <Chip label={currentFarm.county} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />}
            </Stack>
            <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
              {currentFarm?.name ?? 'Smart Farm Overview'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.88)', maxWidth: 640, mt: 0.5 }}>
              {currentFarm?.description ?? 'Unified monitoring for Goats, Sheep, Dairy Cows, Poultry Flocks, and Beehives.'}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              label="Dashboard Date"
              type="date"
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                bgcolor: 'rgba(255,255,255,0.95)',
                borderRadius: 1,
                minWidth: 165,
              }}
            />
            <Button variant="contained" color="warning" onClick={() => navigate('/production')} sx={{ fontWeight: 700 }}>
              + Log Production
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Visual Enterprise & Species Showcase Cards */}
      <Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          Farm Enterprises & Species Breakdown
        </Typography>
        <Grid container spacing={2}>
          {speciesCards.map((item) => (
            <Grid key={item.title} size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Card sx={{ height: '100%', borderRadius: 2.5, overflow: 'hidden', boxShadow: 2 }}>
                <CardActionArea onClick={() => navigate(item.to)} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                  <CardMedia component="img" height="125" image={item.image} alt={item.title} sx={{ objectFit: 'cover' }} />
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                      {item.title}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ my: 0.5 }}>
                      {item.count} <Typography component="span" variant="caption" color="text.secondary">{item.unit}</Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {item.sub}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Core Operational KPIs */}
      <Grid container spacing={2}>
        {[
          ['Total livestock', data.totalAnimals],
          ['Milk today (L)', data.todayMilkLitres],
          ['Eggs today', data.todayEggsCount],
          ['Honey today (kg)', data.todayHoneyKg],
          ['Vaccinations due (7d)', data.upcomingVaccinations],
          ['Pending deliveries', data.pendingDeliveries],
          ['Low-stock items', data.lowStockItems],
        ].map(([label, value]) => (
          <Grid key={label as string} size={{ xs: 6, sm: 4, md: 1.71 }}>
            <Stat label={label as string} value={value as number} />
          </Grid>
        ))}
      </Grid>

      {/* Financial Snapshot */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}><Stat label="Monthly revenue (cash received)" value={money(data.monthlyRevenue)} hint="Payments received this month" /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><Stat label="Monthly expenses" value={money(data.monthlyExpenses)} /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><Stat label="Operating profit (cash basis)" value={money(data.monthlyProfit)} hint="Cash received minus expenses; not accrual profit" /></Grid>
      </Grid>

      {/* Production Chart & Alerts */}
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
