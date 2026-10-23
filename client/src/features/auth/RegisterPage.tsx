import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, Link, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from './AuthContext';
import { errorMessage } from '../../api/client';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
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
    setBusy(true); setError('');
    try { await register(form.firstName, form.lastName, form.email, form.password); navigate('/'); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.25fr 1fr' }, bgcolor: 'background.default' }}>
      <Box
        sx={{
          minHeight: { xs: 260, md: '100vh' },
          backgroundImage: 'linear-gradient(180deg, rgba(12, 38, 22, 0.35) 0%, rgba(10, 32, 18, 0.88) 100%), url(/images/farm-harvest-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { xs: 3, md: 6 },
          color: '#fff',
        }}
      >
        <Stack direction="row" spacing={1}>
          <Chip label="🌾 SMART FARM OS" sx={{ bgcolor: 'rgba(46, 125, 50, 0.9)', color: '#fff', fontWeight: 700 }} />
        </Stack>
        <Box sx={{ maxWidth: 600 }}>
          <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.4rem' }, mb: 1.5 }}>
            Launch Your Digital Farm Workspace
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
            Manage goats, sheep, dairy cows, poultry flocks, and beehives with end-to-end production batch traceability and real-time financial reporting.
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
          Role-Based Access Control • Multi-Farm Isolation • Exportable PDF & Excel Reports
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', placeItems: 'center', p: { xs: 2.5, md: 5 }, bgcolor: '#f6f8f5' }}>
        <Card sx={{ width: '100%', maxWidth: 460, boxShadow: '0 12px 32px rgba(0,0,0,0.08)', borderRadius: 3 }}>
          <CardContent component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 2, p: { xs: 3, sm: 4 } }}>
            <Typography variant="h5" fontWeight={800} color="primary.main">Create Farm Account</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="First name" value={form.firstName} onChange={set('firstName')} fullWidth required />
              <TextField label="Last name" value={form.lastName} onChange={set('lastName')} fullWidth required />
            </Stack>
            <TextField label="Email" type="email" value={form.email} onChange={set('email')} required />
            <TextField
              label="Password"
              type="password"
              value={form.password}
              onChange={set('password')}
              error={form.password.length > 0 && !passwordOk}
              helperText="Min 8 characters, at least one digit"
              required
            />
            <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ py: 1.3, fontWeight: 700 }}>
              {busy ? 'Creating…' : 'Register'}
            </Button>
            <Typography variant="body2" textAlign="center">
              Already registered? <Link component={RouterLink} to="/login" fontWeight={600}>Sign in</Link>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
