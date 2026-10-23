import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography,
} from '@mui/material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Beehive, PagedResult } from '../../types';

const HIVE_TYPES = ['Langstroth', 'TopBar', 'Warre', 'Log', 'Other'];
const COLONY = ['Active', 'Weak', 'Dead', 'Absconded', 'Swarm', 'Quarantine'];
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

  const submitInspection = (e: FormEvent) => {
    e.preventDefault();
    if (!insp.inspectedBy.trim()) { setInspError('Inspector name is required.'); return; }
    if (insp.healthScore < 1 || insp.healthScore > 10) { setInspError('Health score must be between 1 and 10.'); return; }
    setInspError(''); addInspection.mutate();
  };

  if (!farmId) return <Alert severity="info">Create or select a farm in Farm Settings first.</Alert>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Beehives</Typography>
        <Button variant="contained" onClick={() => { setHiveError(''); setAddOpen(true); }}>Register hive</Button>
      </Stack>

      <TextField size="small" select label="Colony status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} sx={{ width: 180 }}>
        <MenuItem value="">All</MenuItem>{COLONY.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
      </TextField>

      {error && <Alert severity="error">{errorMessage(error)}</Alert>}

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
                  <TableCell>{h.hiveCode}</TableCell><TableCell>{h.apiaryName ?? '—'}</TableCell><TableCell>{h.hiveType}</TableCell>
                  <TableCell>
                    <TextField select size="small" variant="standard" value={h.colonyStatus} aria-label={`Colony status for ${h.hiveCode}`}
                      onChange={(e) => updateStatus.mutate({ id: h.id, colonyStatus: e.target.value })}>
                      {COLONY.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell><Chip size="small" label={h.queenStatus} color={colonyColor(h.colonyStatus)} variant="outlined" /></TableCell>
                  <TableCell>{h.lastInspectionDate ? new Date(h.lastInspectionDate).toLocaleDateString() : 'Never'}</TableCell>
                  <TableCell align="right"><Button size="small" onClick={() => { setTarget(h); setInspError(''); }}>Inspect</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={data?.totalCount ?? 0} page={page} rowsPerPage={pageSize}
          onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50]} />
      </Paper>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={submitHive} noValidate>
          <DialogTitle>Register hive</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {hiveError && <Alert severity="error">{hiveError}</Alert>}
            <TextField label="Hive code" required value={hive.hiveCode} onChange={(e) => setHive({ ...hive, hiveCode: e.target.value })} sx={{ mt: 1 }} />
            <TextField label="Apiary" value={hive.apiaryName} onChange={(e) => setHive({ ...hive, apiaryName: e.target.value })} />
            <TextField select label="Hive type" value={hive.hiveType} onChange={(e) => setHive({ ...hive, hiveType: e.target.value })}>
              {HIVE_TYPES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField label="Notes" multiline minRows={2} value={hive.notes} onChange={(e) => setHive({ ...hive, notes: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setAddOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={createHive.isPending}>Save</Button></DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!target} onClose={() => setTarget(null)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submitInspection} noValidate>
          <DialogTitle>Inspection — {target?.hiveCode}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {inspError && <Alert severity="error">{inspError}</Alert>}
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <TextField label="Date" type="date" value={insp.inspectedAt} onChange={(e) => setInsp({ ...insp, inspectedAt: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Inspector" required value={insp.inspectedBy} onChange={(e) => setInsp({ ...insp, inspectedBy: e.target.value })} fullWidth />
            </Stack>
            <TextField label="Health score (1–10)" type="number" inputProps={{ min: 1, max: 10 }} value={insp.healthScore} onChange={(e) => setInsp({ ...insp, healthScore: Number(e.target.value) })} />
            <Stack direction="row" flexWrap="wrap">
              <FormControlLabel control={<Checkbox checked={insp.queenSeen} onChange={(e) => setInsp({ ...insp, queenSeen: e.target.checked })} />} label="Queen seen" />
              <FormControlLabel control={<Checkbox checked={insp.hasEggs} onChange={(e) => setInsp({ ...insp, hasEggs: e.target.checked })} />} label="Eggs" />
              <FormControlLabel control={<Checkbox checked={insp.hasLarvae} onChange={(e) => setInsp({ ...insp, hasLarvae: e.target.checked })} />} label="Larvae" />
              <FormControlLabel control={<Checkbox checked={insp.hasCappedBrood} onChange={(e) => setInsp({ ...insp, hasCappedBrood: e.target.checked })} />} label="Capped brood" />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Frames of bees" type="number" value={insp.framesOfBees} onChange={(e) => setInsp({ ...insp, framesOfBees: e.target.value })} fullWidth />
              <TextField label="Frames of brood" type="number" value={insp.framesOfBrood} onChange={(e) => setInsp({ ...insp, framesOfBrood: e.target.value })} fullWidth />
              <TextField label="Frames of honey" type="number" value={insp.framesOfHoney} onChange={(e) => setInsp({ ...insp, framesOfHoney: e.target.value })} fullWidth />
            </Stack>
            <TextField label="Pest observations" value={insp.pestObservations} onChange={(e) => setInsp({ ...insp, pestObservations: e.target.value })} />
            <TextField label="Disease observations" value={insp.diseaseObservations} onChange={(e) => setInsp({ ...insp, diseaseObservations: e.target.value })} />
            <TextField label="Action taken" value={insp.actionTaken} onChange={(e) => setInsp({ ...insp, actionTaken: e.target.value })} />
            <TextField label="Next inspection due" type="date" value={insp.nextInspectionDue} onChange={(e) => setInsp({ ...insp, nextInspectionDue: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Notes" multiline minRows={2} value={insp.notes} onChange={(e) => setInsp({ ...insp, notes: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setTarget(null)}>Cancel</Button><Button type="submit" variant="contained" disabled={addInspection.isPending}>Save</Button></DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
