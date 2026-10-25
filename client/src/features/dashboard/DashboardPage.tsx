import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Card, CardActionArea, CardContent, CardMedia, Chip, CircularProgress,
  Grid, List, ListItem, ListItemText, Stack, TextField, Typography,
} from '@mui/material';
import {
  PetsOutlined, OpacityOutlined, EggOutlined, EmojiNatureOutlined,
  VaccinesOutlined, LocalShippingOutlined, WarningAmberOutlined,
  AccountBalanceWalletOutlined, ReceiptLongOutlined, TrendingUpOutlined,
  CalendarMonthOutlined, AddCircleOutline,
} from '@mui/icons-material';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import type { DashboardSummary } from '../../types';

function Stat({
  label,
  value,
  hint,
  icon,
  accent = '#2e7d32',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 2.5,
        borderLeft: `4px solid ${accent}`,
        boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
      }}
    >
      <CardContent sx={{ p: 2.2, '&:last-child': { pb: 2.2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Typography variant="body2" fontWeight={700} sx={{ color: '#3b5240', fontSize: '0.88rem' }}>
            {label}
          </Typography>
          {icon && (
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.8,
                bgcolor: `${accent}18`,
                color: accent,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}
        </Stack>
        <Typography variant="h4" fontWeight={900} sx={{ color: '#112617', mt: 1, fontSize: '1.65rem' }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" sx={{ color: '#5c7361', fontWeight: 500, display: 'block', mt: 0.4 }}>
            {hint}
          </Typography>
        )}
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
      image: '/images/chickens.jpg',
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
      {/* Top Visual Hero Banner with High-Contrast Date Control Bar */}
      <Box
        sx={{
          borderRadius: 3.5,
          overflow: 'hidden',
          position: 'relative',
          backgroundImage: 'linear-gradient(95deg, rgba(12, 36, 20, 0.92) 0%, rgba(18, 56, 31, 0.78) 55%, rgba(12, 36, 20, 0.65) 100%), url(/images/farm-harvest-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#fff',
          p: { xs: 2.5, md: 4 },
          boxShadow: '0 10px 28px rgba(0,0,0,0.14)',
        }}
      >
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', lg: 'center' }} spacing={2.5}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
              <Chip label="🌾 LIVE FARM COMMAND CENTER" size="small" sx={{ bgcolor: '#43a047', color: '#fff', fontWeight: 800 }} />
              {currentFarm?.county && (
                <Chip label={`📍 ${currentFarm.county}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700 }} />
              )}
            </Stack>
            <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: '1.6rem', md: '2.1rem' }, letterSpacing: -0.4 }}>
              {currentFarm?.name ?? 'Smart Farm Overview'}
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', maxWidth: 640, mt: 0.5, fontSize: '0.96rem' }}>
              {currentFarm?.description ?? 'Unified monitoring for Goats, Sheep, Dairy Cows, Poultry Flocks, and Beehives.'}
            </Typography>
          </Box>

          {/* Frosted High-Visibility Date & Action Bar (No Clipped Floating Label!) */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{
              p: 1.5,
              borderRadius: 3,
              bgcolor: 'rgba(10, 28, 16, 0.78)',
              backdropFilter: 'blur(12px)',
              border: '1.5px solid rgba(255, 255, 255, 0.28)',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1 }}>
              <CalendarMonthOutlined sx={{ color: '#81c784', fontSize: 22 }} />
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#ffffff', whiteSpace: 'nowrap', fontSize: '0.92rem' }}>
                Dashboard Date:
              </Typography>
            </Stack>
            <TextField
              type="date"
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              inputProps={{ 'aria-label': 'Dashboard Date' }}
              sx={{
                bgcolor: '#ffffff',
                borderRadius: 2,
                minWidth: 165,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontWeight: 700,
                  color: '#112617',
                  '& fieldset': { border: 'none' },
                },
              }}
            />
            <Button
              variant="contained"
              color="warning"
              size="medium"
              startIcon={<AddCircleOutline />}
              onClick={() => navigate('/production')}
              sx={{
                fontWeight: 800,
                textTransform: 'none',
                borderRadius: 2,
                px: 2.2,
                py: 1,
                fontSize: '0.95rem',
                whiteSpace: 'nowrap',
              }}
            >
              Log Production
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Visual Enterprise & Species Showcase Cards */}
      <Box>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5, color: '#132a19' }}>
          Farm Enterprises & Species Breakdown
        </Typography>
        <Grid container spacing={2}>
          {speciesCards.map((item) => (
            <Grid key={item.title} size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Card sx={{ height: '100%', borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                <CardActionArea onClick={() => navigate(item.to)} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                  <CardMedia component="img" height="130" image={item.image} alt={item.title} sx={{ objectFit: 'cover' }} />
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={800} color="primary.main" sx={{ lineHeight: 1.2 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="h4" fontWeight={900} sx={{ my: 0.6, color: '#112617', fontSize: '1.6rem' }}>
                      {item.count}{' '}
                      <Typography component="span" variant="body2" fontWeight={700} color="text.secondary">
                        {item.unit}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#546b58', fontSize: '0.84rem', fontWeight: 500 }}>
                      {item.sub}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Core Operational KPIs with Icons & Color Accents */}
      <Box>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5, color: '#132a19' }}>
          Today's Operational & Health Indicators
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Stat label="Total Tagged Livestock" value={data.totalAnimals} hint="Active individual animals" icon={<PetsOutlined fontSize="small" />} accent="#1b5e20" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Stat label="Milk Collected Today" value={`${data.todayMilkLitres} L`} hint="Net accepted litres" icon={<OpacityOutlined fontSize="small" />} accent="#0277bd" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Stat label="Eggs Collected Today" value={data.todayEggsCount} hint="Net unbroken eggs" icon={<EggOutlined fontSize="small" />} accent="#f9a825" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Stat label="Honey Harvested Today" value={`${data.todayHoneyKg} kg`} hint="Extracted honey weight" icon={<EmojiNatureOutlined fontSize="small" />} accent="#ef6c00" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Stat label="Vaccinations Due (Next 7 Days)" value={data.upcomingVaccinations} hint="Scheduled herd/flock doses" icon={<VaccinesOutlined fontSize="small" />} accent="#6a1b9a" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Stat label="Pending & Dispatched Deliveries" value={data.pendingDeliveries} hint="Awaiting customer receipt" icon={<LocalShippingOutlined fontSize="small" />} accent="#1565c0" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Stat label="Low-Stock Inventory Alerts" value={data.lowStockItems} hint="Items at or below threshold" icon={<WarningAmberOutlined fontSize="small" />} accent="#c62828" />
          </Grid>
        </Grid>
      </Box>

      {/* Financial Snapshot */}
      <Box>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5, color: '#132a19' }}>
          Monthly Financial Snapshot
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stat label="Monthly Revenue (Cash Received)" value={money(data.monthlyRevenue)} hint="Payments collected this month" icon={<AccountBalanceWalletOutlined fontSize="small" />} accent="#2e7d32" />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stat label="Monthly Operating Expenses" value={money(data.monthlyExpenses)} hint="Feed, veterinary, labour & utilities" icon={<ReceiptLongOutlined fontSize="small" />} accent="#d84315" />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stat label="Net Cash Operating Surplus" value={money(data.monthlyProfit)} hint="Cash received minus monthly expenses" icon={<TrendingUpOutlined fontSize="small" />} accent="#1b5e20" />
          </Grid>
        </Grid>
      </Box>

      {/* Production Chart & Alerts */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={800} gutterBottom sx={{ color: '#132a19' }}>
                Production Output — Last 7 Days
              </Typography>
              <Box sx={{ height: 310 }}>
                <ResponsiveContainer>
                  <BarChart data={data.productionChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" /><YAxis /><Tooltip /><Legend />
                    <Bar dataKey="milk" name="Milk (L)" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="eggs" name="Eggs (pcs)" fill="#f9a825" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="honey" name="Honey (kg)" fill="#ef6c00" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={800} gutterBottom sx={{ color: '#132a19' }}>
                Active Farm Alerts
              </Typography>
              {data.recentAlerts.length === 0 ? (
                <Alert severity="success" sx={{ mt: 1, borderRadius: 2 }}>
                  All farm sections are operating normally with no urgent alerts.
                </Alert>
              ) : (
                <List dense>
                  {data.recentAlerts.map((a, i) => (
                    <ListItem
                      key={i}
                      sx={{
                        mb: 1,
                        borderRadius: 2,
                        bgcolor: a.severity === 'warning' ? '#fff8e1' : '#e8f5e9',
                        border: '1px solid #e0e8e1',
                      }}
                    >
                      <ListItemText
                        primary={<Typography variant="body2" fontWeight={700}>{a.message}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary">{a.type}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
