import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { EditOutlined, DeleteOutline } from '@mui/icons-material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { Animal, PagedResult } from '../../types';

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

const STATUSES = ['Mated', 'Pregnant', 'BirthConfirmed', 'Failed'];
const today = () => new Date().toISOString().slice(0, 10);

export default function BreedingPage() {
  const { farmId } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ damId: '', sireId: '', matingDate: today(), notes: '' });

  const [editTarget, setEditTarget] = useState<BreedingRow | null>(null);
  const [editForm, setEditForm] = useState({ status: 'Pregnant', actualDOB: '', offspringCount: '1', notes: '' });
  const [deleteTarget, setDeleteTarget] = useState<BreedingRow | null>(null);

  const { data: records, isLoading } = useQuery({
    queryKey: ['breeding', farmId],
    enabled: !!farmId,
    queryFn: async () => (await api.get<BreedingRow[]>(`/farms/${farmId}/breeding`)).data,
  });

  const { data: animals } = useQuery({
    queryKey: ['animals-all', farmId],
    enabled: !!farmId && open,
    queryFn: async () => (await api.get<PagedResult<Animal>>(`/farms/${farmId}/animals`, { params: { pageSize: 100 } })).data.items,
  });

  const females = animals?.filter((a) => a.sex === 'Female') ?? [];
  const males = animals?.filter((a) => a.sex === 'Male') ?? [];

  const create = useMutation({
    mutationFn: () =>
      api.post(`/farms/${farmId}/breeding`, {
        damId: Number(form.damId),
        sireId: form.sireId ? Number(form.sireId) : null,
        matingDate: form.matingDate,
        notes: form.notes || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['breeding'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setOpen(false);
      setForm({ damId: '', sireId: '', matingDate: today(), notes: '' });
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['breeding'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setEditTarget(null);
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  const deleteBreeding = useMutation({
    mutationFn: () => api.delete(`/farms/${farmId}/breeding/${deleteTarget!.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['breeding'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteTarget(null);
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Breeding & Calving Pipeline</Typography>
          <Typography variant="body2" color="text.secondary">
            AI & natural service mating logs, estimated gestation dates, and birth records for lineage tracking.
          </Typography>
        </Box>
        <Button variant="contained" color="success" onClick={() => { setErr(''); setOpen(true); }} sx={{ fontWeight: 700 }}>
          + Record Service / Mating
        </Button>
      </Stack>

      {err && <Alert severity="error" onClose={() => setErr('')}>{err}</Alert>}

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
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                      <Tooltip title="Update Breeding Record">
                        <IconButton size="small" color="primary" onClick={() => {
                          setEditTarget(r);
                          setEditForm({
                            status: r.status === 'Mated' ? 'Pregnant' : 'BirthConfirmed',
                            actualDOB: r.actualDOB ? r.actualDOB.slice(0, 10) : today(),
                            offspringCount: r.offspringCount ? String(r.offspringCount) : '1',
                            notes: r.notes ?? '',
                          });
                        }}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Breeding Record">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(r)}>
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Record Service Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!form.damId) { setErr('Select a female dam.'); return; }
          create.mutate();
        }}>
          <DialogTitle fontWeight={700}>Record Mating / Service</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField select label="Dam (Female)" required value={form.damId} onChange={(e) => setForm({ ...form, damId: e.target.value })} sx={{ mt: 1 }}>
              {females.map((f) => <MenuItem key={f.id} value={f.id}>{f.tagId} ({f.species}{f.breed ? ` - ${f.breed}` : ''})</MenuItem>)}
            </TextField>
            <TextField select label="Sire (Male / Bull / Ram / Buck)" value={form.sireId} onChange={(e) => setForm({ ...form, sireId: e.target.value })}>
              <MenuItem value="">AI / External Semen</MenuItem>
              {males.map((m) => <MenuItem key={m.id} value={m.id}>{m.tagId} ({m.species}{m.breed ? ` - ${m.breed}` : ''})</MenuItem>)}
            </TextField>
            <TextField label="Service / Mating Date" type="date" InputLabelProps={{ shrink: true }} value={form.matingDate} onChange={(e) => setForm({ ...form, matingDate: e.target.value })} />
            <TextField label="Notes / Semen Batch" multiline rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Save Service</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Update Breeding Dialog */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          update.mutate();
        }}>
          <DialogTitle fontWeight={700}>Update Status — Dam {editTarget?.damTag}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField select label="Breeding Status" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} sx={{ mt: 1 }}>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            {editForm.status === 'BirthConfirmed' && (
              <>
                <TextField label="Actual Birth Date" type="date" InputLabelProps={{ shrink: true }} value={editForm.actualDOB} onChange={(e) => setEditForm({ ...editForm, actualDOB: e.target.value })} />
                <TextField label="Offspring Count" type="number" value={editForm.offspringCount} onChange={(e) => setEditForm({ ...editForm, offspringCount: e.target.value })} />
              </>
            )}
            <TextField label="Notes / Newborn Health" multiline rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Update Status</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Breeding Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Breeding Record?"
        message={`Are you sure you want to delete the breeding record for Dam ${deleteTarget?.damTag}?`}
        confirmLabel="Delete"
        busy={deleteBreeding.isPending}
        onConfirm={() => deleteBreeding.mutate()}
        onCancel={() => setDeleteTarget(null)}
      />
    </Stack>
  );
}
