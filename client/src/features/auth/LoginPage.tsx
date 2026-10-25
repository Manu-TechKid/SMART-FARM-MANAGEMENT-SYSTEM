import { useState, useEffect, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControlLabel, InputAdornment, Link, Stack,
  TextField, Typography,
} from '@mui/material';
import {
  Visibility, VisibilityOff, EmailOutlined, LockOutlined,
  ArrowForward, AutoAwesomeOutlined, PersonAddAlt1Outlined, AgricultureOutlined,
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { api, errorMessage } from '../../api/client';
import type { Farm } from '../../types';

const SHOWCASE_SLIDES = [
  {
    key: 'All',
    icon: '🌾',
    label: 'All Farm',
    image: '/images/farm-harvest-hero.jpg',
    tag: 'Unified AgriTech Command Center',
    title: 'Every herd, flock, hive, and harvest in one platform',
    subtitle: 'Real-time production tracking for milk, eggs, honey, veterinary compliance, stock-deducting dispatches, and farm profitability.',
    metrics: ['5 Farm Enterprises', 'Batch Traceability', 'Live P&L Analytics'],
  },
  {
    key: 'Cow',
    icon: '🐄',
    label: 'Cattle',
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
    key: 'Chicken',
    icon: '🐔',
    label: 'Poultry',
    image: '/images/chickens.jpg',
    tag: 'Poultry & Egg Operations',
    title: 'Flock cycles, layer yields & egg harvests',
    subtitle: 'Track batch mortality, feed conversion ratios, daily egg crates, and brooder temperatures with instant alerts.',
    metrics: ['Daily Egg Logs', 'Mortality Tracker', 'Feed Conversion'],
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

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2.5,
    bgcolor: '#f8faf8',
    fontSize: '1rem',
    '& fieldset': { borderColor: '#d0ddd3', borderWidth: 1.5 },
    '&:hover fieldset': { borderColor: '#2e7d32' },
    '&.Mui-focused fieldset': { borderColor: '#1b5e20', borderWidth: 2 },
    '& input': {
      py: 1.55,
      px: 1.5,
      '&:-webkit-autofill': {
        WebkitBoxShadow: '0 0 0 100px #f1f7f2 inset !important',
        WebkitTextFillColor: '#112617 !important',
        borderRadius: 'inherit',
      },
    },
  },
};

export default function LoginPage() {
  const { login, register, refreshFarms, setFarmId } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');
    const action = searchParams.get('action');
    if (tokenParam || action === 'reset') {
      if (tokenParam) setResetToken(tokenParam);
      if (emailParam) {
        setForgotEmail(emailParam);
        setEmail(emailParam);
      }
      setShowResetForm(true);
      setForgotOpen(true);
    }
  }, [searchParams]);

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
    setResetMsg(null);
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotSent(true);
    } catch (err) {
      setResetMsg({ severity: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleResetSubmit = async () => {
    setResetMsg(null);
    if (!forgotEmail.trim() || !resetToken.trim() || !newPassword) {
      setResetMsg({ severity: 'error', text: 'Please provide email, reset token, and your new password.' });
      return;
    }
    if (newPassword.length < 8) {
      setResetMsg({ severity: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetMsg({ severity: 'error', text: 'New password and confirm password do not match.' });
      return;
    }

    setResetting(true);
    try {
      await api.post('/auth/reset-password', {
        email: forgotEmail.trim(),
        token: resetToken.trim(),
        newPassword,
      });
      setResetMsg({
        severity: 'success',
        text: 'Password updated successfully! Logging you in...',
      });
      setEmail(forgotEmail.trim());
      setPassword(newPassword);
      setSearchParams({});
      setTimeout(() => {
        setForgotOpen(false);
        setShowResetForm(false);
        setResetToken('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err) {
      setResetMsg({ severity: 'error', text: errorMessage(err) });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(500px, 47%) 1fr' },
        bgcolor: '#ffffff',
      }}
    >
      {/* LEFT PANEL: Cohesive Centered Executive Login Workspace */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: 3, sm: 6, lg: 7 },
          py: { xs: 4, md: 5 },
          bgcolor: '#ffffff',
          borderRight: { md: '1px solid #e4ece6' },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 460 }}>
          {/* Prominent Brand Header Right Above Form */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Stack direction="row" spacing={1.8} alignItems="center">
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #1b5e20 0%, #43a047 100%)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  boxShadow: '0 8px 20px rgba(27, 94, 32, 0.28)',
                }}
              >
                <AgricultureOutlined sx={{ fontSize: 30 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.1, color: '#112617', letterSpacing: -0.4 }}>
                  SmartFarm OS
                </Typography>
                <Typography variant="body2" sx={{ color: '#4d6653', fontWeight: 600 }}>
                  Integrated Livestock & Apiary Platform
                </Typography>
              </Box>
            </Stack>
            <Chip
              label="● SQL Server Online"
              size="small"
              sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 800, fontSize: '0.78rem', px: 0.5 }}
            />
          </Stack>

          {/* Wrap-Friendly Enterprise Pills (No Scrollbar!) */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
            {SHOWCASE_SLIDES.map((s, idx) => {
              const active = idx === slideIdx;
              return (
                <Chip
                  key={s.key}
                  label={`${s.icon} ${s.label}`}
                  onClick={() => setSlideIdx(idx)}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    height: 34,
                    bgcolor: active ? '#1b5e20' : '#f1f6f2',
                    color: active ? '#ffffff' : '#263e2b',
                    border: active ? '1.5px solid #1b5e20' : '1.5px solid #d8e4da',
                    '&:hover': { bgcolor: active ? '#1b5e20' : '#e2ede4' },
                  }}
                />
              );
            })}
          </Stack>

          {/* Main Heading */}
          <Typography variant="h4" fontWeight={900} sx={{ color: '#0f2315', letterSpacing: -0.6, mb: 0.8, fontSize: { xs: '1.75rem', sm: '2.05rem' } }}>
            Sign in to Your Farm
          </Typography>
          <Typography variant="body1" sx={{ color: '#516856', mb: 3, fontSize: '0.98rem' }}>
            Enter your credentials to manage herds, flocks, beehives, production & finance.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5, fontSize: '0.92rem' }}>{error}</Alert>}

          {/* Form Fields */}
          <Box component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 2.4 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#1b3120', mb: 0.8, fontSize: '0.94rem' }}>
                Email Address <Box component="span" sx={{ color: '#d32f2f' }}>*</Box>
              </Typography>
              <TextField
                fullWidth
                placeholder="Enter your email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={email.length > 0 && !emailValid}
                helperText={email.length > 0 && !emailValid ? 'Please enter a valid email address' : ''}
                autoComplete="email"
                required
                sx={inputSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlined sx={{ color: '#2e7d32', fontSize: 22 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#1b3120', mb: 0.8, fontSize: '0.94rem' }}>
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
                sx={inputSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined sx={{ color: '#2e7d32', fontSize: 22 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        onClick={() => setShowPass((v) => !v)}
                         startIcon={showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        sx={{ textTransform: 'none', fontWeight: 700, color: '#3b5741', minWidth: 'auto', px: 1 }}
                      >
                        {showPass ? 'Hide' : 'Show'}
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    sx={{ color: '#2e7d32', '&.Mui-checked': { color: '#1b5e20' } }}
                  />
                }
                label={<Typography variant="body2" fontWeight={600} sx={{ color: '#364d3b' }}>Remember me for 30 days</Typography>}
              />
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={() => { setForgotEmail(email); setForgotSent(false); setForgotOpen(true); }}
                sx={{ fontWeight: 800, color: '#1b5e20', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
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
                py: 1.6,
                borderRadius: 2.5,
                fontWeight: 800,
                textTransform: 'none',
                fontSize: '1.05rem',
                background: 'linear-gradient(90deg, #1b5e20 0%, #2e7d32 100%)',
                boxShadow: '0 8px 22px rgba(27, 94, 32, 0.28)',
                '&:hover': { background: 'linear-gradient(90deg, #144718 0%, #1b5e20 100%)' },
              }}
            >
              {busy ? 'Signing in…' : 'Sign In to Farm Portal'}
            </Button>

            {/* Instant Sandbox Demo Card */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: '#f3f8f4',
                border: '1.5px solid #c5dec9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box>
                <Stack direction="row" spacing={0.8} alignItems="center">
                  <AutoAwesomeOutlined sx={{ fontSize: 18, color: '#ef6c00' }} />
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#1b5e20' }}>
                    Interactive [DEMO] Farm
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: '#48604d', fontSize: '0.85rem' }}>
                  Pre-loaded goats, cows, sheep, chickens & beehives
                </Typography>
              </Box>
              <Button
                type="button"
                variant="contained"
                color="warning"
                disabled={busy}
                onClick={launchDemo}
                sx={{
                  borderRadius: 2,
                  fontWeight: 800,
                  textTransform: 'none',
                  px: 2.2,
                  py: 1,
                  fontSize: '0.9rem',
                  whiteSpace: 'nowrap',
                }}
              >
                Launch Demo
              </Button>
            </Box>

            <Divider sx={{ my: 0.5 }}>
              <Typography variant="body2" fontWeight={700} sx={{ color: '#6c8271', px: 1 }}>
                NEW TO SMARTFARM?
              </Typography>
            </Divider>

            {/* Prominent Registration Button & Label */}
            <Button
              component={RouterLink}
              to="/register"
              variant="outlined"
              size="large"
              startIcon={<PersonAddAlt1Outlined />}
              sx={{
                py: 1.45,
                borderRadius: 2.5,
                fontWeight: 800,
                textTransform: 'none',
                fontSize: '1rem',
                color: '#1b5e20',
                borderColor: '#1b5e20',
                borderWidth: 2,
                '&:hover': { borderWidth: 2, bgcolor: '#eef6f0', borderColor: '#144718' },
              }}
            >
              Register a New Farm Account
            </Button>
          </Box>
        </Box>
      </Box>

      {/* RIGHT PANEL: Full-Height Farm Photography with Floating Frosted-Glass Showcase Card */}
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 380, md: '100vh' },
          backgroundImage: `linear-gradient(180deg, rgba(8, 28, 15, 0.12) 0%, rgba(8, 28, 15, 0.68) 100%), url(${activeSlide.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          p: { xs: 2.5, sm: 4, lg: 5 },
          transition: 'background-image 0.45s ease-in-out',
        }}
      >
        <Box
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            borderRadius: 4,
            background: 'linear-gradient(135deg, rgba(16, 42, 23, 0.84) 0%, rgba(36, 64, 30, 0.75) 100%)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.24)',
            color: '#ffffff',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
            maxWidth: 660,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
            <Chip
              label={activeSlide.tag}
              sx={{
                bgcolor: 'rgba(129, 199, 132, 0.28)',
                color: '#ffffff',
                border: '1px solid rgba(129, 199, 132, 0.5)',
                fontWeight: 800,
                fontSize: '0.82rem',
              }}
            />
            <Stack direction="row" spacing={1}>
              {activeSlide.metrics.map((m) => (
                <Typography
                  key={m}
                  variant="caption"
                  sx={{
                    px: 1.4,
                    py: 0.4,
                    borderRadius: 99,
                    bgcolor: 'rgba(255,255,255,0.16)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    display: { xs: 'none', sm: 'inline-block' },
                  }}
                >
                  {m}
                </Typography>
              ))}
            </Stack>
          </Stack>

          <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', md: '1.9rem' }, lineHeight: 1.25, mb: 1 }}>
            {activeSlide.title}
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.6, mb: 2.5, fontSize: '0.96rem' }}>
            {activeSlide.subtitle}
          </Typography>

          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            <Stack direction="row" spacing={1.2}>
              {SHOWCASE_SLIDES.map((s, idx) => (
                <Box
                  key={s.image}
                  onClick={() => setSlideIdx(idx)}
                  sx={{
                    width: 64,
                    height: 44,
                    borderRadius: 1.5,
                    backgroundImage: `url(${s.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: 'pointer',
                    border: idx === slideIdx ? '2.5px solid #a5d6a7' : '1.5px solid rgba(255,255,255,0.35)',
                    opacity: idx === slideIdx ? 1 : 0.65,
                    transition: 'all 0.2s',
                    '&:hover': { opacity: 1 },
                  }}
                  title={s.label}
                />
              ))}
            </Stack>
            <Typography variant="body2" fontWeight={700} sx={{ color: 'rgba(255,255,255,0.85)' }}>
              {slideIdx + 1} / {SHOWCASE_SLIDES.length}
            </Typography>
          </Stack>
        </Box>
      </Box>

      {/* Forgot / Reset Password Dialog */}
      <Dialog
        open={forgotOpen}
        onClose={() => {
          setForgotOpen(false);
          setResetMsg(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={800}>
          {showResetForm ? 'Set New Farm Password' : 'Reset Farm Account Password'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {resetMsg && (
              <Alert severity={resetMsg.severity}>
                {resetMsg.text}
              </Alert>
            )}

            {showResetForm ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  Enter your email, the reset token received in your email, and choose your new password.
                </Typography>
                <TextField
                  label="Registered Email"
                  type="email"
                  size="small"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Reset Token"
                  size="small"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste token from email"
                  fullWidth
                  required
                />
                <TextField
                  label="New Password"
                  type="password"
                  size="small"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  fullWidth
                  required
                />
                <TextField
                  label="Confirm New Password"
                  type="password"
                  size="small"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  required
                />
                <Link
                  component="button"
                  type="button"
                  variant="caption"
                  onClick={() => {
                    setShowResetForm(false);
                    setResetMsg(null);
                  }}
                  sx={{ textAlign: 'left', color: '#2e7d32', fontWeight: 600 }}
                >
                  &larr; Request a new email link instead
                </Link>
              </>
            ) : (
              <>
                {forgotSent ? (
                  <>
                    <Alert severity="success">
                      If an account exists for <strong>{forgotEmail}</strong>, password reset instructions have been dispatched via Resend. Check your inbox and spam folder!
                    </Alert>
                    <Button
                      variant="outlined"
                      color="success"
                      size="small"
                      onClick={() => setShowResetForm(true)}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Enter Token & Set New Password &rarr;
                    </Button>
                  </>
                ) : (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Enter your registered email address to receive password reset instructions via Resend.
                    </Typography>
                    <TextField
                      label="Registered Email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      fullWidth
                      required
                      autoFocus
                    />
                    <Link
                      component="button"
                      type="button"
                      variant="caption"
                      onClick={() => {
                        setShowResetForm(true);
                        setResetMsg(null);
                      }}
                      sx={{ textAlign: 'left', color: '#2e7d32', fontWeight: 600 }}
                    >
                      Already have a token? Set new password here &rarr;
                    </Link>
                  </>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => {
              setForgotOpen(false);
              setResetMsg(null);
            }}
          >
            Close
          </Button>
          {showResetForm ? (
            <Button
              variant="contained"
              color="success"
              disabled={resetting}
              onClick={handleResetSubmit}
              sx={{ fontWeight: 700 }}
            >
              {resetting ? 'Updating...' : 'Save New Password'}
            </Button>
          ) : (
            !forgotSent && (
              <Button
                variant="contained"
                color="success"
                disabled={busy}
                onClick={handleForgotSubmit}
                sx={{ fontWeight: 700 }}
              >
                {busy ? 'Sending...' : 'Send Reset Instructions'}
              </Button>
            )
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
