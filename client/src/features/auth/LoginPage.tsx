import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Divider, Link, TextField, Typography } from '@mui/material';
import { useAuth } from './AuthContext';
import { api, errorMessage } from '../../api/client';
import type { Farm } from '../../types';

export default function LoginPage() {
  const { login, register, refreshFarms, setFarmId } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const emailValid = /^\S+@\S+\.\S+$/.test(email);

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
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 440, boxShadow: 4 }}>
        <CardContent component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 2, p: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="primary.main">🌾 Smart Farm Management System</Typography>
            <Typography variant="body2" color="text.secondary">
              Goats • Sheep • Cows • Chickens • Beehives
            </Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            error={email.length > 0 && !emailValid} helperText={email.length > 0 && !emailValid ? 'Invalid email' : ' '} autoComplete="email" required />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <Button type="submit" variant="contained" size="large" disabled={busy}>
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
          >
            🚀 Open Interactive [DEMO] Farm Dashboard
          </Button>
          <Typography variant="body2" textAlign="center">
            No account? <Link component={RouterLink} to="/register">Register a new farm account</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
