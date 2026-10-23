import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Button, Card, CardContent, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Farm } from '../../types';

type FarmForm = Pick<Farm, 'name'> & Partial<Omit<Farm, 'id' | 'name' | 'ownerId' | 'createdAt'>>;
const empty: FarmForm = { name: '', description: '', address: '', county: '', country: 'Kenya', phoneNumber: '', email: '' };
const LOC_TYPES = ['Barn', 'Field', 'Apiary', 'Pen', 'Pond', 'Other'];

interface LocationRow { id: number; name: string; type: string; description?: string; }

export default function FarmSettingsPage() {
  const { farms, farmId, setFarmId, refreshFarms } = useAuth();
  const qc = useQueryClient();
  const current = farms.find((f) => f.id === farmId);
  const [mode, setMode] = useState<'edit' | 'create'>('edit');
  const [form, setForm] = useState<FarmForm>(empty);
  const [locForm, setLocForm] = useState({ name: '', type: 'Barn', description: '' });
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const creating = mode === 'create' || !current;

  const { data: locations } = useQuery({
    queryKey: ['locations', farmId],
    enabled: !!farmId,
    queryFn: async () => (await api.get<LocationRow[]>(`/farms/${farmId}/locations`)).data,
  });

  useEffect(() => {
    if (!creating && current) {
      const { id: _id, ownerId: _o, createdAt: _c, ...rest } = current;
      setForm({ ...empty, ...rest });
    } else {
      setForm(empty);
    }
  }, [current, creating]);

  const set = (k: keyof FarmForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setMsg({ type: 'error', text: 'Farm name is required.' }); return; }
    setBusy(true); setMsg(null);
    try {
      if (creating) {
        const { data } = await api.post<Farm>('/farms', form);
        await refreshFarms();
        setFarmId(data.id);
        setMode('edit');
        setMsg({ type: 'success', text: 'Farm created.' });
      } else {
        await api.put(`/farms/${current!.id}`, form);
        await refreshFarms();
        setMsg({ type: 'success', text: 'Farm updated.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: errorMessage(err) });
    } finally { setBusy(false); }
  };

  const addLocation = useMutation({
    mutationFn: () => api.post(`/farms/${farmId}/locations`, locForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations', farmId] });
      setLocForm({ name: '', type: 'Barn', description: '' });
      setMsg({ type: 'success', text: 'Farm section / location added.' });
    },
    onError: (e) => setMsg({ type: 'error', text: errorMessage(e) }),
  });

  const seedDemo = useMutation({
    mutationFn: async () => (await api.post<{ message: string }>(`/farms/${farmId}/seed-demo`)).data,
    onSuccess: (res) => {
      qc.invalidateQueries();
      setMsg({ type: 'success', text: res.message });
    },
    onError: (e) => setMsg({ type: 'error', text: errorMessage(e) }),
  });

  return (
    <Stack spacing={3} sx={{ maxWidth: 760 }}>
      <Typography variant="h5" fontWeight={700}>Farm Settings & Configuration</Typography>
      {!current && <Alert severity="info">You do not have a farm yet. Create one to start recording data.</Alert>}
      {msg && <Alert severity={msg.type} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Card>
        <CardContent component="form" onSubmit={submit} noValidate sx={{ display: 'grid', gap: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>{creating ? 'New farm' : 'Farm details'}</Typography>
          <TextField label="Farm name" value={form.name} onChange={set('name')} required error={!form.name.trim() && !!msg} />
          <TextField label="Description" value={form.description ?? ''} onChange={set('description')} multiline minRows={2} />
          <TextField label="Address" value={form.address ?? ''} onChange={set('address')} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="County / Region" value={form.county ?? ''} onChange={set('county')} fullWidth />
            <TextField label="Country" value={form.country ?? ''} onChange={set('country')} fullWidth />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Phone" value={form.phoneNumber ?? ''} onChange={set('phoneNumber')} fullWidth />
            <TextField label="Email" type="email" value={form.email ?? ''} onChange={set('email')} fullWidth />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" disabled={busy}>{creating ? 'Create farm' : 'Save changes'}</Button>
            {current && (
              <Button onClick={() => setMode(creating ? 'edit' : 'create')} disabled={busy}>
                {creating ? 'Cancel' : 'Add another farm'}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {current && (
        <>
          <Card>
            <CardContent sx={{ display: 'grid', gap: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>Farm Sections, Barns, Paddocks & Apiaries</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} component="form" onSubmit={(e: FormEvent) => {
                e.preventDefault();
                if (!locForm.name.trim()) return;
                addLocation.mutate();
              }}>
                <TextField size="small" label="Section name" required value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} fullWidth />
                <TextField select size="small" label="Type" value={locForm.type} onChange={(e) => setLocForm({ ...locForm, type: e.target.value })} sx={{ minWidth: 140 }}>
                  {LOC_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                <TextField size="small" label="Description" value={locForm.description} onChange={(e) => setLocForm({ ...locForm, description: e.target.value })} fullWidth />
                <Button type="submit" variant="outlined" sx={{ whiteSpace: 'nowrap' }}>Add Section</Button>
              </Stack>

              <Paper variant="outlined">
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Section Name</TableCell><TableCell>Type</TableCell><TableCell>Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(!locations || locations.length === 0) && <TableRow><TableCell colSpan={3}>No farm sections configured yet.</TableCell></TableRow>}
                      {locations?.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell><strong>{l.name}</strong></TableCell>
                          <TableCell>{l.type}</TableCell>
                          <TableCell>{l.description ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ display: 'grid', gap: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={600}>Optional Evaluation Demo Dataset ([DEMO])</Typography>
              <Typography variant="body2" color="text.secondary">
                No fake records are generated by default. If you wish to evaluate all modules with sample livestock (goats, sheep, cows, chickens), beehives, production batches, vaccinations, deliveries, inventory, and sales, click below to load clearly labeled <code>[DEMO]</code> records.
              </Typography>
              <Stack direction="row">
                <Button variant="outlined" color="secondary" onClick={() => seedDemo.mutate()} disabled={seedDemo.isPending}>
                  {seedDemo.isPending ? 'Loading [DEMO] records…' : 'Load Explicitly Labeled [DEMO] Dataset'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  );
}
