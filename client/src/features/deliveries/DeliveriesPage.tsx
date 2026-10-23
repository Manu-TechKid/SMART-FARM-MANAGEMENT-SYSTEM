import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';

const STATUSES = ['Pending', 'Prepared', 'Dispatched', 'PartiallyDelivered', 'Delivered', 'Failed', 'Cancelled'];
const today = () => new Date().toISOString().slice(0, 10);

interface DeliveryItem {
  id: number;
  batchId?: number;
  productType: string;
  quantityDispatched: number;
  quantityReceived: number;
  quantityRejected: number;
  unit: string;
}

interface DeliveryRow {
  id: number;
  deliveryNumber: string;
  status: string;
  dispatchDate?: string;
  expectedArrival?: string;
  actualArrival?: string;
  customerName?: string;
  driverName?: string;
  vehicleReg?: string;
  proofOfDelivery?: string;
  discrepancyReason?: string;
  items: DeliveryItem[];
}

interface CustomerRow { id: number; name: string; }
interface BatchRow { id: number; productType: string; batchCode: string; availableQuantity: number; unit: string; }

export default function DeliveriesPage() {
  const { farmId } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [dispatchTarget, setDispatchTarget] = useState<DeliveryRow | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<DeliveryRow | null>(null);
  const [err, setErr] = useState('');

  const [form, setForm] = useState({
    customerId: '', expectedArrival: today(), driverName: '', vehicleReg: '', notes: '',
    batchId: '', productType: 'Milk', quantityDispatched: '', unit: 'L',
  });
  const [dispatchForm, setDispatchForm] = useState({ dispatchDate: today(), driverName: '', vehicleReg: '' });
  const [receiveForm, setReceiveForm] = useState({
    actualArrival: today(), proofOfDelivery: '', discrepancyReason: '',
    items: [] as { deliveryItemId: number; quantityReceived: string; quantityRejected: string }[],
  });

  const { data: deliveriesData, isLoading } = useQuery({
    queryKey: ['deliveries', farmId, statusFilter],
    enabled: !!farmId,
    queryFn: async () =>
      (await api.get<{ items: DeliveryRow[]; totalCount: number }>(`/farms/${farmId}/deliveries`, {
        params: { status: statusFilter || undefined, pageSize: 50 },
      })).data,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers', farmId],
    enabled: !!farmId && createOpen,
    queryFn: async () => (await api.get<CustomerRow[]>(`/farms/${farmId}/customers`)).data,
  });

  const { data: batches } = useQuery({
    queryKey: ['production-batches', farmId],
    enabled: !!farmId && createOpen,
    queryFn: async () => (await api.get<BatchRow[]>(`/farms/${farmId}/production/batches`)).data,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['deliveries'] });
    qc.invalidateQueries({ queryKey: ['production-batches'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const create = useMutation({
    mutationFn: () =>
      api.post(`/farms/${farmId}/deliveries`, {
        customerId: form.customerId ? Number(form.customerId) : null,
        expectedArrival: form.expectedArrival || null,
        driverName: form.driverName || null,
        vehicleReg: form.vehicleReg || null,
        notes: form.notes || null,
        items: [
          {
            batchId: form.batchId ? Number(form.batchId) : null,
            productType: form.productType,
            quantityDispatched: Number(form.quantityDispatched),
            unit: form.unit,
          },
        ],
      }),
    onSuccess: () => { refresh(); setCreateOpen(false); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const dispatchMut = useMutation({
    mutationFn: () =>
      api.put(`/farms/${farmId}/deliveries/${dispatchTarget!.id}/dispatch`, {
        dispatchDate: dispatchForm.dispatchDate,
        driverName: dispatchForm.driverName || null,
        vehicleReg: dispatchForm.vehicleReg || null,
      }),
    onSuccess: () => { refresh(); setDispatchTarget(null); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const receiveMut = useMutation({
    mutationFn: () =>
      api.put(`/farms/${farmId}/deliveries/${receiveTarget!.id}/receive`, {
        actualArrival: receiveForm.actualArrival,
        proofOfDelivery: receiveForm.proofOfDelivery || null,
        discrepancyReason: receiveForm.discrepancyReason || null,
        items: receiveForm.items.map((i) => ({
          deliveryItemId: i.deliveryItemId,
          quantityReceived: Number(i.quantityReceived || 0),
          quantityRejected: Number(i.quantityRejected || 0),
        })),
      }),
    onSuccess: () => { refresh(); setReceiveTarget(null); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/farms/${farmId}/deliveries/${id}/status`, { status }),
    onSuccess: refresh,
    onError: (e) => setErr(errorMessage(e)),
  });

  if (!farmId) return <Alert severity="info">Select or create a farm in Farm Settings first.</Alert>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Deliveries & Distribution</Typography>
        <Button variant="contained" onClick={() => { setErr(''); setCreateOpen(true); }}>Create delivery</Button>
      </Stack>

      {err && <Alert severity="error" onClose={() => setErr('')}>{err}</Alert>}

      <TextField select size="small" label="Filter status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 220 }}>
        <MenuItem value="">All</MenuItem>
        {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
      </TextField>

      <Paper>
        <TableContainer>
          <Table size="small" aria-label="Deliveries">
            <TableHead>
              <TableRow>
                <TableCell>Delivery No</TableCell><TableCell>Customer</TableCell><TableCell>Products & Qty</TableCell>
                <TableCell>Driver / Vehicle</TableCell><TableCell>Expected / Arrived</TableCell>
                <TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7}>Loading…</TableCell></TableRow>}
              {deliveriesData?.items.length === 0 && <TableRow><TableCell colSpan={7}>No deliveries found.</TableCell></TableRow>}
              {deliveriesData?.items.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell><strong>{d.deliveryNumber}</strong></TableCell>
                  <TableCell>{d.customerName ?? 'Direct'}</TableCell>
                  <TableCell>
                    {d.items?.map((i) => (
                      <div key={i.id}>
                        {i.productType}: {i.quantityDispatched} {i.unit}
                        {i.quantityReceived > 0 ? ` (Rcvd: ${i.quantityReceived}, Rej: ${i.quantityRejected})` : ''}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell>{d.driverName ?? '—'} {d.vehicleReg ? `(${d.vehicleReg})` : ''}</TableCell>
                  <TableCell>
                    {d.actualArrival
                      ? `Arrived ${new Date(d.actualArrival).toLocaleDateString()}`
                      : d.expectedArrival ? `Exp ${new Date(d.expectedArrival).toLocaleDateString()}` : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={d.status} color={
                      d.status === 'Delivered' ? 'success' : d.status === 'Dispatched' ? 'primary'
                        : d.status === 'Failed' || d.status === 'Cancelled' ? 'error' : 'warning'
                    } />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {d.status === 'Pending' && (
                        <Button size="small" onClick={() => statusMut.mutate({ id: d.id, status: 'Prepared' })}>Mark Prepared</Button>
                      )}
                      {(d.status === 'Pending' || d.status === 'Prepared') && (
                        <Button size="small" variant="contained" onClick={() => {
                          setErr('');
                          setDispatchTarget(d);
                          setDispatchForm({ dispatchDate: today(), driverName: d.driverName ?? '', vehicleReg: d.vehicleReg ?? '' });
                        }}>Confirm Dispatch</Button>
                      )}
                      {d.status === 'Dispatched' && (
                        <Button size="small" variant="contained" color="success" onClick={() => {
                          setErr('');
                          setReceiveTarget(d);
                          setReceiveForm({
                            actualArrival: today(),
                            proofOfDelivery: '',
                            discrepancyReason: '',
                            items: d.items.map((i) => ({
                              deliveryItemId: i.id,
                              quantityReceived: String(i.quantityDispatched),
                              quantityRejected: '0',
                            })),
                          });
                        }}>Record Receipt</Button>
                      )}
                      {(d.status === 'Pending' || d.status === 'Prepared' || d.status === 'Dispatched') && (
                        <Button size="small" color="error" onClick={() => statusMut.mutate({ id: d.id, status: 'Cancelled' })}>Cancel</Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Delivery Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!form.quantityDispatched || Number(form.quantityDispatched) <= 0) { setErr('Quantity must be greater than zero.'); return; }
          create.mutate();
        }} noValidate>
          <DialogTitle>Create Delivery Note</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <TextField select label="Customer" fullWidth value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <MenuItem value="">Walk-in / Direct</MenuItem>
                {(customers ?? []).map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
              </TextField>
              <TextField label="Expected arrival" type="date" fullWidth value={form.expectedArrival} onChange={(e) => setForm({ ...form, expectedArrival: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Stack>
            <TextField
              select label="Production batch (stock source)" value={form.batchId}
              onChange={(e) => {
                const b = batches?.find((x) => String(x.id) === e.target.value);
                setForm({
                  ...form,
                  batchId: e.target.value,
                  productType: b?.productType ?? form.productType,
                  unit: b?.unit ?? form.unit,
                });
              }}
            >
              <MenuItem value="">Unbatched product</MenuItem>
              {(batches ?? []).map((b) => (
                <MenuItem key={b.id} value={String(b.id)}>
                  {b.batchCode} ({b.productType} — Avail: {b.availableQuantity} {b.unit})
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField label="Product type" fullWidth value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })} />
              <TextField label="Quantity to dispatch" type="number" required fullWidth value={form.quantityDispatched} onChange={(e) => setForm({ ...form, quantityDispatched: e.target.value })} />
              <TextField label="Unit" fullWidth value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Driver name" fullWidth value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
              <TextField label="Vehicle reg" fullWidth value={form.vehicleReg} onChange={(e) => setForm({ ...form, vehicleReg: e.target.value })} />
            </Stack>
            <TextField label="Notes" multiline minRows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Create Delivery</Button></DialogActions>
        </Box>
      </Dialog>

      {/* Confirm Dispatch Dialog */}
      <Dialog open={!!dispatchTarget} onClose={() => setDispatchTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => { e.preventDefault(); dispatchMut.mutate(); }} noValidate>
          <DialogTitle>Confirm Dispatch — {dispatchTarget?.deliveryNumber}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <Alert severity="info">Confirming dispatch deducts the batch stock once inside a database transaction.</Alert>
            <TextField label="Dispatch date" type="date" value={dispatchForm.dispatchDate} onChange={(e) => setDispatchForm({ ...dispatchForm, dispatchDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Driver name" value={dispatchForm.driverName} onChange={(e) => setDispatchForm({ ...dispatchForm, driverName: e.target.value })} />
            <TextField label="Vehicle registration" value={dispatchForm.vehicleReg} onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleReg: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setDispatchTarget(null)}>Cancel</Button><Button type="submit" variant="contained">Confirm & Deduct Stock</Button></DialogActions>
        </Box>
      </Dialog>

      {/* Record Receipt Dialog */}
      <Dialog open={!!receiveTarget} onClose={() => setReceiveTarget(null)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={(e: FormEvent) => { e.preventDefault(); receiveMut.mutate(); }} noValidate>
          <DialogTitle>Record Delivery Receipt — {receiveTarget?.deliveryNumber}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField label="Arrival date" type="date" value={receiveForm.actualArrival} onChange={(e) => setReceiveForm({ ...receiveForm, actualArrival: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ mt: 1 }} />
            {receiveForm.items.map((item, idx) => (
              <Stack key={item.deliveryItemId} direction="row" spacing={2}>
                <TextField
                  label="Quantity received" type="number" fullWidth value={item.quantityReceived}
                  onChange={(e) => {
                    const next = [...receiveForm.items];
                    next[idx] = { ...next[idx], quantityReceived: e.target.value };
                    setReceiveForm({ ...receiveForm, items: next });
                  }}
                />
                <TextField
                  label="Quantity rejected" type="number" fullWidth value={item.quantityRejected}
                  onChange={(e) => {
                    const next = [...receiveForm.items];
                    next[idx] = { ...next[idx], quantityRejected: e.target.value };
                    setReceiveForm({ ...receiveForm, items: next });
                  }}
                />
              </Stack>
            ))}
            <TextField label="Proof of delivery (signer name / ref)" value={receiveForm.proofOfDelivery} onChange={(e) => setReceiveForm({ ...receiveForm, proofOfDelivery: e.target.value })} />
            <TextField label="Discrepancy reason (if partial/rejected)" value={receiveForm.discrepancyReason} onChange={(e) => setReceiveForm({ ...receiveForm, discrepancyReason: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setReceiveTarget(null)}>Cancel</Button><Button type="submit" variant="contained" color="success">Confirm Receipt</Button></DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
