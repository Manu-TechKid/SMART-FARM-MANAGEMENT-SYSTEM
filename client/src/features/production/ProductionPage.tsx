import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
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
  const [targets, setTargets] = useState<Record<string, number>>(() =>
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
      qc.invalidateQueries({ queryKey: ['production'] });
      qc.invalidateQueries({ queryKey: ['production-summary'] });
      qc.invalidateQueries({ queryKey: ['production-batches'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setOpen(false);
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.sourceId) { setErr('Select an animal, flock/group, or beehive source.'); return; }
    if (!form.quantity || Number(form.quantity) <= 0) { setErr('Quantity must be greater than zero.'); return; }
    if (Number(form.rejectedQuantity) < 0 || Number(form.rejectedQuantity) > Number(form.quantity)) {
      setErr('Rejected quantity cannot exceed gross quantity.'); return;
    }
    setErr('');
    create.mutate();
  };

  if (!farmId) return <Alert severity="info">Select or create a farm in Farm Settings first.</Alert>;

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          backgroundImage: 'linear-gradient(90deg, rgba(16, 42, 22, 0.88) 0%, rgba(24, 62, 34, 0.72) 60%, rgba(16, 42, 22, 0.45) 100%), url(/images/farm-harvest-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#fff',
          p: { xs: 2.5, md: 3.5 },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={800}>🥛🥚🍯 Farm Production & Batch Traceability</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.88)', mt: 0.5 }}>
              Record daily milk, eggs, honey, beeswax, and wool harvests with automatic batch inventory tracking.
            </Typography>
          </Box>
          <Button variant="contained" color="warning" onClick={() => { setErr(''); setOpen(true); }} sx={{ fontWeight: 700 }}>
            + Record Production
          </Button>
        </Stack>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField select size="small" label="Product" value={productFilter} onChange={(e) => setProductFilter(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All products</MenuItem>
          {PRODUCTS.map((p) => <MenuItem key={p.type} value={p.type}>{p.type}</MenuItem>)}
        </TextField>
        <TextField size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Stack>

      <Grid container spacing={2}>
        {PRODUCTS.map((p) => {
          const row = summary?.find((s) => s.productType === p.type);
          const net = (row?.totalQuantity ?? 0) - (row?.totalRejected ?? 0);
          const target = targets[p.type] || p.defaultTarget;
          const pct = target > 0 ? Math.min(100, Math.round((net / target) * 100)) : 0;
          return (
            <Grid key={p.type} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight={700}>{p.type}</Typography>
                    <Chip size="small" label={`${pct}% of target`} color={pct >= 80 ? 'success' : pct >= 40 ? 'warning' : 'default'} />
                  </Stack>
                  <Typography variant="h5" fontWeight={700} sx={{ my: 1 }}>
                    {net.toLocaleString()} {p.unit}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Gross: {row?.totalQuantity ?? 0} {p.unit} · Rejected: {row?.totalRejected ?? 0} {p.unit} · Entries: {row?.recordCount ?? 0}
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    label={`Period target (${p.unit})`}
                    value={target}
                    onChange={(e) => setTargets({ ...targets, [p.type]: Number(e.target.value) })}
                    sx={{ mt: 1.5, width: 160 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Typography variant="h6" fontWeight={600}>Traceable Production Batches (Available Stock)</Typography>
      <Paper>
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
                  <TableCell>{b.batchCode}</TableCell>
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

      <Typography variant="h6" fontWeight={600}>Production Log</Typography>
      <Paper>
        <TableContainer>
          <Table size="small" aria-label="Production records">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell><TableCell>Product</TableCell><TableCell>Source</TableCell>
                <TableCell align="right">Gross</TableCell><TableCell align="right">Rejected</TableCell>
                <TableCell>Quality</TableCell><TableCell>Batch</TableCell><TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8}>Loading…</TableCell></TableRow>}
              {recordsData?.items.length === 0 && <TableRow><TableCell colSpan={8}>No production records in this period.</TableCell></TableRow>}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submit} noValidate>
          <DialogTitle>Record farm production</DialogTitle>
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
                {PRODUCTS.map((p) => <MenuItem key={p.type} value={p.type}>{p.type}</MenuItem>)}
              </TextField>
              <TextField label="Production date" type="date" fullWidth value={form.productionDate}
                onChange={(e) => setForm({ ...form, productionDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField select label="Source type" fullWidth value={form.sourceKind}
                onChange={(e) => setForm({ ...form, sourceKind: e.target.value as 'animal' | 'group' | 'hive', sourceId: '' })}>
                <MenuItem value="animal">Individual Animal</MenuItem>
                <MenuItem value="group">Flock / Animal Group</MenuItem>
                <MenuItem value="hive">Beehive</MenuItem>
              </TextField>
              <TextField select label="Select source" fullWidth required value={form.sourceId}
                onChange={(e) => setForm({ ...form, sourceId: e.target.value })}>
                {form.sourceKind === 'animal' && (animals ?? []).map((a) => (
                  <MenuItem key={a.id} value={String(a.id)}>{a.tagId} ({a.species})</MenuItem>
                ))}
                {form.sourceKind === 'group' && (groups ?? []).map((g) => (
                  <MenuItem key={g.id} value={String(g.id)}>{g.name} ({g.species} · {g.count})</MenuItem>
                ))}
                {form.sourceKind === 'hive' && (hives ?? []).map((h) => (
                  <MenuItem key={h.id} value={String(h.id)}>{h.hiveCode} ({h.apiaryName ?? h.hiveType})</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField label="Gross quantity" type="number" required fullWidth value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              <TextField label="Rejected / spoiled" type="number" fullWidth value={form.rejectedQuantity}
                onChange={(e) => setForm({ ...form, rejectedQuantity: e.target.value })} />
              <TextField label="Unit" fullWidth value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField select label="Quality status" fullWidth value={form.qualityStatus}
                onChange={(e) => setForm({ ...form, qualityStatus: e.target.value })}>
                {['Accepted', 'Pending', 'Quarantine', 'Rejected'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField label="Batch code (stock tracking)" fullWidth value={form.batchCode}
                onChange={(e) => setForm({ ...form, batchCode: e.target.value })} />
            </Stack>
            <TextField label="Notes" multiline minRows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={create.isPending}>Save production</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
