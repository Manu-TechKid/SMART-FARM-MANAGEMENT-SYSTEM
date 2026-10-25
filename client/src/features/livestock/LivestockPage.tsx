import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { Animal, PagedResult } from '../../types';

const SPECIES = ['Goat', 'Sheep', 'Cow', 'Chicken'];
const STATUSES = ['Active', 'Sold', 'Deceased', 'Transferred', 'Quarantine'];
const ACQ = ['Born', 'Purchased', 'Transferred', 'Donated'];
const EVENTS = ['Death', 'Sale', 'Transfer', 'WeightCheck', 'Shearing', 'Other'];
const GROUP_TYPES = ['Flock', 'Herd', 'Batch', 'Pen'];
const DESTRUCTIVE = new Set(['Death', 'Sale', 'Transfer']);

interface GroupRow {
  id: number;
  name: string;
  species: string;
  groupType: string;
  count: number;
  locationName?: string;
}

const statusColor = (s: string) =>
  s === 'Active' ? 'success' : s === 'Quarantine' ? 'warning' : s === 'Deceased' ? 'error' : 'default';

const blank = { tagId: '', name: '', species: 'Goat', breed: '', sex: 'Female', dateOfBirth: '', acquisitionType: 'Born', acquisitionCost: '', currentWeightKg: '', notes: '' };
const blankGroup = { name: '', species: 'Chicken', groupType: 'Flock', count: '100', description: '' };

export default function LivestockPage() {
  const { farmId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [species, setSpecies] = useState('');
  const [status, setStatus] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [groupForm, setGroupForm] = useState(blankGroup);
  const [formError, setFormError] = useState('');
  const [eventTarget, setEventTarget] = useState<Animal | null>(null);
  const [eventForm, setEventForm] = useState({ eventType: 'Death', eventDate: new Date().toISOString().slice(0, 10), description: '', amount: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [eventError, setEventError] = useState('');

  const key = ['animals', farmId, page, pageSize, search, species, status];
  const { data, isLoading, error } = useQuery({
    queryKey: key,
    enabled: !!farmId,
    queryFn: async () =>
      (await api.get<PagedResult<Animal>>(`/farms/${farmId}/animals`, {
        params: { page: page + 1, pageSize, search: search || undefined, species: species || undefined, status: status || undefined },
      })).data,
  });

  const { data: groups } = useQuery({
    queryKey: ['groups', farmId],
    enabled: !!farmId,
    queryFn: async () => (await api.get<GroupRow[]>(`/farms/${farmId}/groups`)).data,
  });

  const create = useMutation({
    mutationFn: () => api.post(`/farms/${farmId}/animals`, {
      tagId: form.tagId.trim(), name: form.name || null, species: form.species, breed: form.breed || null, sex: form.sex,
      dateOfBirth: form.dateOfBirth || null, acquisitionType: form.acquisitionType,
      acquisitionCost: form.acquisitionCost ? Number(form.acquisitionCost) : null,
      currentWeightKg: form.currentWeightKg ? Number(form.currentWeightKg) : null, notes: form.notes || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['animals'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setAddOpen(false); setForm(blank); },
    onError: (e) => setFormError(errorMessage(e)),
  });

  const createGroup = useMutation({
    mutationFn: () => api.post(`/farms/${farmId}/groups`, {
      name: groupForm.name.trim(),
      species: groupForm.species,
      groupType: groupForm.groupType,
      count: Number(groupForm.count),
      description: groupForm.description || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setGroupOpen(false); setGroupForm(blankGroup); },
    onError: (e) => setFormError(errorMessage(e)),
  });

  const addEvent = useMutation({
    mutationFn: () => api.post(`/farms/${farmId}/animals/${eventTarget!.id}/events`, {
      eventType: eventForm.eventType, eventDate: eventForm.eventDate,
      description: eventForm.description || null, amount: eventForm.amount ? Number(eventForm.amount) : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['animals'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setConfirmOpen(false); setEventTarget(null); },
    onError: (e) => { setConfirmOpen(false); setEventError(errorMessage(e)); },
  });

  const submitAnimal = (e: FormEvent) => {
    e.preventDefault();
    if (!form.tagId.trim()) { setFormError('Tag ID is required.'); return; }
    if (form.currentWeightKg && Number(form.currentWeightKg) <= 0) { setFormError('Weight must be positive.'); return; }
    if (form.dateOfBirth && new Date(form.dateOfBirth) > new Date()) { setFormError('Birth date cannot be in the future.'); return; }
    setFormError('');
    create.mutate();
  };

  const submitEvent = (e: FormEvent) => {
    e.preventDefault();
    setEventError('');
    if (DESTRUCTIVE.has(eventForm.eventType)) setConfirmOpen(true); else addEvent.mutate();
  };

  if (!farmId) return <Alert severity="info">Create or select a farm in Farm Settings first.</Alert>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Livestock & Flock Management</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => { setFormError(''); setGroupOpen(true); }}>Add Flock / Group</Button>
          <Button variant="contained" onClick={() => { setFormError(''); setAddOpen(true); }}>Register Animal</Button>
        </Stack>
      </Stack>

      {/* Interactive Species Photo Filter Strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        {[
          { key: 'Goat', label: 'Goats', subtitle: 'Boer & Dairy Herd', img: '/images/goats.jpg' },
          { key: 'Sheep', label: 'Sheep', subtitle: 'Flock & Wool', img: '/images/sheep.jpg' },
          { key: 'Cow', label: 'Cows', subtitle: 'Dairy & Beef Cattle', img: '/images/cows.jpg' },
          { key: 'Chicken', label: 'Chickens', subtitle: 'Layers & Broilers', img: '/images/chickens.jpg' },
        ].map((item) => {
          const active = species === item.key;
          return (
            <Paper
              key={item.key}
              onClick={() => { setSpecies(active ? '' : item.key); setPage(0); }}
              sx={{
                position: 'relative',
                height: 105,
                borderRadius: 2.5,
                overflow: 'hidden',
                cursor: 'pointer',
                backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.78) 100%), url(${item.img})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: '#fff',
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                border: active ? '3px solid #2e7d32' : '1px solid rgba(0,0,0,0.12)',
                boxShadow: active ? 4 : 1,
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.1 }}>{item.label}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {active ? '✓ Filtered (click to show all)' : item.subtitle}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={`Individual Animals (${data?.totalCount ?? 0})`} />
        <Tab label={`Flocks, Herds & Batches (${groups?.length ?? 0})`} />
      </Tabs>

      {tab === 0 && (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField size="small" label="Search tag or name" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} sx={{ minWidth: 220 }} />
            <TextField size="small" select label="Species" value={species} onChange={(e) => { setSpecies(e.target.value); setPage(0); }} sx={{ minWidth: 140 }}>
              <MenuItem value="">All</MenuItem>{SPECIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField size="small" select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} sx={{ minWidth: 140 }}>
              <MenuItem value="">All</MenuItem>{STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Stack>

          {error && <Alert severity="error">{errorMessage(error)}</Alert>}
          {eventError && <Alert severity="error" onClose={() => setEventError('')}>{eventError}</Alert>}

          <Paper>
            <TableContainer>
              <Table size="small" aria-label="Livestock register">
                <TableHead>
                  <TableRow>
                    <TableCell>Tag</TableCell><TableCell>Name</TableCell><TableCell>Species</TableCell><TableCell>Breed</TableCell>
                    <TableCell>Sex</TableCell><TableCell align="right">Weight (kg)</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={8}>Loading…</TableCell></TableRow>}
                  {data?.items.length === 0 && <TableRow><TableCell colSpan={8}>No animals found.</TableCell></TableRow>}
                  {data?.items.map((a) => (
                    <TableRow key={a.id} hover>
                      <TableCell><strong>{a.tagId}</strong></TableCell><TableCell>{a.name ?? '—'}</TableCell><TableCell>{a.species}</TableCell>
                      <TableCell>{a.breed ?? '—'}</TableCell><TableCell>{a.sex}</TableCell>
                      <TableCell align="right">{a.currentWeightKg ?? '—'}</TableCell>
                      <TableCell><Chip size="small" label={a.status} color={statusColor(a.status)} /></TableCell>
                      <TableCell align="right">
                        <Button size="small" disabled={a.status !== 'Active' && a.status !== 'Quarantine'}
                          onClick={() => { setEventTarget(a); setEventError(''); }}>Record event</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={data?.totalCount ?? 0} page={page} rowsPerPage={pageSize}
              onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50]} />
          </Paper>
        </>
      )}

      {tab === 1 && (
        <Paper>
          <TableContainer>
            <Table size="small" aria-label="Animal groups">
              <TableHead>
                <TableRow>
                  <TableCell>Group / Flock Name</TableCell><TableCell>Species</TableCell>
                  <TableCell>Type</TableCell><TableCell align="right">Headcount</TableCell><TableCell>Location</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(!groups || groups.length === 0) && <TableRow><TableCell colSpan={5}>No flocks or groups created yet.</TableCell></TableRow>}
                {groups?.map((g) => (
                  <TableRow key={g.id} hover>
                    <TableCell><strong>{g.name}</strong></TableCell>
                    <TableCell>{g.species}</TableCell>
                    <TableCell>{g.groupType}</TableCell>
                    <TableCell align="right"><strong>{g.count.toLocaleString()}</strong></TableCell>
                    <TableCell>{g.locationName ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submitAnimal} noValidate>
          <DialogTitle>Register animal</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField label="Tag ID" required value={form.tagId} onChange={(e) => setForm({ ...form, tagId: e.target.value })} sx={{ mt: 1 }} />
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Stack direction="row" spacing={2}>
              <TextField select label="Species" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} fullWidth>
                {SPECIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField select label="Sex" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} fullWidth>
                {['Female', 'Male', 'Unknown'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField label="Breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
            <Stack direction="row" spacing={2}>
              <TextField label="Date of birth" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Weight (kg)" type="number" value={form.currentWeightKg} onChange={(e) => setForm({ ...form, currentWeightKg: e.target.value })} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField select label="Acquired by" value={form.acquisitionType} onChange={(e) => setForm({ ...form, acquisitionType: e.target.value })} fullWidth>
                {ACQ.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField label="Acquisition cost" type="number" value={form.acquisitionCost} onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })} fullWidth />
            </Stack>
            <TextField label="Notes" multiline minRows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={create.isPending}>Save</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={groupOpen} onClose={() => setGroupOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!groupForm.name.trim() || Number(groupForm.count) <= 0) { setFormError('Name and positive headcount are required.'); return; }
          createGroup.mutate();
        }} noValidate>
          <DialogTitle>Create Flock / Animal Group</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField label="Flock / Group name" required value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} sx={{ mt: 1 }} />
            <Stack direction="row" spacing={2}>
              <TextField select label="Species" fullWidth value={groupForm.species} onChange={(e) => setGroupForm({ ...groupForm, species: e.target.value })}>
                {SPECIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField select label="Group type" fullWidth value={groupForm.groupType} onChange={(e) => setGroupForm({ ...groupForm, groupType: e.target.value })}>
                {GROUP_TYPES.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField label="Initial headcount" type="number" required value={groupForm.count} onChange={(e) => setGroupForm({ ...groupForm, count: e.target.value })} />
            <TextField label="Description" multiline minRows={2} value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setGroupOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Save Group</Button></DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!eventTarget} onClose={() => setEventTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={submitEvent} noValidate>
          <DialogTitle>Record event — {eventTarget?.tagId}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField select label="Event" value={eventForm.eventType} onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })} sx={{ mt: 1 }}>
              {EVENTS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField label="Date" type="date" value={eventForm.eventDate} onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Amount (e.g. sale price)" type="number" value={eventForm.amount} onChange={(e) => setEventForm({ ...eventForm, amount: e.target.value })} />
            <TextField label="Description" multiline minRows={2} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEventTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={addEvent.isPending}>Save</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog open={confirmOpen} busy={addEvent.isPending} title={`Confirm ${eventForm.eventType.toLowerCase()}`}
        message={`This will change ${eventTarget?.tagId}'s status and cannot be undone from this screen. Continue?`}
        confirmLabel="Confirm" onConfirm={() => addEvent.mutate()} onCancel={() => setConfirmOpen(false)} />
    </Stack>
  );
}
