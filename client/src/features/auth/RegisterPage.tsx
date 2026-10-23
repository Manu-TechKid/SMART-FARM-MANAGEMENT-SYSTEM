import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Divider, InputAdornment, Link, OutlinedInput, Stack, Typography,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { useAuth } from './AuthContext';
import { errorMessage } from '../../api/client';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });
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

  const inputSx = {
    borderRadius: 2,
    bgcolor: '#f8fafc',
    fontSize: '0.95rem',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
    '&.Mui-focused': { bgcolor: '#ffffff' },
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
      {/* Left Side: Clean Full-Bleed White Registration Panel */}
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
        <Box component="form" onSubmit={submit} noValidate sx={{ width: '100%', maxWidth: 400 }}>
          {/* Brand Lockup */}
          <Stack
            direction="row"
            spacing={1.75}
            alignItems="center"
            justifyContent="center"
            sx={{ mb: 3.5 }}
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
                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.35)',
              }}
            >
              SF
            </Box>
            <Divider orientation="vertical" flexItem sx={{ borderColor: '#d0d7de', height: 36, alignSelf: 'center' }} />
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', lineHeight: 1.15, color: '#0f2930' }}>
                SmartFarm
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                SmartFarm Management
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ textAlign: 'center', mb: 3.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f2930', fontSize: { xs: '1.7rem', sm: '1.9rem' }, mb: 0.5 }}>
              Create Farm Account
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.92rem' }}>
              Register as a farm manager to set up your sections and staff
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', mb: 0.7 }}>
                First name <Box component="span" sx={{ color: '#dc2626' }}>*</Box>
              </Typography>
              <OutlinedInput fullWidth placeholder="First name" value={form.firstName} onChange={set('firstName')} sx={inputSx} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', mb: 0.7 }}>
                Last name <Box component="span" sx={{ color: '#dc2626' }}>*</Box>
              </Typography>
              <OutlinedInput fullWidth placeholder="Last name" value={form.lastName} onChange={set('lastName')} sx={inputSx} />
            </Box>
          </Stack>

          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', mb: 0.7 }}>
              Email address <Box component="span" sx={{ color: '#dc2626' }}>*</Box>
            </Typography>
            <OutlinedInput type="email" fullWidth placeholder="Enter your email address" value={form.email} onChange={set('email')} sx={inputSx} />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', mb: 0.7 }}>
              Password <Box component="span" sx={{ color: '#dc2626' }}>*</Box>
            </Typography>
            <OutlinedInput
              type={showPassword ? 'text' : 'password'}
              fullWidth
              placeholder="Min 8 characters, at least 1 digit"
              value={form.password}
              onChange={set('password')}
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
                    sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600, fontSize: '0.78rem', minWidth: 'auto', px: 1 }}
                  >
                    {showPassword ? 'Hide' : 'Show password'}
                  </Button>
                </InputAdornment>
              }
              sx={inputSx}
            />
          </Box>

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
            {busy ? 'Creating Account…' : 'Create Account'}
          </Button>

          <Typography variant="body2" sx={{ textAlign: 'center', mt: 3, color: '#64748b', fontSize: '0.84rem' }}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" underline="hover" sx={{ fontWeight: 700, color: '#0b4f5c' }}>
              Sign in here
            </Link>
          </Typography>
        </Box>
      </Box>

      {/* Right Side: Full-Bleed Image with Frosted Glass Bottom Overlay Card */}
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 360, md: '100vh' },
          backgroundImage: 'url(/images/farm-harvest-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          p: { xs: 2.5, sm: 4, md: 5 },
        }}
      >
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
          <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.45rem', md: '1.85rem' }, lineHeight: 1.25, mb: 1 }}>
            Every herd, hive, store and harvest in one place
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.88)', fontSize: '0.95rem' }}>
            Run all your farm sections from one integrated system.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
