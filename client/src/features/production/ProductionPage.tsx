import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import { EditOutlined, DeleteOutline } from '@mui/icons-material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { Animal, Beehive, PagedResult } from '../../types';

const PRODUCTS = [
  { type: 'Milk', unit: 'L', defaultTarget: 500 },
  { type: 'Eggs', unit: 'pcs', defaultTarget: 3000 },
  { type: 'Honey', unit: 'kg', defaultTarget: 80 },
  { type: 'Beeswax', unit: 'kg', defaultTarget: 15 },
  { type: 'Wool', unit: 'kg', defaultTarget: 40 },
  { type: 'Meat', unit: 'kg', defaultTarget: 100 },
];

interface ProductionRow {
  id: number;
  productType: string;
  productionDate: string;
  quantity: number;
  rejectedQuantity: number;
  unit: string;
  qualityStatus: string;
  batchCode?: string;
  animalTag?: string;
  groupName?: string;
  hiveCode?: string;
  notes?: string;
}

interface BatchRow {
  id: number;
  productType: string;
  batchCode: string;
  batchDate: string;
  totalQuantity: number;
  availableQuantity: number;
  unit: string;
  status: string;
}

interface SummaryRow {
  productType: string;
  totalQuantity: number;
  totalRejected: number;
  recordCount: number;
}

interface GroupItem { id: number; name: string; species: string; count: number; }

const today = () => new Date().toISOString().slice(0, 10);

export default function ProductionPage() {
  const { farmId } = useAuth();
  const qc = useQueryClient();
  const [productFilter, setProductFilter] = useState('');
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(today());
  const [targets] = useState<Record<string, number>>(() =>
    Object.fromEntries(PRODUCTS.map((p) => [p.type, p.defaultTarget])),
  );
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    productType: 'Milk',
    productionDate: today(),
    sourceKind: 'animal' as 'animal' | 'group' | 'hive',
    sourceId: '',
    quantity: '',
    unit: 'L',
    rejectedQuantity: '0',
    qualityStatus: 'Accepted',
    batchCode: `BATCH-${today().replace(/-/g, '')}`,
    notes: '',
  });

  // Edit / Delete states
  const [editTarget, setEditTarget] = useState<ProductionRow | null>(null);
  const [editForm, setEditForm] = useState({ quantity: '', rejectedQuantity: '0', qualityStatus: 'Accepted', productionDate: today(), notes: '' });
  const [deleteTarget, setDeleteTarget] = useState<ProductionRow | null>(null);

  const { data: recordsData, isLoading } = useQuery({
    queryKey: ['production', farmId, productFilter, from, to],
    enabled: !!farmId,
    queryFn: async () =>
      (await api.get<{ items: ProductionRow[]; totalCount: number }>(`/farms/${farmId}/production`, {
        params: { productType: productFilter || undefined, from, to, pageSize: 50 },
      })).data,
  });

  const { data: summary } = useQuery({
    queryKey: ['production-summary', farmId, from, to],
    enabled: !!farmId,
    queryFn: async () =>
      (await api.get<SummaryRow[]>(`/farms/${farmId}/production/summary`, { params: { from, to } })).data,
  });

  const { data: batches } = useQuery({
    queryKey: ['production-batches', farmId, productFilter],
    enabled: !!farmId,
    queryFn: async () =>
      (await api.get<BatchRow[]>(`/farms/${farmId}/production/batches`, {
        params: { productType: productFilter || undefined },
      })).data,
  });

  const { data: animals } = useQuery({
    queryKey: ['animals-all', farmId],
    enabled: !!farmId && open,
    queryFn: async () => (await api.get<PagedResult<Animal>>(`/farms/${farmId}/animals`, { params: { pageSize: 100 } })).data.items,
  });

  const { data: groups } = useQuery({
    queryKey: ['groups-all', farmId],
    enabled: !!farmId && open,
    queryFn: async () => (await api.get<GroupItem[]>(`/farms/${farmId}/groups`)).data,
  });

  const { data: hives } = useQuery({
    queryKey: ['hives-all', farmId],
    enabled: !!farmId && open,
    queryFn: async () => (await api.get<PagedResult<Beehive>>(`/farms/${farmId}/beehives`, { params: { pageSize: 100 } })).data.items,
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['production'] });
    qc.invalidateQueries({ queryKey: ['production-summary'] });
    qc.invalidateQueries({ queryKey: ['production-batches'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const create = useMutation({
    mutationFn: () =>
      api.post(`/farms/${farmId}/production`, {
        productType: form.productType,
        productionDate: form.productionDate,
        animalId: form.sourceKind === 'animal' ? Number(form.sourceId) : null,
        groupId: form.sourceKind === 'group' ? Number(form.sourceId) : null,
        beehiveId: form.sourceKind === 'hive' ? Number(form.sourceId) : null,
        quantity: Number(form.quantity),
        unit: form.unit,
        rejectedQuantity: Number(form.rejectedQuantity || 0),
        qualityStatus: form.qualityStatus,
        batchCode: form.batchCode.trim() || null,
        notes: form.notes || null,
      }),
    onSuccess: () => {
      refreshAll();
      setOpen(false);
      setForm({ ...form, quantity: '', rejectedQuantity: '0', notes: '' });
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  const updateRecord = useMutation({
    mutationFn: () =>
      api.put(`/farms/${farmId}/production/${editTarget!.id}`, {
        quantity: Number(editForm.quantity),
        rejectedQuantity: Number(editForm.rejectedQuantity || 0),
        qualityStatus: editForm.qualityStatus,
        productionDate: editForm.productionDate,
        notes: editForm.notes || null,
      }),
    onSuccess: () => {
      refreshAll();
      setEditTarget(null);
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  const deleteRecord = useMutation({
    mutationFn: () => api.delete(`/farms/${farmId}/production/${deleteTarget!.id}`),
    onSuccess: () => {
      refreshAll();
      setDeleteTarget(null);
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.sourceId) { setErr('Select an animal, group, or beehive as source.'); return; }
    if (!form.quantity || Number(form.quantity) <= 0) { setErr('Quantity must be positive.'); return; }
    setErr('');
    create.mutate();
  };

  const submitEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editForm.quantity || Number(editForm.quantity) <= 0) { setErr('Quantity must be positive.'); return; }
    setErr('');
    updateRecord.mutate();
  };

  const openEdit = (r: ProductionRow) => {
    setEditTarget(r);
    setEditForm({
      quantity: String(r.quantity),
      rejectedQuantity: String(r.rejectedQuantity ?? 0),
      qualityStatus: r.qualityStatus ?? 'Accepted',
      productionDate: r.productionDate ? r.productionDate.slice(0, 10) : today(),
      notes: r.notes ?? '',
    });
    setErr('');
  };

  const currentProduct = PRODUCTS.find((p) => p.type === form.productType) ?? PRODUCTS[0];

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Production Batches & Yield Tracker</Typography>
          <Typography variant="body2" color="text.secondary">
            Trace daily milk collection, egg crates, honey extraction, and wool batches from source to dispatched stock.
          </Typography>
        </Box>
        <Button variant="contained" color="success" onClick={() => { setErr(''); setOpen(true); }} sx={{ fontWeight: 700 }}>
          + Record Production
        </Button>
      </Stack>

      {/* Yield Target & Progress Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {PRODUCTS.map((p) => {
          const sum = summary?.find((s) => s.productType === p.type);
          const total = sum?.totalQuantity ?? 0;
          const target = targets[p.type] ?? p.defaultTarget;
          const pct = Math.min(100, Math.round((total / (target || 1)) * 100));
          return (
            <Card key={p.type} variant="outlined" sx={{ borderRadius: 2.5, bgcolor: '#ffffff', borderColor: '#e0e0e0' }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={700}>{p.type}</Typography>
                  <Chip size="small" label={`${pct}% Target`} color={pct >= 80 ? 'success' : pct >= 40 ? 'warning' : 'default'} />
                </Stack>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 1, color: '#1b5e20' }}>
                  {total.toLocaleString()} <Typography component="span" variant="body2" color="text.secondary">{p.unit}</Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Target: {target.toLocaleString()} {p.unit} (Last 30 days)
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <TextField size="small" select label="Filter Product" value={productFilter} onChange={(e) => setProductFilter(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All Products</MenuItem>
          {PRODUCTS.map((p) => <MenuItem key={p.type} value={p.type}>{p.type}</MenuItem>)}
        </TextField>
        <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
      </Stack>

      {err && <Alert severity="error" onClose={() => setErr('')}>{err}</Alert>}

      {/* Batches Overview */}
      <Paper sx={{ mb: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="subtitle1" fontWeight={700}>Active Traceable Batches</Typography>
        </Box>
        <TableContainer>
          <Table size="small" aria-label="Production batches">
            <TableHead>
              <TableRow>
                <TableCell>Batch Code</TableCell><TableCell>Product</TableCell><TableCell>Date</TableCell>
                <TableCell align="right">Total Produced</TableCell><TableCell align="right">Available for Dispatch</TableCell><TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(!batches || batches.length === 0) && <TableRow><TableCell colSpan={6}>No batches recorded yet.</TableCell></TableRow>}
              {batches?.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell><strong>{b.batchCode}</strong></TableCell>
                  <TableCell>{b.productType}</TableCell>
                  <TableCell>{new Date(b.batchDate).toLocaleDateString()}</TableCell>
                  <TableCell align="right">{b.totalQuantity} {b.unit}</TableCell>
                  <TableCell align="right"><strong>{b.availableQuantity} {b.unit}</strong></TableCell>
                  <TableCell><Chip size="small" label={b.status} color={b.status === 'Active' ? 'success' : b.status === 'Depleted' ? 'default' : 'warning'} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Detailed Production Records */}
      <Paper>
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="subtitle1" fontWeight={700}>Production Log History</Typography>
        </Box>
        <TableContainer>
          <Table size="small" aria-label="Production records">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell><TableCell>Product</TableCell><TableCell>Source</TableCell>
                <TableCell align="right">Gross</TableCell><TableCell align="right">Rejected</TableCell>
                <TableCell>Quality</TableCell><TableCell>Batch</TableCell><TableCell>Notes</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={9}>Loading…</TableCell></TableRow>}
              {recordsData?.items.length === 0 && <TableRow><TableCell colSpan={9}>No production records in this period.</TableCell></TableRow>}
              {recordsData?.items.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{new Date(r.productionDate).toLocaleDateString()}</TableCell>
                  <TableCell>{r.productType}</TableCell>
                  <TableCell>{r.animalTag ?? r.groupName ?? r.hiveCode ?? '—'}</TableCell>
                  <TableCell align="right">{r.quantity} {r.unit}</TableCell>
                  <TableCell align="right">{r.rejectedQuantity} {r.unit}</TableCell>
                  <TableCell><Chip size="small" label={r.qualityStatus} color={r.qualityStatus === 'Accepted' ? 'success' : 'warning'} /></TableCell>
                  <TableCell>{r.batchCode ?? '—'}</TableCell>
                  <TableCell>{r.notes ?? '—'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                      <Tooltip title="Edit Record">
                        <IconButton size="small" color="primary" onClick={() => openEdit(r)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Record">
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

      {/* Record Production Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submit} noValidate>
          <DialogTitle fontWeight={700}>Record Farm Production</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <TextField
                select label="Product" fullWidth value={form.productType}
                onChange={(e) => {
                  const p = PRODUCTS.find((x) => x.type === e.target.value);
                  const kind = e.target.value === 'Honey' || e.target.value === 'Beeswax' ? 'hive' : e.target.value === 'Eggs' ? 'group' : 'animal';
                  setForm({ ...form, productType: e.target.value, unit: p?.unit ?? 'kg', sourceKind: kind, sourceId: '' });
                }}
              >
                {PRODUCTS.map((p) => <MenuItem key={p.type} value={p.type}>{p.type} ({p.unit})</MenuItem>)}
              </TextField>
              <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={form.productionDate} onChange={(e) => setForm({ ...form, productionDate: e.target.value })} fullWidth />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField select label="Source Category" value={form.sourceKind} onChange={(e) => setForm({ ...form, sourceKind: e.target.value as any, sourceId: '' })} sx={{ width: 180 }}>
                <MenuItem value="animal">Individual Animal</MenuItem>
                <MenuItem value="group">Flock / Batch / Herd</MenuItem>
                <MenuItem value="hive">Beehive</MenuItem>
              </TextField>

              {form.sourceKind === 'animal' && (
                <TextField select label="Source Animal" fullWidth required value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })}>
                  {animals?.map((a) => <MenuItem key={a.id} value={a.id}>{a.tagId} ({a.species}{a.name ? ` - ${a.name}` : ''})</MenuItem>)}
                </TextField>
              )}
              {form.sourceKind === 'group' && (
                <TextField select label="Source Flock / Group" fullWidth required value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })}>
                  {groups?.map((g) => <MenuItem key={g.id} value={g.id}>{g.name} ({g.species} - {g.count} birds/head)</MenuItem>)}
                </TextField>
              )}
              {form.sourceKind === 'hive' && (
                <TextField select label="Source Beehive" fullWidth required value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })}>
                  {hives?.map((h) => <MenuItem key={h.id} value={h.id}>{h.hiveCode} ({h.apiaryName ?? 'Main Apiary'})</MenuItem>)}
                </TextField>
              )}
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField label={`Quantity (${currentProduct.unit})`} type="number" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} fullWidth />
              <TextField label={`Rejected (${currentProduct.unit})`} type="number" value={form.rejectedQuantity} onChange={(e) => setForm({ ...form, rejectedQuantity: e.target.value })} fullWidth />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField select label="Quality Status" value={form.qualityStatus} onChange={(e) => setForm({ ...form, qualityStatus: e.target.value })} fullWidth>
                <MenuItem value="Accepted">Accepted / Grade A</MenuItem>
                <MenuItem value="Quarantine">Pending Test</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </TextField>
              <TextField label="Batch Code" value={form.batchCode} onChange={(e) => setForm({ ...form, batchCode: e.target.value })} fullWidth />
            </Stack>

            <TextField label="Notes / Collection Time" multiline rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success" disabled={create.isPending}>Save Production Record</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Production Record Dialog */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submitEdit} noValidate>
          <DialogTitle fontWeight={700}>Edit Production Record — {editTarget?.productType}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={editForm.productionDate} onChange={(e) => setEditForm({ ...editForm, productionDate: e.target.value })} sx={{ mt: 1 }} />
            <Stack direction="row" spacing={2}>
              <TextField label={`Quantity (${editTarget?.unit ?? 'kg'})`} type="number" required value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} fullWidth />
              <TextField label={`Rejected (${editTarget?.unit ?? 'kg'})`} type="number" value={editForm.rejectedQuantity} onChange={(e) => setEditForm({ ...editForm, rejectedQuantity: e.target.value })} fullWidth />
            </Stack>
            <TextField select label="Quality Status" value={editForm.qualityStatus} onChange={(e) => setEditForm({ ...editForm, qualityStatus: e.target.value })}>
              <MenuItem value="Accepted">Accepted / Grade A</MenuItem>
              <MenuItem value="Quarantine">Pending Test</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
            </TextField>
            <TextField label="Notes" multiline rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success" disabled={updateRecord.isPending}>Save Changes</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Record Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Production Record?"
        message={`Are you sure you want to delete this ${deleteTarget?.quantity} ${deleteTarget?.unit} of ${deleteTarget?.productType}? If linked to a batch, batch availability will be deducted.`}
        confirmLabel="Delete"
        busy={deleteRecord.isPending}
        onConfirm={() => deleteRecord.mutate()}
        onCancel={() => setDeleteTarget(null)}
      />
    </Stack>
  );
}
