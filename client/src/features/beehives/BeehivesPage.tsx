import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { EditOutlined, DeleteOutline } from '@mui/icons-material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { Beehive, PagedResult } from '../../types';

const HIVE_TYPES = ['Langstroth', 'TopBar', 'Warre', 'Log', 'Other'];
const COLONY = ['Active', 'Weak', 'Dead', 'Absconded', 'Swarm', 'Quarantine'];
const QUEEN_STATUSES = ['Present', 'NotSeen', 'Virgin', 'Replaced'];
const today = () => new Date().toISOString().slice(0, 10);

const colonyColor = (s: string) => (s === 'Active' ? 'success' : s === 'Weak' || s === 'Quarantine' ? 'warning' : 'error');

const blankHive = { hiveCode: '', apiaryName: '', hiveType: 'Langstroth', notes: '' };
const blankInspection = {
  inspectedAt: today(), inspectedBy: '', queenSeen: false, healthScore: 5, hasEggs: false, hasLarvae: false, hasCappedBrood: false,
  framesOfBees: '', framesOfBrood: '', framesOfHoney: '', pestObservations: '', diseaseObservations: '', actionTaken: '', nextInspectionDue: '', notes: '',
};

export default function BeehivesPage() {
  const { farmId } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [status, setStatus] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [hive, setHive] = useState(blankHive);
  const [hiveError, setHiveError] = useState('');
  const [target, setTarget] = useState<Beehive | null>(null);
  const [insp, setInsp] = useState(blankInspection);
  const [inspError, setInspError] = useState('');

  // Edit / Delete states
  const [editHiveTarget, setEditHiveTarget] = useState<Beehive | null>(null);
  const [editHiveForm, setEditHiveForm] = useState({ apiaryName: '', hiveType: 'Langstroth', colonyStatus: 'Active', queenStatus: 'Present', notes: '' });
  const [deleteHiveTarget, setDeleteHiveTarget] = useState<Beehive | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['beehives', farmId, page, pageSize, status],
    enabled: !!farmId,
    queryFn: async () =>
      (await api.get<PagedResult<Beehive>>(`/farms/${farmId}/beehives`, { params: { page: page + 1, pageSize, status: status || undefined } })).data,
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['beehives'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); };

  const createHive = useMutation({
    mutationFn: () => api.post(`/farms/${farmId}/beehives`, { hiveCode: hive.hiveCode.trim(), apiaryName: hive.apiaryName || null, hiveType: hive.hiveType, notes: hive.notes || null }),
    onSuccess: () => { refresh(); setAddOpen(false); setHive(blankHive); },
    onError: (e) => setHiveError(errorMessage(e)),
  });

  const updateHive = useMutation({
    mutationFn: () => api.put(`/farms/${farmId}/beehives/${editHiveTarget!.id}`, {
      apiaryName: editHiveForm.apiaryName || null,
      hiveType: editHiveForm.hiveType,
      colonyStatus: editHiveForm.colonyStatus,
      queenStatus: editHiveForm.queenStatus,
      notes: editHiveForm.notes || null,
    }),
    onSuccess: () => { refresh(); setEditHiveTarget(null); },
    onError: (e) => setHiveError(errorMessage(e)),
  });

  const deleteHive = useMutation({
    mutationFn: () => api.delete(`/farms/${farmId}/beehives/${deleteHiveTarget!.id}`),
    onSuccess: () => { refresh(); setDeleteHiveTarget(null); },
    onError: (e) => setHiveError(errorMessage(e)),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, colonyStatus }: { id: number; colonyStatus: string }) => api.put(`/farms/${farmId}/beehives/${id}`, { colonyStatus }),
    onSuccess: refresh,
  });

  const addInspection = useMutation({
    mutationFn: () => api.post(`/farms/${farmId}/beehives/${target!.id}/inspections`, {
      inspectedAt: insp.inspectedAt, inspectedBy: insp.inspectedBy.trim(), queenSeen: insp.queenSeen, healthScore: Number(insp.healthScore),
      hasEggs: insp.hasEggs, hasLarvae: insp.hasLarvae, hasCappedBrood: insp.hasCappedBrood,
      framesOfBees: insp.framesOfBees ? Number(insp.framesOfBees) : null,
      framesOfBrood: insp.framesOfBrood ? Number(insp.framesOfBrood) : null,
      framesOfHoney: insp.framesOfHoney ? Number(insp.framesOfHoney) : null,
      pestObservations: insp.pestObservations || null, diseaseObservations: insp.diseaseObservations || null,
      actionTaken: insp.actionTaken || null, nextInspectionDue: insp.nextInspectionDue || null, notes: insp.notes || null,
    }),
    onSuccess: () => { refresh(); setTarget(null); setInsp(blankInspection); },
    onError: (e) => setInspError(errorMessage(e)),
  });

  const submitHive = (e: FormEvent) => {
    e.preventDefault();
    if (!hive.hiveCode.trim()) { setHiveError('Hive code is required.'); return; }
    setHiveError(''); createHive.mutate();
  };

  const submitEditHive = (e: FormEvent) => {
    e.preventDefault();
    setHiveError(''); updateHive.mutate();
  };

  const openEditHive = (h: Beehive) => {
    setEditHiveTarget(h);
    setEditHiveForm({
      apiaryName: h.apiaryName ?? '',
      hiveType: h.hiveType ?? 'Langstroth',
      colonyStatus: h.colonyStatus ?? 'Active',
      queenStatus: h.queenStatus ?? 'Present',
      notes: '',
    });
    setHiveError('');
  };

  const submitInspection = (e: FormEvent) => {
    e.preventDefault();
    if (!insp.inspectedBy.trim()) { setInspError('Inspector name is required.'); return; }
    if (insp.healthScore < 1 || insp.healthScore > 10) { setInspError('Health score must be between 1 and 10.'); return; }
    setInspError(''); addInspection.mutate();
  };

  if (!farmId) return <Alert severity="info">Create or select a farm in Farm Settings first.</Alert>;

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          backgroundImage: 'linear-gradient(90deg, rgba(35, 22, 4, 0.88) 0%, rgba(58, 36, 6, 0.68) 60%, rgba(35, 22, 4, 0.45) 100%), url(/images/beehives.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#fff',
          p: { xs: 2.5, md: 3.5 },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={800}>🐝 Apiary & Beehive Management</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Track colony health, brood frame progression, queen performance, and inspection schedules across apiaries.
            </Typography>
          </Box>
          <Button variant="contained" color="warning" onClick={() => { setHive(blankHive); setHiveError(''); setAddOpen(true); }} sx={{ fontWeight: 700 }}>
            + Add Beehive
          </Button>
        </Stack>
      </Box>

      <Stack direction="row" spacing={2} alignItems="center">
        <TextField size="small" select label="Colony status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} sx={{ minWidth: 160 }}>
          <MenuItem value="">All Statuses</MenuItem>
          {COLONY.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Alert severity="error">{errorMessage(error)}</Alert>}
      {hiveError && <Alert severity="error" onClose={() => setHiveError('')}>{hiveError}</Alert>}

      <Paper>
        <TableContainer>
          <Table size="small" aria-label="Beehives">
            <TableHead>
              <TableRow>
                <TableCell>Hive code</TableCell><TableCell>Apiary</TableCell><TableCell>Type</TableCell><TableCell>Colony</TableCell>
                <TableCell>Queen</TableCell><TableCell>Last inspection</TableCell><TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7}>Loading…</TableCell></TableRow>}
              {data?.items.length === 0 && <TableRow><TableCell colSpan={7}>No hives found.</TableCell></TableRow>}
              {data?.items.map((h) => (
                <TableRow key={h.id} hover>
                  <TableCell><strong>{h.hiveCode}</strong></TableCell>
                  <TableCell>{h.apiaryName ?? '—'}</TableCell>
                  <TableCell>{h.hiveType}</TableCell>
                  <TableCell>
                    <TextField select size="small" variant="standard" value={h.colonyStatus} aria-label={`Colony status for ${h.hiveCode}`}
                      onChange={(e) => updateStatus.mutate({ id: h.id, colonyStatus: e.target.value })}>
                      {COLONY.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell><Chip size="small" label={h.queenStatus} color={colonyColor(h.colonyStatus)} variant="outlined" /></TableCell>
                  <TableCell>{h.lastInspectionDate ? new Date(h.lastInspectionDate).toLocaleDateString() : 'Never'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                      <Button size="small" variant="outlined" sx={{ py: 0.25, px: 1, textTransform: 'none', fontSize: '0.78rem' }}
                        onClick={() => { setTarget(h); setInspError(''); }}>Inspect</Button>
                      <Tooltip title="Edit Beehive">
                        <IconButton size="small" color="primary" onClick={() => openEditHive(h)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Beehive">
                        <IconButton size="small" color="error" onClick={() => setDeleteHiveTarget(h)}>
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
        <TablePagination component="div" count={data?.totalCount ?? 0} page={page} rowsPerPage={pageSize}
          onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50]} />
      </Paper>

      {/* Add Beehive Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={submitHive} noValidate>
          <DialogTitle fontWeight={700}>Add Beehive</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {hiveError && <Alert severity="error">{hiveError}</Alert>}
            <TextField label="Hive code (e.g. HIVE-01)" required value={hive.hiveCode} onChange={(e) => setHive({ ...hive, hiveCode: e.target.value })} sx={{ mt: 1 }} />
            <TextField label="Apiary name (e.g. South Orchard)" value={hive.apiaryName} onChange={(e) => setHive({ ...hive, apiaryName: e.target.value })} />
            <TextField select label="Hive type" value={hive.hiveType} onChange={(e) => setHive({ ...hive, hiveType: e.target.value })}>
              {HIVE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField label="Notes" multiline rows={2} value={hive.notes} onChange={(e) => setHive({ ...hive, notes: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="warning" disabled={createHive.isPending}>Save Hive</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Beehive Dialog */}
      <Dialog open={!!editHiveTarget} onClose={() => setEditHiveTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={submitEditHive} noValidate>
          <DialogTitle fontWeight={700}>Edit Beehive — {editHiveTarget?.hiveCode}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {hiveError && <Alert severity="error">{hiveError}</Alert>}
            <TextField label="Apiary name" value={editHiveForm.apiaryName} onChange={(e) => setEditHiveForm({ ...editHiveForm, apiaryName: e.target.value })} sx={{ mt: 1 }} />
            <TextField select label="Hive type" value={editHiveForm.hiveType} onChange={(e) => setEditHiveForm({ ...editHiveForm, hiveType: e.target.value })}>
              {HIVE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField select label="Colony status" value={editHiveForm.colonyStatus} onChange={(e) => setEditHiveForm({ ...editHiveForm, colonyStatus: e.target.value })}>
              {COLONY.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField select label="Queen status" value={editHiveForm.queenStatus} onChange={(e) => setEditHiveForm({ ...editHiveForm, queenStatus: e.target.value })}>
              {QUEEN_STATUSES.map((q) => <MenuItem key={q} value={q}>{q}</MenuItem>)}
            </TextField>
            <TextField label="Notes" multiline rows={2} value={editHiveForm.notes} onChange={(e) => setEditHiveForm({ ...editHiveForm, notes: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditHiveTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="warning" disabled={updateHive.isPending}>Save Changes</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Beehive Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteHiveTarget}
        title={`Delete Beehive ${deleteHiveTarget?.hiveCode}?`}
        message={`Are you sure you want to delete hive "${deleteHiveTarget?.hiveCode}"? Its inspection records will also be removed.`}
        confirmLabel="Delete"
        busy={deleteHive.isPending}
        onConfirm={() => deleteHive.mutate()}
        onCancel={() => setDeleteHiveTarget(null)}
      />

      {/* Record Inspection Dialog */}
      <Dialog open={!!target} onClose={() => setTarget(null)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submitInspection} noValidate>
          <DialogTitle fontWeight={700}>Record Inspection — {target?.hiveCode}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {inspError && <Alert severity="error">{inspError}</Alert>}
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <TextField label="Inspection date" type="date" InputLabelProps={{ shrink: true }} value={insp.inspectedAt} onChange={(e) => setInsp({ ...insp, inspectedAt: e.target.value })} fullWidth />
              <TextField label="Inspector name" required value={insp.inspectedBy} onChange={(e) => setInsp({ ...insp, inspectedBy: e.target.value })} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Health score (1-10)" type="number" inputProps={{ min: 1, max: 10 }} value={insp.healthScore} onChange={(e) => setInsp({ ...insp, healthScore: Number(e.target.value) })} fullWidth />
              <FormControlLabel control={<Checkbox checked={insp.queenSeen} onChange={(e) => setInsp({ ...insp, queenSeen: e.target.checked })} />} label="Queen seen" />
            </Stack>
            <Stack direction="row" spacing={2}>
              <FormControlLabel control={<Checkbox checked={insp.hasEggs} onChange={(e) => setInsp({ ...insp, hasEggs: e.target.checked })} />} label="Eggs present" />
              <FormControlLabel control={<Checkbox checked={insp.hasLarvae} onChange={(e) => setInsp({ ...insp, hasLarvae: e.target.checked })} />} label="Larvae present" />
              <FormControlLabel control={<Checkbox checked={insp.hasCappedBrood} onChange={(e) => setInsp({ ...insp, hasCappedBrood: e.target.checked })} />} label="Capped brood" />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Frames of bees" type="number" value={insp.framesOfBees} onChange={(e) => setInsp({ ...insp, framesOfBees: e.target.value })} fullWidth />
              <TextField label="Frames of brood" type="number" value={insp.framesOfBrood} onChange={(e) => setInsp({ ...insp, framesOfBrood: e.target.value })} fullWidth />
              <TextField label="Frames of honey" type="number" value={insp.framesOfHoney} onChange={(e) => setInsp({ ...insp, framesOfHoney: e.target.value })} fullWidth />
            </Stack>
            <TextField label="Pest observations" value={insp.pestObservations} onChange={(e) => setInsp({ ...insp, pestObservations: e.target.value })} />
            <TextField label="Action taken" value={insp.actionTaken} onChange={(e) => setInsp({ ...insp, actionTaken: e.target.value })} />
            <TextField label="Next inspection due" type="date" InputLabelProps={{ shrink: true }} value={insp.nextInspectionDue} onChange={(e) => setInsp({ ...insp, nextInspectionDue: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="warning" disabled={addInspection.isPending}>Save Inspection</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
