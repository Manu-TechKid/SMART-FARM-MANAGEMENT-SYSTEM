import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Link, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from './AuthContext';
import { api, errorMessage } from '../../api/client';
import type { Farm } from '../../types';

const SHOWCASE_SLIDES = [
  {
    image: '/images/farm-harvest-hero.jpg',
    tag: 'All-in-One AgriTech Platform',
    title: 'Integrated Livestock, Dairy, Poultry & Apiary Operations',
    subtitle: 'Track daily milk, eggs, honey, veterinary care, stock-deducting deliveries, and farm profitability in one unified system.',
  },
  {
    image: '/images/cows.jpg',
    tag: 'Cattle & Dairy Management',
    title: 'Precision Dairy & Herd Performance',
    subtitle: 'Monitor ear tags, breeding & calving cycles, daily milk yields, veterinary withdrawals, and feed rations.',
  },
  {
    image: '/images/goats.jpg',
    tag: 'Goat Herd Management',
    title: 'Complete Goat Lineage, Health & Milk Tracking',
    subtitle: 'Register Boer and dairy goats, track mating and kidding milestones, and manage scheduled vaccinations.',
  },
  {
    image: '/images/sheep.jpg',
    tag: 'Sheep & Wool Operations',
    title: 'Flock Growth, Lambing & Shearing Records',
    subtitle: 'Track pasture rotations, lambing parentage, wool harvest batches, and flock mortality analytics.',
  },
  {
    image: '/images/beehives.jpg',
    tag: 'Apiary & Beehive Management',
    title: 'Colony Strength, Queen Status & Honey Harvests',
    subtitle: 'Log hive inspections, brood patterns, pest treatments, and traceable honey & beeswax batches.',
  },
];

export default function LoginPage() {
  const { login, register, refreshFarms, setFarmId } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);

  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const activeSlide = SHOWCASE_SLIDES[slideIdx];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailValid || !password) { setError('Enter a valid email and password.'); return; }
    setBusy(true); setError('');
    try { await login(email, password); navigate('/'); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  const launchDemo = async () => {
    setBusy(true); setError('');
    const demoEmail = 'demo@smartfarm.local';
    const demoPass = 'FarmDemo@2026';
    try {
      try {
        await login(demoEmail, demoPass);
      } catch {
        await register('Demo', 'Manager', demoEmail, demoPass);
      }
      let list = await refreshFarms();
      let farm = list[0];
      if (!farm) {
        const { data } = await api.post<Farm>('/farms', {
          name: '[DEMO] Green Valley Smart Farm',
          description: 'Integrated Livestock, Dairy, Poultry & Apiary Operations',
          address: 'Nanyuki Highway',
          county: 'Laikipia',
          country: 'Kenya',
          phoneNumber: '+254700123456',
          email: demoEmail,
        });
        farm = data;
        list = await refreshFarms();
      }
      if (farm) {
        setFarmId(farm.id);
        await api.post(`/farms/${farm.id}/seed-demo`).catch(() => undefined);
      }
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.25fr 1fr' }, bgcolor: 'background.default' }}>
      {/* Left Visual Showcase Panel */}
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 300, md: '100vh' },
          backgroundImage: `linear-gradient(180deg, rgba(12, 38, 22, 0.35) 0%, rgba(10, 32, 18, 0.88) 100%), url(${activeSlide.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { xs: 3, md: 6 },
          color: '#fff',
          transition: 'background-image 0.4s ease-in-out',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip label="🌾 SMART FARM OS" sx={{ bgcolor: 'rgba(46, 125, 50, 0.9)', color: '#fff', fontWeight: 700 }} />
          <Chip label={activeSlide.tag} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', backdropFilter: 'blur(6px)' }} />
        </Stack>

        <Box sx={{ maxWidth: 640, my: { xs: 3, md: 0 } }}>
          <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, lineHeight: 1.2, mb: 1.5, textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>
            {activeSlide.title}
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: { xs: '0.95rem', md: '1.1rem' }, mb: 3 }}>
            {activeSlide.subtitle}
          </Typography>

          {/* Interactive Photo Thumbnail Selector */}
          <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 1 }}>
            {SHOWCASE_SLIDES.map((s, idx) => (
              <Box
                key={s.image}
                onClick={() => setSlideIdx(idx)}
                sx={{
                  width: 76,
                  height: 52,
                  borderRadius: 1.5,
                  backgroundImage: `url(${s.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: 'pointer',
                  border: idx === slideIdx ? '2.5px solid #81c784' : '2px solid rgba(255,255,255,0.35)',
                  opacity: idx === slideIdx ? 1 : 0.7,
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  '&:hover': { opacity: 1, transform: 'translateY(-2px)' },
                }}
                title={s.tag}
              />
            ))}
          </Stack>
        </Box>

        <Stack direction="row" spacing={3} sx={{ display: { xs: 'none', sm: 'flex' }, color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
          <span>🐐 Goats</span>
          <span>🐑 Sheep</span>
          <span>🐄 Dairy Cattle</span>
          <span>🐔 Poultry Flocks</span>
          <span>🐝 Beehives & Honey</span>
        </Stack>
      </Box>

      {/* Right Authentication Form Panel */}
      <Box sx={{ display: 'grid', placeItems: 'center', p: { xs: 2.5, md: 5 }, bgcolor: '#f6f8f5' }}>
        <Card sx={{ width: '100%', maxWidth: 440, boxShadow: '0 12px 32px rgba(0,0,0,0.08)', borderRadius: 3 }}>
          <CardContent component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 2.2, p: { xs: 3, sm: 4 } }}>
            <Box>
              <Typography variant="h5" fontWeight={800} color="primary.main">
                Sign in to Smart Farm
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage your livestock, apiaries, production, inventory & finance
              </Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={email.length > 0 && !emailValid}
              helperText={email.length > 0 && !emailValid ? 'Invalid email' : ' '}
              autoComplete="email"
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ py: 1.3, fontWeight: 700 }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
            <Divider>OR</Divider>
            <Button
              type="button"
              variant="outlined"
              color="secondary"
              size="large"
              disabled={busy}
              onClick={launchDemo}
              sx={{ py: 1.2, fontWeight: 700 }}
            >
              🚀 Open Interactive [DEMO] Farm Dashboard
            </Button>
            <Typography variant="body2" textAlign="center" sx={{ mt: 1 }}>
              No account? <Link component={RouterLink} to="/register" fontWeight={600}>Register a new farm account</Link>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
