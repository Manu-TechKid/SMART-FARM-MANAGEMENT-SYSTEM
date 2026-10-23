import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControlLabel, InputAdornment, Link, OutlinedInput, Stack, TextField, Typography,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import { useAuth } from './AuthContext';
import { api, errorMessage } from '../../api/client';
import type { Farm } from '../../types';

const SHOWCASE_SLIDES = [
  {
    image: '/images/farm-harvest-hero.jpg',
    headline: 'Every herd, hive, store and harvest in one place',
    subline: 'Run all your farm sections from one integrated system.',
  },
  {
    image: '/images/cows.jpg',
    headline: 'Dairy cattle, milk yields and veterinary care in one place',
    subline: 'Monitor ear tags, breeding cycles, daily milk litres, and withdrawal periods.',
  },
  {
    image: '/images/goats.jpg',
    headline: 'Goat herds, kidding milestones and health records in one place',
    subline: 'Track Boer & dairy goats, lineage, weight checks, and scheduled vaccinations.',
  },
  {
    image: '/images/sheep.jpg',
    headline: 'Sheep flocks, lambing and wool production in one place',
    subline: 'Manage pasture rotations, shearing batches, and flock performance.',
  },
  {
    image: '/images/beehives.jpg',
    headline: 'Apiaries, colony inspections and honey harvests in one place',
    subline: 'Track queen status, brood health scores, and traceable honey batches.',
  },
];

export default function LoginPage() {
  const { login, register, refreshFarms, setFarmId } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

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

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(forgotEmail)) return;
    await api.post('/auth/forgot-password', { email: forgotEmail }).catch(() => undefined);
    setForgotMsg('If an account exists for that email, password reset instructions have been logged.');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        bgcolor: '#ffffff',
      }}
    >
      {/* Left Side: Clean Full-Bleed White Staff Login Panel */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: 3, sm: 6, md: 8 },
          py: { xs: 5, md: 6 },
          bgcolor: '#ffffff',
        }}
      >
        <Box
          component="form"
          onSubmit={submit}
          noValidate
          sx={{ width: '100%', maxWidth: 400 }}
        >
          {/* Top Brand Lockup (Matches SmartBill Reference Style) */}
          <Stack
            direction="row"
            spacing={1.75}
            alignItems="center"
            justifyContent="center"
            sx={{ mb: 4 }}
          >
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 2.5,
                bgcolor: '#d4af37',
                color: '#1b2a1e',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                fontSize: '1.05rem',
                letterSpacing: 0.5,
                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.35)',
              }}
            >
              SF
            </Box>
            <Divider orientation="vertical" flexItem sx={{ borderColor: '#d0d7de', height: 36, alignSelf: 'center' }} />
            <Box>
              <Typography
                 sx={{
                  fontWeight: 800,
                  fontSize: '1.35rem',
                  lineHeight: 1.15,
                  color: '#0f2930',
                  letterSpacing: -0.3,
                }}
              >
                SmartFarm
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  fontWeight: 500,
                }}
              >
                SmartFarm Management
              </Typography>
            </Box>
          </Stack>

          {/* Centered Title & Subtitle */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: '#0f2930',
                fontSize: { xs: '1.75rem', sm: '2rem' },
                mb: 0.75,
                letterSpacing: -0.5,
              }}
            >
              Staff Login
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: '#64748b', fontSize: '0.92rem' }}
            >
              Livestock, apiaries, production, stores and finance
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Username or Email Field */}
          <Box sx={{ mb: 2.5 }}>
            <Typography
              component="label"
              htmlFor="login-email"
              sx={{
                display: 'block',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#1e293b',
                mb: 0.8,
              }}
            >
              Username or email <Box component="span" sx={{ color: '#dc2626' }}>*</Box>
            </Typography>
            <OutlinedInput
              id="login-email"
              type="email"
              fullWidth
              placeholder="Enter your username or email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              sx={{
                borderRadius: 2,
                bgcolor: '#f8fafc',
                fontSize: '0.95rem',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                '&.Mui-focused': { bgcolor: '#ffffff' },
              }}
            />
          </Box>

          {/* Password Field with Inline "Show password" */}
          <Box sx={{ mb: 2 }}>
            <Typography
              component="label"
              htmlFor="login-password"
              sx={{
                display: 'block',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#1e293b',
                mb: 0.8,
              }}
            >
              Password <Box component="span" sx={{ color: '#dc2626' }}>*</Box>
            </Typography>
            <OutlinedInput
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              endAdornment={
                <InputAdornment position="end">
                  <Button
                    type="button"
                    size="small"
                    onClick={() => setShowPassword((s) => !s)}
                    endIcon={
                      showPassword ? (
                        <VisibilityOffOutlinedIcon sx={{ fontSize: '1rem !important' }} />
                      ) : (
                        <VisibilityOutlinedIcon sx={{ fontSize: '1rem !important' }} />
                      )
                    }
                    sx={{
                      textTransform: 'none',
                      color: '#64748b',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      minWidth: 'auto',
                      px: 1,
                    }}
                  >
                    {showPassword ? 'Hide password' : 'Show password'}
                  </Button>
                </InputAdornment>
              }
              sx={{
                borderRadius: 2,
                bgcolor: '#f8fafc',
                fontSize: '0.95rem',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                '&.Mui-focused': { bgcolor: '#ffffff' },
              }}
            />
          </Box>

          {/* Remember Me & Forgot Password Row */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 3 }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  sx={{ color: '#cbd5e1', '&.Mui-checked': { color: '#0b4f5c' } }}
                />
              }
              label={
                <Typography sx={{ fontSize: '0.84rem', color: '#334155', fontWeight: 500 }}>
                  Remember me for 30 days
                </Typography>
              }
            />
            <Link
              component="button"
              type="button"
              underline="hover"
              onClick={() => {
                setForgotEmail(email);
                setForgotMsg('');
                setForgotOpen(true);
              }}
              sx={{
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#0b4f5c',
              }}
            >
              Forgot password
            </Link>
          </Stack>

          {/* Primary Pill Sign-In Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={busy}
            sx={{
              py: 1.55,
              borderRadius: 999,
              bgcolor: '#0b4f5c',
              color: '#ffffff',
              textTransform: 'none',
              fontSize: '0.98rem',
              fontWeight: 700,
              boxShadow: '0 6px 16px rgba(11, 79, 92, 0.25)',
              '&:hover': { bgcolor: '#083b45' },
            }}
          >
            {busy ? 'Signing in…' : 'Sign In'}
          </Button>

          {/* "Need help?" Divider */}
          <Divider sx={{ my: 3, color: '#94a3b8', fontSize: '0.8rem' }}>
            Need help?
          </Divider>

          {/* Centered Pill Action Buttons (Matches Reference Pill Badge Style) */}
          <Stack spacing={1.5} alignItems="center">
            <Button
              type="button"
              onClick={launchDemo}
              disabled={busy}
              sx={{
                borderRadius: 999,
                px: 2.5,
                py: 0.9,
                bgcolor: '#f1f5f9',
                color: '#0f2930',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                border: '1px solid #e2e8f0',
                '&:hover': { bgcolor: '#e2e8f0' },
              }}
              startIcon={
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    bgcolor: '#d4af37',
                    color: '#1b2a1e',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <RocketLaunchOutlinedIcon sx={{ fontSize: 15 }} />
                </Box>
              }
            >
              Open Interactive [DEMO] Farm
            </Button>

            <Button
              type="button"
              onClick={() => setForgotOpen(true)}
              sx={{
                borderRadius: 999,
                px: 2.2,
                py: 0.7,
                bgcolor: '#f8fafc',
                color: '#334155',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.82rem',
                '&:hover': { bgcolor: '#f1f5f9' },
              }}
              startIcon={
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: '#d4af37',
                    color: '#1b2a1e',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <SupportAgentOutlinedIcon sx={{ fontSize: 15 }} />
                </Box>
              }
            >
              Contact system support
            </Button>
          </Stack>

          {/* Bottom Registration Link */}
          <Typography
            variant="body2"
             sx={{
              textAlign: 'center',
              mt: 3.5,
              color: '#64748b',
              fontSize: '0.82rem',
            }}
          >
            Don&apos;t have an account?{' '}
            <Link
              component={RouterLink}
              to="/register"
              underline="hover"
              sx={{ fontWeight: 700, color: '#0b4f5c' }}
            >
              Register a new farm account
            </Link>{' '}
            or ask your farm manager to add you.
          </Typography>
        </Box>
      </Box>

      {/* Right Side: Full-Bleed Image with Frosted Glass Bottom Overlay Card */}
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 360, md: '100vh' },
          backgroundImage: `url(${activeSlide.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          p: { xs: 2.5, sm: 4, md: 5 },
          transition: 'background-image 0.4s ease-in-out',
        }}
      >
        {/* Subtle top-right photo switcher pills */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            position: 'absolute',
            top: 24,
            right: 24,
            bgcolor: 'rgba(15, 41, 48, 0.45)',
            backdropFilter: 'blur(8px)',
            p: 0.75,
            borderRadius: 999,
          }}
        >
          {SHOWCASE_SLIDES.map((s, idx) => (
            <Box
              key={s.image}
              onClick={() => setSlideIdx(idx)}
              sx={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                backgroundImage: `url(${s.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                cursor: 'pointer',
                border: idx === slideIdx ? '2px solid #d4af37' : '1.5px solid rgba(255,255,255,0.5)',
                opacity: idx === slideIdx ? 1 : 0.7,
                transition: 'all 0.2s',
                '&:hover': { opacity: 1, transform: 'scale(1.06)' },
              }}
            />
          ))}
        </Stack>

        {/* Frosted Glass Floating Caption Card (Matches Reference Image) */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, rgba(16, 48, 54, 0.84) 0%, rgba(114, 92, 38, 0.78) 100%)',
            backdropFilter: 'blur(14px)',
            borderRadius: 3.5,
            p: { xs: 3, md: 4 },
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.28)',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.45rem', md: '1.85rem' },
              lineHeight: 1.25,
              mb: 1,
            }}
          >
            {activeSlide.headline}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.88)',
              fontSize: '0.95rem',
            }}
          >
            {activeSlide.subline}
          </Typography>
        </Box>
      </Box>

      {/* Forgot Password / Support Modal */}
      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Password Reset & Support</DialogTitle>
        <DialogContent component="form" onSubmit={handleForgotSubmit} sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          <Typography variant="body2" color="text.secondary">
            Enter your account email to request a password reset token, or contact your Farm Manager in Users &amp; Permissions.
          </Typography>
          {forgotMsg && <Alert severity="success">{forgotMsg}</Alert>}
          <TextField
            label="Account Email"
            type="email"
            size="small"
            fullWidth
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            required
          />
          <DialogActions sx={{ px: 0 }}>
            <Button onClick={() => setForgotOpen(false)}>Close</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#0b4f5c' }}>
              Send Reset Request
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
