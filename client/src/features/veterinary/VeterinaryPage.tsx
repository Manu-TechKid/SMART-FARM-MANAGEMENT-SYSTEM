import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { EditOutlined, DeleteOutline } from '@mui/icons-material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { Animal, PagedResult } from '../../types';

const SPECIES = ['Goat', 'Sheep', 'Cow', 'Chicken'];
const VAX_STATUS = ['Scheduled', 'Completed', 'Overdue', 'Missed', 'Cancelled'];
const HEALTH_TYPES = ['Examination', 'Treatment', 'Surgery', 'Illness', 'Injury', 'Quarantine'];
const today = () => new Date().toISOString().slice(0, 10);

interface ScheduleRow { id: number; vaccineName: string; species: string; targetAgeGroup?: string; intervalDays: number; description?: string; }
interface VaxRecord {
  id: number; vaccineName: string; species: string; animalId?: number; animalTag?: string; groupId?: number; groupName?: string;
  scheduledDate?: string; dateAdministered?: string; status: string; administrator?: string; followUpDate?: string; notes?: string;
}
interface HealthRow {
  id: number; animalId?: number; groupId?: number; recordDate: string; recordType: string; symptoms?: string;
  diagnosis?: string; treatment?: string; veterinarianName?: string; veterinaryCost: number; withdrawalPeriodEnd?: string;
  followUpDate?: string; status: string; notes?: string;
}
interface GroupItem { id: number; name: string; species: string; }

export default function VeterinaryPage() {
  const { farmId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [schedOpen, setSchedOpen] = useState(false);
  const [vaxOpen, setVaxOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [err, setErr] = useState('');

  // Delete & Edit states
  const [deleteVaxTarget, setDeleteVaxTarget] = useState<VaxRecord | null>(null);
  const [deleteSchedTarget, setDeleteSchedTarget] = useState<ScheduleRow | null>(null);
  const [editHealthTarget, setEditHealthTarget] = useState<HealthRow | null>(null);
  const [editHealthForm, setEditHealthForm] = useState({
    recordDate: today(), recordType: 'Examination', symptoms: '', diagnosis: '',
    treatment: '', veterinarianName: '', veterinaryCost: '0', withdrawalPeriodEnd: '', followUpDate: '', notes: '',
  });
  const [deleteHealthTarget, setDeleteHealthTarget] = useState<HealthRow | null>(null);

  const [schedForm, setSchedForm] = useState({ vaccineName: '', species: 'Cow', targetAgeGroup: 'Adult', intervalDays: '180', description: '' });
  const [vaxForm, setVaxForm] = useState({
    vaccineName: '', species: 'Cow', targetKind: 'animal' as 'animal' | 'group', targetId: '',
    scheduledDate: today(), dateAdministered: '', batchNumber: '', administrator: '', followUpDate: '', dosageNotes: '', notes: '',
  });
  const [healthForm, setHealthForm] = useState({
    animalId: '', recordDate: today(), recordType: 'Examination', symptoms: '', diagnosis: '', treatment: '',
    veterinarianName: '', veterinaryCost: '0', withdrawalPeriodEnd: '', followUpDate: '', notes: '',
  });

  const { data: schedules } = useQuery({
    queryKey: ['vax-schedules', farmId],
    enabled: !!farmId,
    queryFn: async () => (await api.get<ScheduleRow[]>(`/farms/${farmId}/vaccination/schedules`)).data,
  });

  const { data: vaxRecords } = useQuery({
    queryKey: ['vax-records', farmId, statusFilter],
    enabled: !!farmId,
    queryFn: async () =>
      (await api.get<PagedResult<VaxRecord>>(`/farms/${farmId}/vaccination/records`, {
        params: { status: statusFilter || undefined, pageSize: 50 },
      })).data,
  });

  const { data: healthRecords } = useQuery({
    queryKey: ['health-records', farmId],
    enabled: !!farmId,
    queryFn: async () => (await api.get<PagedResult<HealthRow>>(`/farms/${farmId}/health-records`, { params: { pageSize: 50 } })).data,
  });

  const { data: animals } = useQuery({
    queryKey: ['animals-all', farmId],
    enabled: !!farmId && (vaxOpen || healthOpen),
    queryFn: async () => (await api.get<PagedResult<Animal>>(`/farms/${farmId}/animals`, { params: { pageSize: 100 } })).data.items,
  });

  const { data: groups } = useQuery({
    queryKey: ['groups-all', farmId],
    enabled: !!farmId && vaxOpen,
    queryFn: async () => (await api.get<GroupItem[]>(`/farms/${farmId}/groups`)).data,
  });

  const createSched = useMutation({
    mutationFn: () =>
      api.post(`/farms/${farmId}/vaccination/schedules`, {
        vaccineName: schedForm.vaccineName.trim(),
        species: schedForm.species,
        targetAgeGroup: schedForm.targetAgeGroup || null,
        intervalDays: Number(schedForm.intervalDays),
        description: schedForm.description || null,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vax-schedules'] }); setSchedOpen(false); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const deleteSched = useMutation({
    mutationFn: () => api.delete(`/farms/${farmId}/vaccination/schedules/${deleteSchedTarget!.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vax-schedules'] }); setDeleteSchedTarget(null); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const createVax = useMutation({
    mutationFn: () =>
      api.post(`/farms/${farmId}/vaccination/records`, {
        vaccineName: vaxForm.vaccineName.trim(),
        species: vaxForm.species,
        animalId: vaxForm.targetKind === 'animal' && vaxForm.targetId ? Number(vaxForm.targetId) : null,
        groupId: vaxForm.targetKind === 'group' && vaxForm.targetId ? Number(vaxForm.targetId) : null,
        scheduledDate: vaxForm.scheduledDate || null,
        dateAdministered: vaxForm.dateAdministered || null,
        batchNumber: vaxForm.batchNumber || null,
        administrator: vaxForm.administrator || null,
        followUpDate: vaxForm.followUpDate || null,
        dosageNotes: vaxForm.dosageNotes || null,
        notes: vaxForm.notes || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vax-records'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setVaxOpen(false);
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  const deleteVax = useMutation({
    mutationFn: () => api.delete(`/farms/${farmId}/vaccination/records/${deleteVaxTarget!.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vax-records'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteVaxTarget(null);
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  const updateVaxStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/farms/${farmId}/vaccination/records/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vax-records'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const createHealth = useMutation({
    mutationFn: () =>
      api.post(`/farms/${farmId}/health-records`, {
        animalId: healthForm.animalId ? Number(healthForm.animalId) : null,
        recordDate: healthForm.recordDate,
        recordType: healthForm.recordType,
        symptoms: healthForm.symptoms || null,
        diagnosis: healthForm.diagnosis || null,
        treatment: healthForm.treatment || null,
        veterinarianName: healthForm.veterinarianName || null,
        veterinaryCost: Number(healthForm.veterinaryCost || 0),
        withdrawalPeriodEnd: healthForm.withdrawalPeriodEnd || null,
        followUpDate: healthForm.followUpDate || null,
        notes: healthForm.notes || null,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['health-records'] }); setHealthOpen(false); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const updateHealth = useMutation({
    mutationFn: () =>
      api.put(`/farms/${farmId}/health-records/${editHealthTarget!.id}`, {
        recordDate: editHealthForm.recordDate,
        recordType: editHealthForm.recordType,
        symptoms: editHealthForm.symptoms || null,
        diagnosis: editHealthForm.diagnosis || null,
        treatment: editHealthForm.treatment || null,
        veterinarianName: editHealthForm.veterinarianName || null,
        veterinaryCost: Number(editHealthForm.veterinaryCost || 0),
        withdrawalPeriodEnd: editHealthForm.withdrawalPeriodEnd || null,
        followUpDate: editHealthForm.followUpDate || null,
        notes: editHealthForm.notes || null,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['health-records'] }); setEditHealthTarget(null); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const deleteHealth = useMutation({
    mutationFn: () => api.delete(`/farms/${farmId}/health-records/${deleteHealthTarget!.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['health-records'] }); setDeleteHealthTarget(null); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const submitSched = (e: FormEvent) => {
    e.preventDefault();
    if (!schedForm.vaccineName.trim()) { setErr('Vaccine name is required.'); return; }
    setErr('');
    createSched.mutate();
  };

  const submitVax = (e: FormEvent) => {
    e.preventDefault();
    if (!vaxForm.vaccineName.trim()) { setErr('Vaccine name is required.'); return; }
    setErr('');
    createVax.mutate();
  };

  const submitHealth = (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    createHealth.mutate();
  };

  const submitEditHealth = (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    updateHealth.mutate();
  };

  const openEditHealth = (h: HealthRow) => {
    setEditHealthTarget(h);
    setEditHealthForm({
      recordDate: h.recordDate ? h.recordDate.slice(0, 10) : today(),
      recordType: h.recordType ?? 'Examination',
      symptoms: h.symptoms ?? '',
      diagnosis: h.diagnosis ?? '',
      treatment: h.treatment ?? '',
      veterinarianName: h.veterinarianName ?? '',
      veterinaryCost: String(h.veterinaryCost ?? 0),
      withdrawalPeriodEnd: h.withdrawalPeriodEnd ? h.withdrawalPeriodEnd.slice(0, 10) : '',
      followUpDate: h.followUpDate ? h.followUpDate.slice(0, 10) : '',
      notes: h.notes ?? '',
    });
    setErr('');
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Veterinary, Vaccinations & Herd Health</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage scheduled herd immunizations, drug withdrawal windows, clinical treatments, and biosecurity protocols.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          {tab === 0 && (
            <Button variant="contained" color="success" onClick={() => { setErr(''); setVaxOpen(true); }} sx={{ fontWeight: 700 }}>
              + Schedule Vaccination
            </Button>
          )}
          {tab === 1 && (
            <Button variant="contained" color="success" onClick={() => { setErr(''); setSchedOpen(true); }} sx={{ fontWeight: 700 }}>
              + Add Schedule Protocol
            </Button>
          )}
          {tab === 2 && (
            <Button variant="contained" color="success" onClick={() => { setErr(''); setHealthOpen(true); }} sx={{ fontWeight: 700 }}>
              + Record Clinical Event
            </Button>
          )}
        </Stack>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={`Vaccination Logs (${vaxRecords?.totalCount ?? 0})`} />
        <Tab label={`Vaccine Schedules (${schedules?.length ?? 0})`} />
        <Tab label={`Clinical & Health Records (${healthRecords?.totalCount ?? 0})`} />
      </Tabs>

      {err && <Alert severity="error" onClose={() => setErr('')}>{err}</Alert>}

      {/* Tab 0: Vaccination Records */}
      {tab === 0 && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField size="small" select label="Filter Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="">All Statuses</MenuItem>
              {VAX_STATUS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Stack>

          <Paper>
            <TableContainer>
              <Table size="small" aria-label="Vaccination records">
                <TableHead>
                  <TableRow>
                    <TableCell>Vaccine</TableCell><TableCell>Species</TableCell><TableCell>Target</TableCell>
                    <TableCell>Scheduled</TableCell><TableCell>Administered</TableCell><TableCell>Administrator</TableCell>
                    <TableCell>Status</TableCell><TableCell align="right">Update Status / Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vaxRecords?.items.length === 0 && <TableRow><TableCell colSpan={8}>No vaccination records found.</TableCell></TableRow>}
                  {vaxRecords?.items.map((v) => (
                    <TableRow key={v.id} hover>
                      <TableCell><strong>{v.vaccineName}</strong></TableCell>
                      <TableCell>{v.species}</TableCell>
                      <TableCell>{v.animalTag ?? v.groupName ?? 'All'}</TableCell>
                      <TableCell>{v.scheduledDate ? new Date(v.scheduledDate).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>{v.dateAdministered ? new Date(v.dateAdministered).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>{v.administrator ?? '—'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={v.status} color={v.status === 'Completed' ? 'success' : v.status === 'Scheduled' ? 'info' : 'error'} />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                          <TextField
                            select size="small" variant="standard" value={v.status}
                            onChange={(e) => updateVaxStatus.mutate({ id: v.id, status: e.target.value })}
                            sx={{ minWidth: 110 }}
                          >
                            {VAX_STATUS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                          </TextField>
                          <Tooltip title="Delete Record">
                            <IconButton size="small" color="error" onClick={() => setDeleteVaxTarget(v)}>
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
        </Stack>
      )}

      {/* Tab 1: Vaccine Schedules */}
      {tab === 1 && (
        <Paper>
          <TableContainer>
            <Table size="small" aria-label="Vaccine schedules">
              <TableHead>
                <TableRow>
                  <TableCell>Vaccine Name</TableCell><TableCell>Species</TableCell><TableCell>Target Age Group</TableCell>
                  <TableCell align="right">Interval (Days)</TableCell><TableCell>Vet Notes / Protocol</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(!schedules || schedules.length === 0) && <TableRow><TableCell colSpan={6}>No vaccination schedules configured.</TableCell></TableRow>}
                {schedules?.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell><strong>{s.vaccineName}</strong></TableCell>
                    <TableCell>{s.species}</TableCell>
                    <TableCell>{s.targetAgeGroup ?? 'All ages'}</TableCell>
                    <TableCell align="right">{s.intervalDays}</TableCell>
                    <TableCell>{s.description ?? '—'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Delete Schedule">
                        <IconButton size="small" color="error" onClick={() => setDeleteSchedTarget(s)}>
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Tab 2: Health Records */}
      {tab === 2 && (
        <Paper>
          <TableContainer>
            <Table size="small" aria-label="Clinical records">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell><TableCell>Type</TableCell><TableCell>Diagnosis / Symptoms</TableCell>
                  <TableCell>Treatment</TableCell><TableCell>Veterinarian</TableCell><TableCell align="right">Cost</TableCell>
                  <TableCell>Withdrawal Until</TableCell><TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {healthRecords?.items.length === 0 && <TableRow><TableCell colSpan={9}>No clinical records found.</TableCell></TableRow>}
                {healthRecords?.items.map((h) => (
                  <TableRow key={h.id} hover>
                    <TableCell>{new Date(h.recordDate).toLocaleDateString()}</TableCell>
                    <TableCell>{h.recordType}</TableCell>
                    <TableCell>{h.diagnosis ?? h.symptoms ?? '—'}</TableCell>
                    <TableCell>{h.treatment ?? '—'}</TableCell>
                    <TableCell>{h.veterinarianName ?? '—'}</TableCell>
                    <TableCell align="right">{h.veterinaryCost.toLocaleString()}</TableCell>
                    <TableCell>{h.withdrawalPeriodEnd ? new Date(h.withdrawalPeriodEnd).toLocaleDateString() : 'None'}</TableCell>
                    <TableCell><Chip size="small" label={h.status} color={h.status === 'Resolved' ? 'success' : 'warning'} /></TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                        <Tooltip title="Edit Record">
                          <IconButton size="small" color="primary" onClick={() => openEditHealth(h)}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Record">
                          <IconButton size="small" color="error" onClick={() => setDeleteHealthTarget(h)}>
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

      {/* Schedule Protocol Dialog */}
      <Dialog open={schedOpen} onClose={() => setSchedOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={submitSched} noValidate>
          <DialogTitle fontWeight={700}>Add Vaccination Protocol</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField label="Vaccine Name" required value={schedForm.vaccineName} onChange={(e) => setSchedForm({ ...schedForm, vaccineName: e.target.value })} sx={{ mt: 1 }} />
            <TextField select label="Species" value={schedForm.species} onChange={(e) => setSchedForm({ ...schedForm, species: e.target.value })}>
              {SPECIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField label="Target Age Group" value={schedForm.targetAgeGroup} onChange={(e) => setSchedForm({ ...schedForm, targetAgeGroup: e.target.value })} />
            <TextField label="Repeat Interval (Days)" type="number" required value={schedForm.intervalDays} onChange={(e) => setSchedForm({ ...schedForm, intervalDays: e.target.value })} />
            <TextField label="Description / Protocol Notes" multiline rows={2} value={schedForm.description} onChange={(e) => setSchedForm({ ...schedForm, description: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSchedOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Save Protocol</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Schedule Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteSchedTarget}
        title={`Delete Schedule ${deleteSchedTarget?.vaccineName}?`}
        message={`Are you sure you want to delete the vaccination schedule for "${deleteSchedTarget?.vaccineName}"?`}
        confirmLabel="Delete"
        busy={deleteSched.isPending}
        onConfirm={() => deleteSched.mutate()}
        onCancel={() => setDeleteSchedTarget(null)}
      />

      {/* Record Vaccination Dialog */}
      <Dialog open={vaxOpen} onClose={() => setVaxOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submitVax} noValidate>
          <DialogTitle fontWeight={700}>Schedule / Record Vaccination</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField label="Vaccine Name" required value={vaxForm.vaccineName} onChange={(e) => setVaxForm({ ...vaxForm, vaccineName: e.target.value })} sx={{ mt: 1 }} />
            <Stack direction="row" spacing={2}>
              <TextField select label="Species" fullWidth value={vaxForm.species} onChange={(e) => setVaxForm({ ...vaxForm, species: e.target.value })}>
                {SPECIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField select label="Target Type" fullWidth value={vaxForm.targetKind} onChange={(e) => setVaxForm({ ...vaxForm, targetKind: e.target.value as any, targetId: '' })}>
                <MenuItem value="animal">Individual Animal</MenuItem>
                <MenuItem value="group">Flock / Batch</MenuItem>
              </TextField>
            </Stack>

            {vaxForm.targetKind === 'animal' && (
              <TextField select label="Select Animal" value={vaxForm.targetId} onChange={(e) => setVaxForm({ ...vaxForm, targetId: e.target.value })}>
                {animals?.map((a) => <MenuItem key={a.id} value={a.id}>{a.tagId} ({a.species})</MenuItem>)}
              </TextField>
            )}
            {vaxForm.targetKind === 'group' && (
              <TextField select label="Select Flock / Group" value={vaxForm.targetId} onChange={(e) => setVaxForm({ ...vaxForm, targetId: e.target.value })}>
                {groups?.map((g) => <MenuItem key={g.id} value={g.id}>{g.name} ({g.species})</MenuItem>)}
              </TextField>
            )}

            <Stack direction="row" spacing={2}>
              <TextField label="Scheduled Date" type="date" InputLabelProps={{ shrink: true }} value={vaxForm.scheduledDate} onChange={(e) => setVaxForm({ ...vaxForm, scheduledDate: e.target.value })} fullWidth />
              <TextField label="Administered Date (if done)" type="date" InputLabelProps={{ shrink: true }} value={vaxForm.dateAdministered} onChange={(e) => setVaxForm({ ...vaxForm, dateAdministered: e.target.value })} fullWidth />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField label="Administrator Name / Vet" value={vaxForm.administrator} onChange={(e) => setVaxForm({ ...vaxForm, administrator: e.target.value })} fullWidth />
              <TextField label="Batch / Vial Number" value={vaxForm.batchNumber} onChange={(e) => setVaxForm({ ...vaxForm, batchNumber: e.target.value })} fullWidth />
            </Stack>

            <TextField label="Dosage & Notes" multiline rows={2} value={vaxForm.notes} onChange={(e) => setVaxForm({ ...vaxForm, notes: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setVaxOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Save Vaccination</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Vaccination Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteVaxTarget}
        title={`Delete Vaccination Record?`}
        message={`Are you sure you want to delete the vaccination record for "${deleteVaxTarget?.vaccineName}"?`}
        confirmLabel="Delete"
        busy={deleteVax.isPending}
        onConfirm={() => deleteVax.mutate()}
        onCancel={() => setDeleteVaxTarget(null)}
      />

      {/* Record Clinical Event Dialog */}
      <Dialog open={healthOpen} onClose={() => setHealthOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submitHealth} noValidate>
          <DialogTitle fontWeight={700}>Record Clinical Treatment / Health Event</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <TextField select label="Animal" required fullWidth value={healthForm.animalId} onChange={(e) => setHealthForm({ ...healthForm, animalId: e.target.value })}>
                {animals?.map((a) => <MenuItem key={a.id} value={a.id}>{a.tagId} ({a.species}{a.name ? ` - ${a.name}` : ''})</MenuItem>)}
              </TextField>
              <TextField select label="Event Type" fullWidth value={healthForm.recordType} onChange={(e) => setHealthForm({ ...healthForm, recordType: e.target.value })}>
                {HEALTH_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={healthForm.recordDate} onChange={(e) => setHealthForm({ ...healthForm, recordDate: e.target.value })} fullWidth />
              <TextField label="Veterinarian Name" value={healthForm.veterinarianName} onChange={(e) => setHealthForm({ ...healthForm, veterinarianName: e.target.value })} fullWidth />
            </Stack>

            <TextField label="Diagnosis / Clinical Signs" value={healthForm.diagnosis} onChange={(e) => setHealthForm({ ...healthForm, diagnosis: e.target.value })} />
            <TextField label="Treatment / Medication Administered" value={healthForm.treatment} onChange={(e) => setHealthForm({ ...healthForm, treatment: e.target.value })} />

            <Stack direction="row" spacing={2}>
              <TextField label="Cost (KES)" type="number" value={healthForm.veterinaryCost} onChange={(e) => setHealthForm({ ...healthForm, veterinaryCost: e.target.value })} fullWidth />
              <TextField label="Withdrawal Period Ends (Milk/Meat)" type="date" InputLabelProps={{ shrink: true }} value={healthForm.withdrawalPeriodEnd} onChange={(e) => setHealthForm({ ...healthForm, withdrawalPeriodEnd: e.target.value })} fullWidth />
            </Stack>

            <TextField label="Notes" multiline rows={2} value={healthForm.notes} onChange={(e) => setHealthForm({ ...healthForm, notes: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setHealthOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Save Health Record</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Clinical Event Dialog */}
      <Dialog open={!!editHealthTarget} onClose={() => setEditHealthTarget(null)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submitEditHealth} noValidate>
          <DialogTitle fontWeight={700}>Edit Clinical Record</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <TextField select label="Event Type" fullWidth value={editHealthForm.recordType} onChange={(e) => setEditHealthForm({ ...editHealthForm, recordType: e.target.value })}>
                {HEALTH_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={editHealthForm.recordDate} onChange={(e) => setEditHealthForm({ ...editHealthForm, recordDate: e.target.value })} fullWidth />
            </Stack>

            <TextField label="Diagnosis / Symptoms" value={editHealthForm.diagnosis} onChange={(e) => setEditHealthForm({ ...editHealthForm, diagnosis: e.target.value })} />
            <TextField label="Treatment / Medication" value={editHealthForm.treatment} onChange={(e) => setEditHealthForm({ ...editHealthForm, treatment: e.target.value })} />

            <Stack direction="row" spacing={2}>
              <TextField label="Veterinarian Name" value={editHealthForm.veterinarianName} onChange={(e) => setEditHealthForm({ ...editHealthForm, veterinarianName: e.target.value })} fullWidth />
              <TextField label="Cost (KES)" type="number" value={editHealthForm.veterinaryCost} onChange={(e) => setEditHealthForm({ ...editHealthForm, veterinaryCost: e.target.value })} fullWidth />
            </Stack>

            <TextField label="Withdrawal Period Ends" type="date" InputLabelProps={{ shrink: true }} value={editHealthForm.withdrawalPeriodEnd} onChange={(e) => setEditHealthForm({ ...editHealthForm, withdrawalPeriodEnd: e.target.value })} />
            <TextField label="Notes" multiline rows={2} value={editHealthForm.notes} onChange={(e) => setEditHealthForm({ ...editHealthForm, notes: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditHealthTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Save Changes</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Health Record Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteHealthTarget}
        title="Delete Health Record?"
        message="Are you sure you want to delete this clinical treatment record?"
        confirmLabel="Delete"
        busy={deleteHealth.isPending}
        onConfirm={() => deleteHealth.mutate()}
        onCancel={() => setDeleteHealthTarget(null)}
      />
    </Stack>
  );
}
