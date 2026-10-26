import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TablePagination, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { EditOutlined, DeleteOutline } from '@mui/icons-material';
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

  // Edit / Delete states
  const [editAnimalTarget, setEditAnimalTarget] = useState<Animal | null>(null);
  const [editAnimalForm, setEditAnimalForm] = useState({ name: '', breed: '', sex: 'Female', currentWeightKg: '', status: 'Active', dateOfBirth: '', notes: '' });
  const [deleteAnimalTarget, setDeleteAnimalTarget] = useState<Animal | null>(null);

  const [editGroupTarget, setEditGroupTarget] = useState<GroupRow | null>(null);
  const [editGroupForm, setEditGroupForm] = useState({ name: '', species: 'Chicken', groupType: 'Flock', count: '100', description: '' });
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<GroupRow | null>(null);

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

  const updateAnimal = useMutation({
    mutationFn: () => api.put(`/farms/${farmId}/animals/${editAnimalTarget!.id}`, {
      name: editAnimalForm.name || null,
      breed: editAnimalForm.breed || null,
      sex: editAnimalForm.sex,
      currentWeightKg: editAnimalForm.currentWeightKg ? Number(editAnimalForm.currentWeightKg) : null,
      status: editAnimalForm.status,
      dateOfBirth: editAnimalForm.dateOfBirth || null,
      notes: editAnimalForm.notes || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['animals'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setEditAnimalTarget(null); },
    onError: (e) => setFormError(errorMessage(e)),
  });

  const deleteAnimal = useMutation({
    mutationFn: () => api.delete(`/farms/${farmId}/animals/${deleteAnimalTarget!.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['animals'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setDeleteAnimalTarget(null); },
    onError: (e) => setEventError(errorMessage(e)),
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

  const updateGroup = useMutation({
    mutationFn: () => api.put(`/farms/${farmId}/groups/${editGroupTarget!.id}`, {
      name: editGroupForm.name.trim(),
      species: editGroupForm.species,
      groupType: editGroupForm.groupType,
      count: Number(editGroupForm.count),
      description: editGroupForm.description || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setEditGroupTarget(null); },
    onError: (e) => setFormError(errorMessage(e)),
  });

  const deleteGroup = useMutation({
    mutationFn: () => api.delete(`/farms/${farmId}/groups/${deleteGroupTarget!.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setDeleteGroupTarget(null); },
    onError: (e) => setEventError(errorMessage(e)),
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

  const submitEditAnimal = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    updateAnimal.mutate();
  };

  const submitEditGroup = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    updateGroup.mutate();
  };

  const submitEvent = (e: FormEvent) => {
    e.preventDefault();
    setEventError('');
    if (DESTRUCTIVE.has(eventForm.eventType)) setConfirmOpen(true); else addEvent.mutate();
  };

  const openEditAnimal = (a: Animal) => {
    setEditAnimalTarget(a);
    setEditAnimalForm({
      name: a.name ?? '',
      breed: a.breed ?? '',
      sex: a.sex ?? 'Female',
      currentWeightKg: a.currentWeightKg ? String(a.currentWeightKg) : '',
      status: a.status ?? 'Active',
      dateOfBirth: a.dateOfBirth ? a.dateOfBirth.slice(0, 10) : '',
      notes: '',
    });
    setFormError('');
  };

  const openEditGroup = (g: GroupRow) => {
    setEditGroupTarget(g);
    setEditGroupForm({
      name: g.name,
      species: g.species,
      groupType: g.groupType,
      count: String(g.count),
      description: '',
    });
    setFormError('');
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Typography variant="h5" fontWeight={700}>Livestock & Flock Management</Typography>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" color="success" onClick={() => { setGroupForm(blankGroup); setFormError(''); setGroupOpen(true); }}>
            Add Flock / Group
          </Button>
          <Button variant="contained" color="success" onClick={() => { setForm(blank); setFormError(''); setAddOpen(true); }}>
            Register Animal
          </Button>
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
                backgroundImage: `url(${item.img})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: active ? '0 0 0 3px #2e7d32' : '0 2px 8px rgba(0,0,0,0.12)',
                transform: active ? 'scale(1.02)' : 'none',
                transition: 'transform 0.18s, box-shadow 0.18s',
                '&:hover': { transform: 'scale(1.02)' },
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: active ? 'rgba(21, 56, 31, 0.45)' : 'rgba(0,0,0,0.38)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  p: 1.5,
                  color: '#ffffff',
                }}
              >
                <Typography variant="subtitle2" fontWeight={800}>{item.label}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.88, fontSize: '0.72rem' }}>{item.subtitle}</Typography>
              </Box>
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
            <TextField size="small" placeholder="Search tag or name" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} sx={{ minWidth: 220 }} />
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
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                          <Button size="small" variant="outlined" sx={{ py: 0.25, px: 1, textTransform: 'none', fontSize: '0.78rem' }}
                            disabled={a.status !== 'Active' && a.status !== 'Quarantine'}
                            onClick={() => { setEventTarget(a); setEventError(''); }}>Record Event</Button>
                          <Tooltip title="Edit Animal">
                            <IconButton size="small" color="primary" onClick={() => openEditAnimal(a)}>
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Animal">
                            <IconButton size="small" color="error" onClick={() => setDeleteAnimalTarget(a)}>
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
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(!groups || groups.length === 0) && <TableRow><TableCell colSpan={6}>No flocks or groups created yet.</TableCell></TableRow>}
                {groups?.map((g) => (
                  <TableRow key={g.id} hover>
                    <TableCell><strong>{g.name}</strong></TableCell>
                    <TableCell>{g.species}</TableCell>
                    <TableCell>{g.groupType}</TableCell>
                    <TableCell align="right"><strong>{g.count.toLocaleString()}</strong></TableCell>
                    <TableCell>{g.locationName ?? '—'}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                        <Tooltip title="Edit Group">
                          <IconButton size="small" color="primary" onClick={() => openEditGroup(g)}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Group">
                          <IconButton size="small" color="error" onClick={() => setDeleteGroupTarget(g)}>
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
      )}

      {/* Register Animal Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submitAnimal} noValidate>
          <DialogTitle fontWeight={700}>Register Animal</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField label="Tag ID" required value={form.tagId} onChange={(e) => setForm({ ...form, tagId: e.target.value })} sx={{ mt: 1 }} />
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Stack direction="row" spacing={2}>
              <TextField select label="Species" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} fullWidth>
                {SPECIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField select label="Sex" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} fullWidth>
                <MenuItem value="Female">Female</MenuItem><MenuItem value="Male">Male</MenuItem>
              </TextField>
            </Stack>
            <TextField label="Breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
            <TextField label="Date of birth" type="date" InputLabelProps={{ shrink: true }} value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            <TextField label="Current weight (kg)" type="number" value={form.currentWeightKg} onChange={(e) => setForm({ ...form, currentWeightKg: e.target.value })} />
            <Stack direction="row" spacing={2}>
              <TextField select label="Acquisition type" value={form.acquisitionType} onChange={(e) => setForm({ ...form, acquisitionType: e.target.value })} fullWidth>
                {ACQ.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </TextField>
              <TextField label="Acquisition cost" type="number" value={form.acquisitionCost} onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })} fullWidth />
            </Stack>
            <TextField label="Notes" multiline rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success" disabled={create.isPending}>Save Animal</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Animal Dialog */}
      <Dialog open={!!editAnimalTarget} onClose={() => setEditAnimalTarget(null)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submitEditAnimal} noValidate>
          <DialogTitle fontWeight={700}>Edit Animal — {editAnimalTarget?.tagId}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField label="Name" value={editAnimalForm.name} onChange={(e) => setEditAnimalForm({ ...editAnimalForm, name: e.target.value })} sx={{ mt: 1 }} />
            <Stack direction="row" spacing={2}>
              <TextField label="Breed" value={editAnimalForm.breed} onChange={(e) => setEditAnimalForm({ ...editAnimalForm, breed: e.target.value })} fullWidth />
              <TextField select label="Sex" value={editAnimalForm.sex} onChange={(e) => setEditAnimalForm({ ...editAnimalForm, sex: e.target.value })} fullWidth>
                <MenuItem value="Female">Female</MenuItem><MenuItem value="Male">Male</MenuItem>
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField select label="Status" value={editAnimalForm.status} onChange={(e) => setEditAnimalForm({ ...editAnimalForm, status: e.target.value })} fullWidth>
                {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField label="Current Weight (kg)" type="number" value={editAnimalForm.currentWeightKg} onChange={(e) => setEditAnimalForm({ ...editAnimalForm, currentWeightKg: e.target.value })} fullWidth />
            </Stack>
            <TextField label="Date of Birth" type="date" InputLabelProps={{ shrink: true }} value={editAnimalForm.dateOfBirth} onChange={(e) => setEditAnimalForm({ ...editAnimalForm, dateOfBirth: e.target.value })} />
            <TextField label="Notes" multiline rows={2} value={editAnimalForm.notes} onChange={(e) => setEditAnimalForm({ ...editAnimalForm, notes: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditAnimalTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success" disabled={updateAnimal.isPending}>Save Changes</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Animal Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteAnimalTarget}
        title={`Delete Animal ${deleteAnimalTarget?.tagId}?`}
        message={`Are you sure you want to delete ${deleteAnimalTarget?.tagId} (${deleteAnimalTarget?.name || deleteAnimalTarget?.species})? This will remove the animal and its associated records.`}
        confirmLabel="Delete"
        busy={deleteAnimal.isPending}
        onConfirm={() => deleteAnimal.mutate()}
        onCancel={() => setDeleteAnimalTarget(null)}
      />

      {/* Create Group Dialog */}
      <Dialog open={groupOpen} onClose={() => setGroupOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!groupForm.name.trim()) { setFormError('Name is required.'); return; }
          setFormError('');
          createGroup.mutate();
        }}>
          <DialogTitle fontWeight={700}>Create Flock / Animal Group</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField label="Flock / Group name" required value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} sx={{ mt: 1 }} />
            <TextField select label="Species" value={groupForm.species} onChange={(e) => setGroupForm({ ...groupForm, species: e.target.value })}>
              {SPECIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField select label="Type" value={groupForm.groupType} onChange={(e) => setGroupForm({ ...groupForm, groupType: e.target.value })}>
              {GROUP_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField label="Headcount / Bird count" type="number" required value={groupForm.count} onChange={(e) => setGroupForm({ ...groupForm, count: e.target.value })} />
            <TextField label="Description / Housing" multiline rows={2} value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setGroupOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success" disabled={createGroup.isPending}>Save Group</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={!!editGroupTarget} onClose={() => setEditGroupTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={submitEditGroup}>
          <DialogTitle fontWeight={700}>Edit Flock / Group</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField label="Flock / Group name" required value={editGroupForm.name} onChange={(e) => setEditGroupForm({ ...editGroupForm, name: e.target.value })} sx={{ mt: 1 }} />
            <TextField select label="Species" value={editGroupForm.species} onChange={(e) => setEditGroupForm({ ...editGroupForm, species: e.target.value })}>
              {SPECIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField select label="Type" value={editGroupForm.groupType} onChange={(e) => setEditGroupForm({ ...editGroupForm, groupType: e.target.value })}>
              {GROUP_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField label="Headcount / Bird count" type="number" required value={editGroupForm.count} onChange={(e) => setEditGroupForm({ ...editGroupForm, count: e.target.value })} />
            <TextField label="Description / Housing" multiline rows={2} value={editGroupForm.description} onChange={(e) => setEditGroupForm({ ...editGroupForm, description: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditGroupTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success" disabled={updateGroup.isPending}>Save Changes</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Group Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteGroupTarget}
        title={`Delete Group ${deleteGroupTarget?.name}?`}
        message={`Are you sure you want to delete "${deleteGroupTarget?.name}"? Animals associated with this group will be unlinked.`}
        confirmLabel="Delete"
        busy={deleteGroup.isPending}
        onConfirm={() => deleteGroup.mutate()}
        onCancel={() => setDeleteGroupTarget(null)}
      />

      {/* Record Event Dialog */}
      <Dialog open={!!eventTarget} onClose={() => setEventTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={submitEvent} noValidate>
          <DialogTitle fontWeight={700}>Record Event — {eventTarget?.tagId}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField select label="Event" value={eventForm.eventType} onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })} sx={{ mt: 1 }}>
              {EVENTS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField label="Event Date" type="date" InputLabelProps={{ shrink: true }} value={eventForm.eventDate} onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })} />
            <TextField label="Description / Reason" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
            {(eventForm.eventType === 'Sale' || eventForm.eventType === 'WeightCheck') && (
              <TextField label={eventForm.eventType === 'Sale' ? 'Sale Amount' : 'Weight (kg)'} type="number" value={eventForm.amount} onChange={(e) => setEventForm({ ...eventForm, amount: e.target.value })} />
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEventTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success" disabled={addEvent.isPending}>Save Event</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog open={confirmOpen} busy={addEvent.isPending} title={`Confirm ${eventForm.eventType.toLowerCase()}`}
        message={`This will change ${eventTarget?.tagId}'s status to ${eventForm.eventType === 'Death' ? 'Deceased' : eventForm.eventType === 'Sale' ? 'Sold' : 'Transferred'}. Continue?`}
        confirmLabel="Confirm" onConfirm={() => addEvent.mutate()} onCancel={() => setConfirmOpen(false)} />
    </Stack>
  );
}
