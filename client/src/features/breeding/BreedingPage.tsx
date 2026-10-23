import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Animal, PagedResult } from '../../types';

const STATUSES = ['Mated', 'Pregnant', 'BirthConfirmed', 'Failed', 'Cancelled'];
const today = () => new Date().toISOString().slice(0, 10);

interface BreedingRow {
  id: number;
  sireId?: number;
  sireTag?: string;
  damId: number;
  damTag: string;
  matingDate: string;
  expectedDOB?: string;
  actualDOB?: string;
  offspringCount?: number;
  status: string;
  notes?: string;
}

export default function BreedingPage() {
  const { farmId } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BreedingRow | null>(null);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ sireId: '', damId: '', matingDate: today(), expectedDOB: '', notes: '' });
  const [editForm, setEditForm] = useState({ status: 'Pregnant', actualDOB: '', offspringCount: '', notes: '' });

  const { data: records, isLoading } = useQuery({
    queryKey: ['breeding', farmId, statusFilter],
    enabled: !!farmId,
    queryFn: async () =>
      (await api.get<BreedingRow[]>(`/farms/${farmId}/breeding`, { params: { status: statusFilter || undefined } })).data,
  });

  const { data: animals } = useQuery({
    queryKey: ['animals-all', farmId],
    enabled: !!farmId && open,
    queryFn: async () => (await api.get<PagedResult<Animal>>(`/farms/${farmId}/animals`, { params: { pageSize: 100 } })).data.items,
  });

  const create = useMutation({
    mutationFn: () =>
      api.post(`/farms/${farmId}/breeding`, {
        sireId: form.sireId ? Number(form.sireId) : null,
        damId: Number(form.damId),
        matingDate: form.matingDate,
        expectedDOB: form.expectedDOB || null,
        notes: form.notes || null,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['breeding'] }); setOpen(false); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const update = useMutation({
    mutationFn: () =>
      api.put(`/farms/${farmId}/breeding/${editTarget!.id}`, {
        status: editForm.status,
        actualDOB: editForm.actualDOB || null,
        offspringCount: editForm.offspringCount ? Number(editForm.offspringCount) : null,
        notes: editForm.notes || null,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['breeding'] }); setEditTarget(null); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const females = (animals ?? []).filter((a) => a.sex === 'Female' && a.status === 'Active');
  const males = (animals ?? []).filter((a) => a.sex === 'Male' && a.status === 'Active');

  if (!farmId) return <Alert severity="info">Select or create a farm in Farm Settings first.</Alert>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Breeding & Reproduction</Typography>
        <Button variant="contained" onClick={() => { setErr(''); setOpen(true); }}>Record mating</Button>
      </Stack>

      <TextField select size="small" label="Filter status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 200 }}>
        <MenuItem value="">All</MenuItem>
        {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
      </TextField>

      <Paper>
        <TableContainer>
          <Table size="small" aria-label="Breeding records">
            <TableHead>
              <TableRow>
                <TableCell>Dam (Female)</TableCell><TableCell>Sire (Male)</TableCell><TableCell>Mating Date</TableCell>
                <TableCell>Expected Birth</TableCell><TableCell>Actual Birth</TableCell><TableCell align="right">Offspring</TableCell>
                <TableCell>Status</TableCell><TableCell>Notes</TableCell><TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={9}>Loading…</TableCell></TableRow>}
              {(!records || records.length === 0) && <TableRow><TableCell colSpan={9}>No breeding records found.</TableCell></TableRow>}
              {records?.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell><strong>{r.damTag}</strong></TableCell>
                  <TableCell>{r.sireTag ?? 'AI / External'}</TableCell>
                  <TableCell>{new Date(r.matingDate).toLocaleDateString()}</TableCell>
                  <TableCell>{r.expectedDOB ? new Date(r.expectedDOB).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>{r.actualDOB ? new Date(r.actualDOB).toLocaleDateString() : '—'}</TableCell>
                  <TableCell align="right">{r.offspringCount ?? '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={r.status} color={r.status === 'BirthConfirmed' ? 'success' : r.status === 'Pregnant' ? 'primary' : r.status === 'Failed' ? 'error' : 'info'} />
                  </TableCell>
                  <TableCell>{r.notes ?? '—'}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => {
                      setEditTarget(r);
                      setEditForm({
                        status: r.status === 'Mated' ? 'Pregnant' : 'BirthConfirmed',
                        actualDOB: r.actualDOB ? r.actualDOB.slice(0, 10) : today(),
                        offspringCount: r.offspringCount ? String(r.offspringCount) : '1',
                        notes: r.notes ?? '',
                      });
                    }}>Update</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!form.damId) { setErr('Select a female dam.'); return; }
          create.mutate();
        }} noValidate>
          <DialogTitle>Record Mating / Breeding</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <TextField select label="Dam (Female)" required value={form.damId} onChange={(e) => setForm({ ...form, damId: e.target.value })} sx={{ mt: 1 }}>
              {females.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.tagId} — {a.name ?? a.species}</MenuItem>)}
            </TextField>
            <TextField select label="Sire (Male — optional if AI)" value={form.sireId} onChange={(e) => setForm({ ...form, sireId: e.target.value })}>
              <MenuItem value="">Artificial Insemination / External</MenuItem>
              {males.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.tagId} — {a.name ?? a.species}</MenuItem>)}
            </TextField>
            <TextField label="Mating date" type="date" value={form.matingDate} onChange={(e) => setForm({ ...form, matingDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Expected birth (blank = auto-calculated by species)" type="date" value={form.expectedDOB} onChange={(e) => setForm({ ...form, expectedDOB: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Notes" multiline minRows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => { e.preventDefault(); update.mutate(); }} noValidate>
          <DialogTitle>Update Breeding — {editTarget?.damTag}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField select label="Status" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} sx={{ mt: 1 }}>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            {editForm.status === 'BirthConfirmed' && (
              <>
                <TextField label="Actual birth date" type="date" value={editForm.actualDOB} onChange={(e) => setEditForm({ ...editForm, actualDOB: e.target.value })} InputLabelProps={{ shrink: true }} />
                <TextField label="Offspring count" type="number" value={editForm.offspringCount} onChange={(e) => setEditForm({ ...editForm, offspringCount: e.target.value })} />
              </>
            )}
            <TextField label="Notes" multiline minRows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setEditTarget(null)}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
