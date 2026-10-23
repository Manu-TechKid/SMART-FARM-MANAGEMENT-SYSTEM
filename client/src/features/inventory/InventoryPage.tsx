import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import type { PagedResult } from '../../types';

const CATEGORIES = ['Feed', 'Medicine', 'Vaccine', 'Packaging', 'Equipment', 'Supplement', 'Other'];
const MOVEMENTS = ['Receipt', 'Usage', 'Wastage', 'Return', 'Transfer', 'Adjustment'];
const today = () => new Date().toISOString().slice(0, 10);

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  unitCost?: number;
  expiryDate?: string;
  isLowStock: boolean;
  isExpiringSoon: boolean;
}

export default function InventoryPage() {
  const { farmId } = useAuth();
  const qc = useQueryClient();
  const [category, setCategory] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<InventoryItem | null>(null);
  const [err, setErr] = useState('');

  const [form, setForm] = useState({
    name: '', category: 'Feed', unit: 'kg', minimumStock: '10', unitCost: '', expiryDate: '', description: '',
  });
  const [moveForm, setMoveForm] = useState({
    movementType: 'Receipt', quantity: '', unitCost: '', movementDate: today(), reference: '', notes: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', farmId, category, lowOnly],
    enabled: !!farmId,
    queryFn: async () =>
      (await api.get<PagedResult<InventoryItem>>(`/farms/${farmId}/inventory`, {
        params: { category: category || undefined, lowStock: lowOnly || undefined, pageSize: 100 },
      })).data,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['inventory'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createItem = useMutation({
    mutationFn: () =>
      api.post(`/farms/${farmId}/inventory`, {
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        minimumStock: Number(form.minimumStock || 0),
        unitCost: form.unitCost ? Number(form.unitCost) : null,
        expiryDate: form.expiryDate || null,
        description: form.description || null,
      }),
    onSuccess: () => { refresh(); setAddOpen(false); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const addMovement = useMutation({
    mutationFn: () =>
      api.post(`/farms/${farmId}/inventory/${moveTarget!.id}/movements`, {
        movementType: moveForm.movementType,
        quantity: Number(moveForm.quantity),
        unitCost: moveForm.unitCost ? Number(moveForm.unitCost) : null,
        movementDate: moveForm.movementDate,
        reference: moveForm.reference || null,
        notes: moveForm.notes || null,
      }),
    onSuccess: () => { refresh(); setMoveTarget(null); },
    onError: (e) => setErr(errorMessage(e)),
  });

  if (!farmId) return <Alert severity="info">Select or create a farm in Farm Settings first.</Alert>;

  const lowCount = data?.items.filter((i) => i.isLowStock).length ?? 0;
  const expCount = data?.items.filter((i) => i.isExpiringSoon).length ?? 0;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Inventory & Feed Management</Typography>
        <Button variant="contained" onClick={() => { setErr(''); setAddOpen(true); }}>Add inventory item</Button>
      </Stack>

      {(lowCount > 0 || expCount > 0) && (
        <Alert severity="warning">
          {lowCount > 0 && `${lowCount} item(s) at or below minimum stock threshold. `}
          {expCount > 0 && `${expCount} item(s) expiring within 30 days.`}
        </Alert>
      )}

      <Stack direction="row" spacing={2} alignItems="center">
        <TextField select size="small" label="Category" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ width: 180 }}>
          <MenuItem value="">All categories</MenuItem>
          {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <Button variant={lowOnly ? 'contained' : 'outlined'} color="warning" size="small" onClick={() => setLowOnly((v) => !v)}>
          {lowOnly ? 'Showing low stock only' : 'Filter low stock'}
        </Button>
      </Stack>

      <Paper>
        <TableContainer>
          <Table size="small" aria-label="Inventory items">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell><TableCell>Category</TableCell><TableCell align="right">Current Stock</TableCell>
                <TableCell align="right">Min Threshold</TableCell><TableCell align="right">Unit Cost</TableCell>
                <TableCell>Expiry Date</TableCell><TableCell>Alerts</TableCell><TableCell align="right">Stock Movement</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8}>Loading…</TableCell></TableRow>}
              {data?.items.length === 0 && <TableRow><TableCell colSpan={8}>No inventory items found.</TableCell></TableRow>}
              {data?.items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell><strong>{item.name}</strong></TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell align="right">{item.currentStock} {item.unit}</TableCell>
                  <TableCell align="right">{item.minimumStock} {item.unit}</TableCell>
                  <TableCell align="right">{item.unitCost?.toLocaleString() ?? '—'}</TableCell>
                  <TableCell>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {item.isLowStock && <Chip size="small" label="Low stock" color="warning" />}
                      {item.isExpiringSoon && <Chip size="small" label="Expiring soon" color="error" />}
                      {!item.isLowStock && !item.isExpiringSoon && <Chip size="small" label="OK" color="success" variant="outlined" />}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => {
                      setErr('');
                      setMoveTarget(item);
                      setMoveForm({ movementType: 'Receipt', quantity: '', unitCost: item.unitCost ? String(item.unitCost) : '', movementDate: today(), reference: '', notes: '' });
                    }}> Stock In / Out</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!form.name.trim()) { setErr('Item name is required.'); return; }
          createItem.mutate();
        }} noValidate>
          <DialogTitle>New Inventory Item</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <TextField label="Item name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} sx={{ mt: 1 }} />
            <Stack direction="row" spacing={2}>
              <TextField select label="Category" fullWidth value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField label="Unit (kg, bags, doses, L)" fullWidth value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Min stock threshold" type="number" fullWidth value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: e.target.value })} />
              <TextField label="Unit cost" type="number" fullWidth value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
            </Stack>
            <TextField label="Expiry date (optional)" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Description" multiline minRows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setAddOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!moveTarget} onClose={() => setMoveTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!moveForm.quantity || Number(moveForm.quantity) < 0) { setErr('Enter a valid quantity.'); return; }
          addMovement.mutate();
        }} noValidate>
          <DialogTitle>Stock Movement — {moveTarget?.name}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <Typography variant="body2" color="text.secondary">
              Current balance: <strong>{moveTarget?.currentStock} {moveTarget?.unit}</strong>
            </Typography>
            <TextField select label="Movement type" value={moveForm.movementType} onChange={(e) => setMoveForm({ ...moveForm, movementType: e.target.value })}>
              {MOVEMENTS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
            <TextField label={`Quantity (${moveTarget?.unit})`} type="number" required value={moveForm.quantity} onChange={(e) => setMoveForm({ ...moveForm, quantity: e.target.value })} />
            <TextField label="Date" type="date" value={moveForm.movementDate} onChange={(e) => setMoveForm({ ...moveForm, movementDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Reference (PO / flock / barn)" value={moveForm.reference} onChange={(e) => setMoveForm({ ...moveForm, reference: e.target.value })} />
            <TextField label="Notes" value={moveForm.notes} onChange={(e) => setMoveForm({ ...moveForm, notes: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setMoveTarget(null)}>Cancel</Button><Button type="submit" variant="contained">Record Movement</Button></DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
