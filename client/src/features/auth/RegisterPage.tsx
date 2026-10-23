import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Divider, InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import {
  Visibility, VisibilityOff, EmailOutlined, LockOutlined, PersonOutline,
  ArrowForward, LoginOutlined, AgricultureOutlined,
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { errorMessage } from '../../api/client';

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2.5,
    bgcolor: '#f8faf8',
    fontSize: '1rem',
    '& fieldset': { borderColor: '#d0ddd3', borderWidth: 1.5 },
    '&:hover fieldset': { borderColor: '#2e7d32' },
    '&.Mui-focused fieldset': { borderColor: '#1b5e20', borderWidth: 2 },
    '& input': {
      py: 1.5,
      px: 1.5,
      '&:-webkit-autofill': {
        WebkitBoxShadow: '0 0 0 100px #f1f7f2 inset !important',
        WebkitTextFillColor: '#112617 !important',
        borderRadius: 'inherit',
      },
    },
  },
};

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
        gridTemplateColumns: { xs: '1fr', md: 'minmax(500px, 47%) 1fr' },
        bgcolor: '#ffffff',
      }}
    >
      {/* LEFT PANEL: Centered Registration Workspace */}
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
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3.5 }}>
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
                <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.1, color: '#112617' }}>
                  SmartFarm OS
                </Typography>
                <Typography variant="body2" sx={{ color: '#4d6653', fontWeight: 600 }}>
                  Integrated Livestock & Apiary Platform
                </Typography>
              </Box>
            </Stack>
            <Chip label="New Farm Setup" sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 800 }} />
          </Stack>

          <Typography variant="h4" fontWeight={900} sx={{ color: '#0f2315', letterSpacing: -0.6, mb: 0.8 }}>
            Create Farm Account
          </Typography>
          <Typography variant="body1" sx={{ color: '#516856', mb: 3, fontSize: '0.98rem' }}>
            Register as a Farm Manager to set up your livestock, apiary, and production modules.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5 }}>{error}</Alert>}

          <Box component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 2.2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#1b3120', mb: 0.8, fontSize: '0.94rem' }}>
                  First Name <Box component="span" sx={{ color: '#d32f2f' }}>*</Box>
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Jane"
                  value={form.firstName}
                  onChange={set('firstName')}
                  required
                  sx={inputSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutline sx={{ color: '#2e7d32', fontSize: 22 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#1b3120', mb: 0.8, fontSize: '0.94rem' }}>
                  Last Name <Box component="span" sx={{ color: '#d32f2f' }}>*</Box>
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Kamau"
                  value={form.lastName}
                  onChange={set('lastName')}
                  required
                  sx={inputSx}
                />
              </Box>
            </Stack>

            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#1b3120', mb: 0.8, fontSize: '0.94rem' }}>
                Email Address <Box component="span" sx={{ color: '#d32f2f' }}>*</Box>
              </Typography>
              <TextField
                fullWidth
                placeholder="manager@smartfarm.com"
                type="email"
                value={form.email}
                onChange={set('email')}
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
                placeholder="At least 8 characters with 1 digit"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                error={form.password.length > 0 && !passwordOk}
                helperText="Minimum 8 characters including at least one number"
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

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy}
              endIcon={<ArrowForward />}
              sx={{
                mt: 0.5,
                py: 1.6,
                borderRadius: 2.5,
                fontWeight: 800,
                textTransform: 'none',
                fontSize: '1.05rem',
                background: 'linear-gradient(90deg, #1b5e20 0%, #2e7d32 100%)',
                boxShadow: '0 8px 22px rgba(27, 94, 32, 0.28)',
              }}
            >
              {busy ? 'Creating Workspace…' : 'Create Farm Account'}
            </Button>

            <Divider sx={{ my: 1 }}>
              <Typography variant="body2" fontWeight={700} sx={{ color: '#6c8271', px: 1 }}>
                ALREADY HAVE AN ACCOUNT?
              </Typography>
            </Divider>

            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              size="large"
              startIcon={<LoginOutlined />}
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
              Sign In to Existing Farm Account
            </Button>
          </Box>
        </Box>
      </Box>

      {/* RIGHT PANEL: Full-Height Farm Photography with Frosted Glass Card */}
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 360, md: '100vh' },
          backgroundImage: 'linear-gradient(180deg, rgba(8, 28, 15, 0.12) 0%, rgba(8, 28, 15, 0.68) 100%), url(/images/farm-harvest-hero.jpg)',
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
            background: 'linear-gradient(135deg, rgba(16, 42, 23, 0.84) 0%, rgba(36, 64, 30, 0.75) 100%)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.24)',
            color: '#ffffff',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
            maxWidth: 660,
          }}
        >
          <Chip
            label="Multi-Species Farm Architecture"
            sx={{ bgcolor: 'rgba(129, 199, 132, 0.28)', color: '#ffffff', fontWeight: 800, mb: 1.5 }}
          />
          <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', md: '1.9rem' }, mb: 1 }}>
            Designed for Modern Mixed Farms
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.6, fontSize: '0.96rem' }}>
            Manage goats, sheep, dairy cows, poultry flocks, and beehives with automated vaccination reminders, batch-level stock deduction, and exportable PDF & Excel financial statements.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
