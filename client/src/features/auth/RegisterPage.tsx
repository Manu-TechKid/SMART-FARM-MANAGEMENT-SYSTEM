import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, IconButton, InputAdornment, Link, Stack, TextField, Typography,
} from '@mui/material';
import {
  Visibility, VisibilityOff, EmailOutlined, LockOutlined, PersonOutline, ArrowForward,
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { errorMessage } from '../../api/client';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const passwordOk = form.password.length >= 8 && /\d/.test(form.password);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !/^\S+@\S+\.\S+$/.test(form.email) || !passwordOk) {
      setError('Complete all fields. Password needs at least 8 characters including a digit.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await register(form.firstName, form.lastName, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
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
      {/* LEFT PANEL: Full-Bleed Registration Workspace */}
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
              <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.1, color: '#132a19' }}>
                SmartFarm
              </Typography>
              <Typography variant="caption" sx={{ color: '#5c7261', fontWeight: 600 }}>
                Agricultural ERP & Telemetry
              </Typography>
            </Box>
          </Stack>
          <Chip size="small" label="New Farm Setup" sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 700 }} />
        </Stack>

        <Box sx={{ width: '100%', maxWidth: 420, mx: 'auto', my: { xs: 4, md: 2 } }}>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#112617', letterSpacing: -0.5, mb: 0.5 }}>
            Create Farm Account
          </Typography>
          <Typography variant="body2" sx={{ color: '#5f7464', mb: 3 }}>
            Register as a Farm Manager to set up your livestock, apiary, and production modules.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#2b4230', display: 'block', mb: 0.6 }}>
                  First Name *
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Jane"
                  value={form.firstName}
                  onChange={set('firstName')}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutline sx={{ color: '#6b8270', fontSize: 19 }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2.5, bgcolor: '#f9fbf9' },
                  }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#2b4230', display: 'block', mb: 0.6 }}>
                  Last Name *
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Kamau"
                  value={form.lastName}
                  onChange={set('lastName')}
                  required
                  InputProps={{ sx: { borderRadius: 2.5, bgcolor: '#f9fbf9' } }}
                />
              </Box>
            </Stack>

            <Box>
              <Typography variant="caption" fontWeight={700} sx={{ color: '#2b4230', display: 'block', mb: 0.6 }}>
                Email Address *
              </Typography>
              <TextField
                fullWidth
                placeholder="manager@smartfarm.com"
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlined sx={{ color: '#6b8270', fontSize: 19 }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2.5, bgcolor: '#f9fbf9' },
                }}
              />
            </Box>

            <Box>
              <Typography variant="caption" fontWeight={700} sx={{ color: '#2b4230', display: 'block', mb: 0.6 }}>
                Password *
              </Typography>
              <TextField
                fullWidth
                placeholder="At least 8 characters with 1 digit"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                error={form.password.length > 0 && !passwordOk}
                helperText="Minimum 8 characters including at least one number"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined sx={{ color: '#6b8270', fontSize: 19 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPass((v) => !v)} edge="end">
                        {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2.5, bgcolor: '#f9fbf9' },
                }}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy}
              endIcon={<ArrowForward />}
              sx={{
                mt: 1,
                py: 1.45,
                borderRadius: 99,
                fontWeight: 800,
                textTransform: 'none',
                fontSize: '0.98rem',
                background: 'linear-gradient(90deg, #1b5e20 0%, #2e7d32 100%)',
                boxShadow: '0 8px 20px rgba(27, 94, 32, 0.25)',
              }}
            >
              {busy ? 'Creating Workspace…' : 'Create Farm Account'}
            </Button>
          </Box>
        </Box>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 2, borderTop: '1px solid #f0f4f1' }}>
          <Typography variant="caption" sx={{ color: '#5f7464' }}>
            Already registered?{' '}
            <Link component={RouterLink} to="/login" sx={{ fontWeight: 800, color: '#1b5e20', textDecoration: 'none' }}>
              Sign in to your farm →
            </Link>
          </Typography>
        </Stack>
      </Box>

      {/* RIGHT PANEL: Full-Height Farm Photography with Frosted Glass Card */}
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 340, md: '100vh' },
          backgroundImage: 'linear-gradient(180deg, rgba(8, 28, 15, 0.15) 0%, rgba(8, 28, 15, 0.65) 100%), url(/images/farm-harvest-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          p: { xs: 2.5, sm: 4, lg: 5 },
        }}
      >
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
          <Chip
            label="Multi-Species Farm Architecture"
            size="small"
            sx={{ bgcolor: 'rgba(129, 199, 132, 0.25)', color: '#e8f5e9', fontWeight: 700, mb: 1.5 }}
          />
          <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.45rem', md: '1.85rem' }, mb: 1 }}>
            Designed for Modern Mixed Farms
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.86)', lineHeight: 1.6 }}>
            Manage goats, sheep, dairy cows, poultry flocks, and beehives with automated vaccination reminders, batch-level stock deduction, and exportable PDF & Excel financial statements.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
