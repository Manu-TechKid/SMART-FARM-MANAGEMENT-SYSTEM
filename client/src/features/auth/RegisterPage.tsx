import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Link, TextField, Typography } from '@mui/material';
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
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 460 }}>
        <CardContent component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 2 }}>
          <Typography variant="h5" fontWeight={700}>Create account</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="First name" value={form.firstName} onChange={set('firstName')} required />
          <TextField label="Last name" value={form.lastName} onChange={set('lastName')} required />
          <TextField label="Email" type="email" value={form.email} onChange={set('email')} required />
          <TextField label="Password" type="password" value={form.password} onChange={set('password')}
            error={form.password.length > 0 && !passwordOk} helperText="Min 8 characters, at least one digit" required />
          <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Creating…' : 'Register'}</Button>
          <Typography variant="body2">Already registered? <Link component={RouterLink} to="/login">Sign in</Link></Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
