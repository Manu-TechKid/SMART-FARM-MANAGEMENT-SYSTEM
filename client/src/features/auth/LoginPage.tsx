import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, IconButton, InputAdornment, Link, Stack,
  TextField, Typography,
} from '@mui/material';
import {
  Visibility, VisibilityOff, EmailOutlined, LockOutlined,
  ArrowForward, VerifiedUserOutlined, AutoAwesomeOutlined,
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { api, errorMessage } from '../../api/client';
import type { Farm } from '../../types';

const SHOWCASE_SLIDES = [
  {
    key: 'All',
    icon: '🌾',
    label: 'All Enterprises',
    image: '/images/farm-harvest-hero.jpg',
    tag: 'Unified AgriTech Command Center',
    title: 'Every herd, flock, hive, and harvest in one platform',
    subtitle: 'Real-time production tracking for milk, eggs, honey, veterinary compliance, stock-deducting dispatches, and farm profitability.',
    metrics: ['5 Farm Enterprises', 'Batch Traceability', 'Live P&L Analytics'],
  },
  {
    key: 'Cow',
    icon: '🐄',
    label: 'Dairy Cattle',
    image: '/images/cows.jpg',
    tag: 'Cattle & Dairy Operations',
    title: 'Precision dairy yields & herd health',
    subtitle: 'Track individual ear tags, calving & gestation timelines, daily milk collection, and veterinary withdrawal periods.',
    metrics: ['Daily Milk Logs', 'AI & Calving Tracker', 'Vet Withdrawals'],
  },
  {
    key: 'Goat',
    icon: '🐐',
    label: 'Goats',
    image: '/images/goats.jpg',
    tag: 'Goat Herd Management',
    title: 'Complete Boer & dairy goat lineage',
    subtitle: 'Manage buck/doe parentage, kidding records, weight growth checks, and scheduled herd vaccinations.',
    metrics: ['Lineage & Kidding', 'Weight Checks', 'Vaccine Reminders'],
  },
  {
    key: 'Sheep',
    icon: '🐑',
    label: 'Sheep',
    image: '/images/sheep.jpg',
    tag: 'Sheep & Wool Operations',
    title: 'Flock growth, lambing & wool harvests',
    subtitle: 'Monitor pasture rotations, lambing seasons, shearing yields, and flock mortality analytics across sections.',
    metrics: ['Wool Batching', 'Pasture Sections', 'Flock Analytics'],
  },
  {
    key: 'Beehive',
    icon: '🐝',
    label: 'Apiaries',
    image: '/images/beehives.jpg',
    tag: 'Apiary & Beehive Management',
    title: 'Colony strength, queen status & honey extraction',
    subtitle: 'Record brood frame inspections, pest treatments, queen health scores, and traceable honey & beeswax batches.',
    metrics: ['Queen & Brood Logs', 'Inspection Alerts', 'Honey & Wax Batches'],
  },
];

export default function LoginPage() {
  const { login, register, refreshFarms, setFarmId } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);

  // Forgot password dialog state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const activeSlide = SHOWCASE_SLIDES[slideIdx];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailValid || !password) {
      setError('Please enter a valid email address and password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const launchDemo = async () => {
    setBusy(true);
    setError('');
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

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim()) return;
    await api.post('/auth/forgot-password', { email: forgotEmail.trim() }).catch(() => undefined);
    setForgotSent(true);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(460px, 46%) 1fr' },
        bgcolor: '#ffffff',
      }}
    >
      {/* LEFT PANEL: Full-Bleed Executive Workspace (No Floating Small Box) */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          px: { xs: 3, sm: 6, lg: 8 },
          py: { xs: 3.5, md: 4.5 },
          bgcolor: '#ffffff',
          borderRight: { md: '1px solid #edf2ee' },
        }}
      >
        {/* Top Brand Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                background: 'linear-gradient(135deg, #1b5e20 0%, #43a047 100%)',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontWeight: 900,
                fontSize: '1.1rem',
                boxShadow: '0 6px 16px rgba(46, 125, 50, 0.28)',
              }}
            >
              SF
            </Box>
            <Box sx={{ pl: 1.5, borderLeft: '2px solid #e0e8e1' }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.1, color: '#132a19', letterSpacing: -0.3 }}>
                SmartFarm
              </Typography>
              <Typography variant="caption" sx={{ color: '#5c7261', fontWeight: 600 }}>
                Agricultural ERP & Telemetry
              </Typography>
            </Box>
          </Stack>

          <Chip
            size="small"
            label="● Live SQL Server"
            sx={{
              bgcolor: '#e8f5e9',
              color: '#1b5e20',
              fontWeight: 700,
              fontSize: '0.72rem',
            }}
          />
        </Stack>

        {/* Center Main Authentication Form */}
        <Box sx={{ width: '100%', maxWidth: 420, mx: 'auto', my: { xs: 4, md: 2 } }}>
          {/* Interactive Enterprise Selector Pills */}
          <Stack direction="row" spacing={0.8} sx={{ mb: 2.5, overflowX: 'auto', pb: 0.5 }}>
            {SHOWCASE_SLIDES.map((s, idx) => {
              const active = idx === slideIdx;
              return (
                <Chip
                  key={s.key}
                  label={`${s.icon} ${s.label}`}
                  size="small"
                  onClick={() => setSlideIdx(idx)}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    bgcolor: active ? '#1b5e20' : '#f3f7f4',
                    color: active ? '#ffffff' : '#334e3a',
                    border: active ? '1px solid #1b5e20' : '1px solid #e1ebe3',
                    '&:hover': { bgcolor: active ? '#1b5e20' : '#e6efe8' },
                  }}
                />
              );
            })}
          </Stack>

          <Typography variant="h4" fontWeight={800} sx={{ color: '#112617', letterSpacing: -0.5, mb: 0.5 }}>
            Farm Portal Sign In
          </Typography>
          <Typography variant="body2" sx={{ color: '#5f7464', mb: 3 }}>
            Livestock, apiaries, production batches, deliveries & finance
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 2.2 }}>
            <Box>
              <Typography variant="caption" fontWeight={700} sx={{ color: '#2b4230', display: 'block', mb: 0.7 }}>
                Email or Staff ID <Box component="span" sx={{ color: '#d32f2f' }}>*</Box>
              </Typography>
              <TextField
                fullWidth
                placeholder="name@smartfarm.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={email.length > 0 && !emailValid}
                helperText={email.length > 0 && !emailValid ? 'Enter a valid email address' : ''}
                autoComplete="email"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlined sx={{ color: '#6b8270', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2.5, bgcolor: '#f9fbf9' },
                }}
              />
            </Box>

            <Box>
              <Typography variant="caption" fontWeight={700} sx={{ color: '#2b4230', display: 'block', mb: 0.7 }}>
                Password <Box component="span" sx={{ color: '#d32f2f' }}>*</Box>
              </Typography>
              <TextField
                fullWidth
                placeholder="Enter your password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined sx={{ color: '#6b8270', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPass((v) => !v)}
                        edge="end"
                        aria-label="Toggle password visibility"
                      >
                        {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2.5, bgcolor: '#f9fbf9' },
                }}
              />
            </Box>

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: -0.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    sx={{ color: '#2e7d32', '&.Mui-checked': { color: '#2e7d32' } }}
                  />
                }
                label={<Typography variant="caption" sx={{ color: '#4d6352', fontWeight: 600 }}>Keep session active (30 days)</Typography>}
              />
              <Link
                component="button"
                type="button"
                variant="caption"
                onClick={() => { setForgotEmail(email); setForgotSent(false); setForgotOpen(true); }}
                sx={{ fontWeight: 700, color: '#1b5e20', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Forgot password?
              </Link>
            </Stack>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy}
              endIcon={<ArrowForward />}
              sx={{
                py: 1.45,
                borderRadius: 99,
                fontWeight: 800,
                textTransform: 'none',
                fontSize: '0.98rem',
                background: 'linear-gradient(90deg, #1b5e20 0%, #2e7d32 100%)',
                boxShadow: '0 8px 20px rgba(27, 94, 32, 0.25)',
                '&:hover': { background: 'linear-gradient(90deg, #144718 0%, #1b5e20 100%)' },
              }}
            >
              {busy ? 'Authenticating…' : 'Sign In to Workspace'}
            </Button>

            {/* Instant Interactive Demo Workspace Box */}
            <Box
              sx={{
                mt: 1,
                p: 2,
                borderRadius: 3,
                bgcolor: '#f4f9f5',
                border: '1px dashed #b8d8be',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Box>
                <Stack direction="row" spacing={0.7} alignItems="center">
                  <AutoAwesomeOutlined sx={{ fontSize: 16, color: '#ef6c00' }} />
                  <Typography variant="caption" fontWeight={800} sx={{ color: '#1b5e20' }}>
                    INSTANT SANDBOX PREVIEW
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: '#526957', display: 'block' }}>
                  Explore pre-loaded goats, cows, hives & reports
                </Typography>
              </Box>
              <Button
                type="button"
                variant="contained"
                color="warning"
                size="small"
                disabled={busy}
                onClick={launchDemo}
                sx={{
                  borderRadius: 99,
                  fontWeight: 800,
                  textTransform: 'none',
                  px: 2,
                  py: 0.8,
                  whiteSpace: 'nowrap',
                  boxShadow: 'none',
                }}
              >
                Launch [DEMO]
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Bottom Footer */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
          sx={{ pt: 2, borderTop: '1px solid #f0f4f1' }}
        >
          <Typography variant="caption" sx={{ color: '#5f7464' }}>
            New farm operation?{' '}
            <Link component={RouterLink} to="/register" sx={{ fontWeight: 800, color: '#1b5e20', textDecoration: 'none' }}>
              Register farm account →
            </Link>
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: '#7a8f7e' }}>
            <VerifiedUserOutlined sx={{ fontSize: 14 }} />
            <Typography variant="caption">Role-Isolated JWT Security</Typography>
          </Stack>
        </Stack>
      </Box>

      {/* RIGHT PANEL: Full-Height Farm Photography with Floating Frosted-Glass Showcase Card */}
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 360, md: '100vh' },
          backgroundImage: `linear-gradient(180deg, rgba(8, 28, 15, 0.15) 0%, rgba(8, 28, 15, 0.65) 100%), url(${activeSlide.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          p: { xs: 2.5, sm: 4, lg: 5 },
          transition: 'background-image 0.45s ease-in-out',
        }}
      >
        {/* Floating Glassmorphism Card */}
        <Box
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            borderRadius: 4,
            background: 'linear-gradient(135deg, rgba(18, 46, 26, 0.78) 0%, rgba(40, 68, 34, 0.68) 100%)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            color: '#ffffff',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.32)',
            maxWidth: 640,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
            <Chip
              label={activeSlide.tag}
              size="small"
              sx={{
                bgcolor: 'rgba(129, 199, 132, 0.25)',
                color: '#e8f5e9',
                border: '1px solid rgba(129, 199, 132, 0.45)',
                fontWeight: 700,
              }}
            />
            <Stack direction="row" spacing={1}>
              {activeSlide.metrics.map((m) => (
                <Typography
                  key={m}
                  variant="caption"
                  sx={{
                    px: 1.2,
                    py: 0.3,
                    borderRadius: 99,
                    bgcolor: 'rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.92)',
                    fontWeight: 600,
                    display: { xs: 'none', sm: 'inline-block' },
                  }}
                >
                  {m}
                </Typography>
              ))}
            </Stack>
          </Stack>

          <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.45rem', md: '1.85rem' }, lineHeight: 1.25, mb: 1 }}>
            {activeSlide.title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.86)', lineHeight: 1.6, mb: 2.5 }}>
            {activeSlide.subtitle}
          </Typography>

          {/* Interactive Thumbnail Strip inside the Glass Card */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Stack direction="row" spacing={1.2} sx={{ overflowX: 'auto' }}>
              {SHOWCASE_SLIDES.map((s, idx) => (
                <Box
                  key={s.image}
                  onClick={() => setSlideIdx(idx)}
                  sx={{
                    width: 60,
                    height: 40,
                    borderRadius: 1.5,
                    backgroundImage: `url(${s.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: 'pointer',
                    border: idx === slideIdx ? '2px solid #a5d6a7' : '1.5px solid rgba(255,255,255,0.3)',
                    opacity: idx === slideIdx ? 1 : 0.6,
                    transition: 'all 0.2s',
                    flexShrink: 0,
                    '&:hover': { opacity: 1 },
                  }}
                  title={s.label}
                />
              ))}
            </Stack>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }}>
              {slideIdx + 1} / {SHOWCASE_SLIDES.length}
            </Typography>
          </Stack>
        </Box>
      </Box>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={800}>Reset Farm Account Password</DialogTitle>
        <DialogContent>
          {forgotSent ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              If an account exists for <strong>{forgotEmail}</strong>, a password reset token has been generated.
            </Alert>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Enter your registered email address to request a password reset link.
              </Typography>
              <TextField
                label="Registered Email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                fullWidth
                required
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setForgotOpen(false)}>Close</Button>
          {!forgotSent && (
            <Button variant="contained" onClick={handleForgotSubmit}>
              Send Reset Instructions
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
