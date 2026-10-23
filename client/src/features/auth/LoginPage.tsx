import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Link, TextField, Typography } from '@mui/material';
import { useAuth } from './AuthContext';
import { errorMessage } from '../../api/client';

export default function LoginPage() {
  const { login } = useAuth();
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

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 2 }}>
          <Typography variant="h5" fontWeight={700}>🌾 Smart Farm — Sign in</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            error={email.length > 0 && !emailValid} helperText={email.length > 0 && !emailValid ? 'Invalid email' : ' '} autoComplete="email" required />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
          <Typography variant="body2">
            No account? <Link component={RouterLink} to="/register">Register</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
