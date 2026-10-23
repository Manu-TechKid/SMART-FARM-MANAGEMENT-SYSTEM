import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
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
  followUpDate?: string; status: string;
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
        Symptoms: healthForm.symptoms || null,
        Diagnosis: healthForm.diagnosis || null,
        Treatment: healthForm.treatment || null,
        VeterinarianName: healthForm.veterinarianName || null,
        VeterinaryCost: Number(healthForm.veterinaryCost || 0),
        WithdrawalPeriodEnd: healthForm.withdrawalPeriodEnd || null,
        FollowUpDate: healthForm.followUpDate || null,
        Notes: healthForm.notes || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-records'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
      setHealthOpen(false);
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  if (!farmId) return <Alert severity="info">Select or create a farm in Farm Settings first.</Alert>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Vaccination & Veterinary Management</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => { setErr(''); setSchedOpen(true); }}>New Schedule</Button>
          <Button variant="contained" onClick={() => { setErr(''); setVaxOpen(true); }}>Record Vaccination</Button>
          <Button variant="contained" color="secondary" onClick={() => { setErr(''); setHealthOpen(true); }}>Log Vet / Clinical Visit</Button>
        </Stack>
      </Stack>

      <Alert severity="warning">
        <strong>Veterinary Guidance Notice:</strong> This system records veterinarian-approved schedules and treatments only. Always administer vaccines and medications strictly according to a licensed veterinarian&apos;s prescription and observe withdrawal periods.
      </Alert>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={`Vaccination Records (${vaxRecords?.totalCount ?? 0})`} />
        <Tab label={`Approved Schedules (${schedules?.length ?? 0})`} />
        <Tab label={`Clinical & Health Records (${healthRecords?.totalCount ?? 0})`} />
      </Tabs>

      {tab === 0 && (
        <Stack spacing={2}>
          <TextField select size="small" label="Filter status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 200 }}>
            <MenuItem value="">All</MenuItem>
            {VAX_STATUS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <Paper>
            <TableContainer>
              <Table size="small" aria-label="Vaccination records">
                <TableHead>
                  <TableRow>
                    <TableCell>Vaccine</TableCell><TableCell>Species</TableCell><TableCell>Target</TableCell>
                    <TableCell>Scheduled</TableCell><TableCell>Administered</TableCell><TableCell>Administrator</TableCell>
                    <TableCell>Status</TableCell><TableCell align="right">Update Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vaxRecords?.items.length === 0 && <TableRow><TableCell colSpan={8}>No vaccination records found.</TableCell></TableRow>}
                  {vaxRecords?.items.map((v) => (
                    <TableRow key={v.id} hover>
                      <TableCell>{v.vaccineName}</TableCell>
                      <TableCell>{v.species}</TableCell>
                      <TableCell>{v.animalTag ?? v.groupName ?? 'All'}</TableCell>
                      <TableCell>{v.scheduledDate ? new Date(v.scheduledDate).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>{v.dateAdministered ? new Date(v.dateAdministered).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>{v.administrator ?? '—'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={v.status} color={v.status === 'Completed' ? 'success' : v.status === 'Scheduled' ? 'info' : 'error'} />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          select size="small" variant="standard" value={v.status}
                          onChange={(e) => updateVaxStatus.mutate({ id: v.id, status: e.target.value })}
                        >
                          {VAX_STATUS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </TextField>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      )}

      {tab === 1 && (
        <Paper>
          <TableContainer>
            <Table size="small" aria-label="Vaccination schedules">
              <TableHead>
                <TableRow>
                  <TableCell>Vaccine Name</TableCell><TableCell>Species</TableCell><TableCell>Target Age Group</TableCell>
                  <TableCell align="right">Interval (Days)</TableCell><TableCell>Vet Notes / Protocol</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(!schedules || schedules.length === 0) && <TableRow><TableCell colSpan={5}>No vaccination schedules configured.</TableCell></TableRow>}
                {schedules?.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>{s.vaccineName}</TableCell>
                    <TableCell>{s.species}</TableCell>
                    <TableCell>{s.targetAgeGroup ?? 'All ages'}</TableCell>
                    <TableCell align="right">{s.intervalDays}</TableCell>
                    <TableCell>{s.description ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {tab === 2 && (
        <Paper>
          <TableContainer>
            <Table size="small" aria-label="Health records">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell><TableCell>Type</TableCell><TableCell>Diagnosis / Symptoms</TableCell>
                  <TableCell>Treatment</TableCell><TableCell>Veterinarian</TableCell><TableCell align="right">Cost</TableCell>
                  <TableCell>Withdrawal Until</TableCell><TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {healthRecords?.items.length === 0 && <TableRow><TableCell colSpan={8}>No clinical records found.</TableCell></TableRow>}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* New Schedule Dialog */}
      <Dialog open={schedOpen} onClose={() => setSchedOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!schedForm.vaccineName.trim()) { setErr('Vaccine name is required.'); return; }
          createSched.mutate();
        }} noValidate>
          <DialogTitle>New Approved Vaccination Schedule</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <TextField label="Vaccine name" required value={schedForm.vaccineName} onChange={(e) => setSchedForm({ ...schedForm, vaccineName: e.target.value })} sx={{ mt: 1 }} />
            <TextField select label="Species" value={schedForm.species} onChange={(e) => setSchedForm({ ...schedForm, species: e.target.value })}>
              {SPECIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField label="Target age group" value={schedForm.targetAgeGroup} onChange={(e) => setSchedForm({ ...schedForm, targetAgeGroup: e.target.value })} />
            <TextField label="Interval (days)" type="number" value={schedForm.intervalDays} onChange={(e) => setSchedForm({ ...schedForm, intervalDays: e.target.value })} />
            <TextField label="Veterinary protocol notes" multiline minRows={2} value={schedForm.description} onChange={(e) => setSchedForm({ ...schedForm, description: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setSchedOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
        </Box>
      </Dialog>

      {/* Record Vaccination Dialog */}
      <Dialog open={vaxOpen} onClose={() => setVaxOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!vaxForm.vaccineName.trim()) { setErr('Vaccine name is required.'); return; }
          createVax.mutate();
        }} noValidate>
          <DialogTitle>Schedule or Record Vaccination</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <TextField label="Vaccine name" required fullWidth value={vaxForm.vaccineName} onChange={(e) => setVaxForm({ ...vaxForm, vaccineName: e.target.value })} />
              <TextField select label="Species" fullWidth value={vaxForm.species} onChange={(e) => setVaxForm({ ...vaxForm, species: e.target.value })}>
                {SPECIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField select label="Target type" fullWidth value={vaxForm.targetKind} onChange={(e) => setVaxForm({ ...vaxForm, targetKind: e.target.value as 'animal' | 'group', targetId: '' })}>
                <MenuItem value="animal">Individual Animal</MenuItem>
                <MenuItem value="group">Flock / Animal Group</MenuItem>
              </TextField>
              <TextField select label="Target" fullWidth value={vaxForm.targetId} onChange={(e) => setVaxForm({ ...vaxForm, targetId: e.target.value })}>
                {vaxForm.targetKind === 'animal' && (animals ?? []).map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.tagId} ({a.species})</MenuItem>)}
                {vaxForm.targetKind === 'group' && (groups ?? []).map((g) => <MenuItem key={g.id} value={String(g.id)}>{g.name} ({g.species})</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Scheduled date" type="date" fullWidth value={vaxForm.scheduledDate} onChange={(e) => setVaxForm({ ...vaxForm, scheduledDate: e.target.value })} InputLabelProps={{ shrink: true }} />
              <TextField label="Date administered (leave blank if scheduled)" type="date" fullWidth value={vaxForm.dateAdministered} onChange={(e) => setVaxForm({ ...vaxForm, dateAdministered: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Vaccine batch number" fullWidth value={vaxForm.batchNumber} onChange={(e) => setVaxForm({ ...vaxForm, batchNumber: e.target.value })} />
              <TextField label="Authorized vet / administrator" fullWidth value={vaxForm.administrator} onChange={(e) => setVaxForm({ ...vaxForm, administrator: e.target.value })} />
            </Stack>
            <TextField label="Prescribed dose (as directed by authorized vet)" value={vaxForm.dosageNotes} onChange={(e) => setVaxForm({ ...vaxForm, dosageNotes: e.target.value })} />
            <TextField label="Follow-up date" type="date" value={vaxForm.followUpDate} onChange={(e) => setVaxForm({ ...vaxForm, followUpDate: e.target.value })} InputLabelProps={{ shrink: true }} />
          </DialogContent>
          <DialogActions><Button onClick={() => setVaxOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
        </Box>
      </Dialog>

      {/* Health Record Dialog */}
      <Dialog open={healthOpen} onClose={() => setHealthOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          createHealth.mutate();
        }} noValidate>
          <DialogTitle>Log Veterinary Examination / Treatment</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <TextField select label="Animal" fullWidth value={healthForm.animalId} onChange={(e) => setHealthForm({ ...healthForm, animalId: e.target.value })}>
                <MenuItem value="">Herd / General</MenuItem>
                {(animals ?? []).map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.tagId} ({a.species})</MenuItem>)}
              </TextField>
              <TextField select label="Record type" fullWidth value={healthForm.recordType} onChange={(e) => setHealthForm({ ...healthForm, recordType: e.target.value })}>
                {HEALTH_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Date" type="date" fullWidth value={healthForm.recordDate} onChange={(e) => setHealthForm({ ...healthForm, recordDate: e.target.value })} InputLabelProps={{ shrink: true }} />
              <TextField label="Veterinarian name" fullWidth value={healthForm.veterinarianName} onChange={(e) => setHealthForm({ ...healthForm, veterinarianName: e.target.value })} />
            </Stack>
            <TextField label="Observed symptoms" value={healthForm.symptoms} onChange={(e) => setHealthForm({ ...healthForm, symptoms: e.target.value })} />
            <TextField label="Diagnosis" value={healthForm.diagnosis} onChange={(e) => setHealthForm({ ...healthForm, diagnosis: e.target.value })} />
            <TextField label="Prescribed treatment" value={healthForm.treatment} onChange={(e) => setHealthForm({ ...healthForm, treatment: e.target.value })} />
            <Stack direction="row" spacing={2}>
              <TextField label="Veterinary cost" type="number" fullWidth value={healthForm.veterinaryCost} onChange={(e) => setHealthForm({ ...healthForm, veterinaryCost: e.target.value })} />
              <TextField label="Withdrawal period ends" type="date" fullWidth value={healthForm.withdrawalPeriodEnd} onChange={(e) => setHealthForm({ ...healthForm, withdrawalPeriodEnd: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setHealthOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
