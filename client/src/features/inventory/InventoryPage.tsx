import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { EditOutlined, DeleteOutline } from '@mui/icons-material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
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
  description?: string;
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

  // Edit / Delete states
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', category: 'Feed', unit: 'kg', minimumStock: '10', unitCost: '', expiryDate: '', description: '',
  });
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

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

  const updateItem = useMutation({
    mutationFn: () =>
      api.put(`/farms/${farmId}/inventory/${editTarget!.id}`, {
        name: editForm.name.trim(),
        category: editForm.category,
        unit: editForm.unit,
        minimumStock: Number(editForm.minimumStock || 0),
        unitCost: editForm.unitCost ? Number(editForm.unitCost) : null,
        expiryDate: editForm.expiryDate || null,
        description: editForm.description || null,
      }),
    onSuccess: () => { refresh(); setEditTarget(null); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const deleteItem = useMutation({
    mutationFn: () => api.delete(`/farms/${farmId}/inventory/${deleteTarget!.id}`),
    onSuccess: () => { refresh(); setDeleteTarget(null); },
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

  const openEdit = (i: InventoryItem) => {
    setEditTarget(i);
    setEditForm({
      name: i.name,
      category: i.category,
      unit: i.unit,
      minimumStock: String(i.minimumStock),
      unitCost: i.unitCost ? String(i.unitCost) : '',
      expiryDate: i.expiryDate ? i.expiryDate.slice(0, 10) : '',
      description: i.description ?? '',
    });
    setErr('');
  };

  if (!farmId) return <Alert severity="info">Select or create a farm in Farm Settings first.</Alert>;

  const lowCount = data?.items.filter((i) => i.isLowStock).length ?? 0;
  const expCount = data?.items.filter((i) => i.isExpiringSoon).length ?? 0;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Inventory & Feed Management</Typography>
        <Button variant="contained" color="success" onClick={() => { setErr(''); setAddOpen(true); }} sx={{ fontWeight: 700 }}>
          + Add Inventory Item
        </Button>
      </Stack>

      {(lowCount > 0 || expCount > 0) && (
        <Alert severity="warning">
          {lowCount > 0 && `${lowCount} item(s) below minimum stock threshold. `}
          {expCount > 0 && `${expCount} item(s) expiring within 30 days.`}
        </Alert>
      )}

      {err && <Alert severity="error" onClose={() => setErr('')}>{err}</Alert>}

      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <TextField size="small" select label="Filter Category" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All Categories</MenuItem>
          {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <Button variant={lowOnly ? 'contained' : 'outlined'} color={lowOnly ? 'warning' : 'inherit'} onClick={() => setLowOnly(!lowOnly)}>
          {lowOnly ? 'Showing Low Stock Only' : 'Filter Low Stock'}
        </Button>
      </Stack>

      <Paper>
        <TableContainer>
          <Table size="small" aria-label="Inventory table">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell><TableCell>Category</TableCell><TableCell align="right">Current Stock</TableCell>
                <TableCell align="right">Min Threshold</TableCell><TableCell align="right">Unit Cost (KES)</TableCell>
                <TableCell>Expiry Date</TableCell><TableCell>Alerts</TableCell><TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8}>Loading…</TableCell></TableRow>}
              {data?.items.length === 0 && <TableRow><TableCell colSpan={8}>No inventory items found.</TableCell></TableRow>}
              {data?.items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell><strong>{item.name}</strong></TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell align="right"><strong>{item.currentStock.toLocaleString()} {item.unit}</strong></TableCell>
                  <TableCell align="right">{item.minimumStock.toLocaleString()} {item.unit}</TableCell>
                  <TableCell align="right">{item.unitCost?.toLocaleString() ?? '—'}</TableCell>
                  <TableCell>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {item.isLowStock && <Chip size="small" label="Low Stock" color="error" />}
                      {item.isExpiringSoon && <Chip size="small" label="Expiring" color="warning" />}
                      {!item.isLowStock && !item.isExpiringSoon && <Chip size="small" label="Healthy" color="success" variant="outlined" />}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                      <Button size="small" variant="outlined" sx={{ py: 0.25, px: 1, textTransform: 'none', fontSize: '0.78rem' }} onClick={() => {
                        setMoveTarget(item);
                        setMoveForm({ movementType: 'Receipt', quantity: '', unitCost: item.unitCost ? String(item.unitCost) : '', movementDate: today(), reference: '', notes: '' });
                      }}>
                        Adjust Stock
                      </Button>
                      <Tooltip title="Edit Item">
                        <IconButton size="small" color="primary" onClick={() => openEdit(item)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Item">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(item)}>
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

      {/* Add Item Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!form.name.trim()) { setErr('Item name is required.'); return; }
          createItem.mutate();
        }}>
          <DialogTitle fontWeight={700}>Add Inventory Item</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField label="Item Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} sx={{ mt: 1 }} />
            <TextField select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField label="Unit (e.g. kg, L, bags)" required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} fullWidth />
              <TextField label="Min Alert Threshold" type="number" required value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: e.target.value })} fullWidth />
            </Stack>
            <TextField label="Unit Cost (KES)" type="number" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
            <TextField label="Expiry Date" type="date" InputLabelProps={{ shrink: true }} value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            <TextField label="Description / Storage Bin" multiline rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Save Item</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!editForm.name.trim()) { setErr('Item name is required.'); return; }
          updateItem.mutate();
        }}>
          <DialogTitle fontWeight={700}>Edit Item — {editTarget?.name}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField label="Item Name" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} sx={{ mt: 1 }} />
            <TextField select label="Category" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField label="Unit" required value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} fullWidth />
              <TextField label="Min Alert Threshold" type="number" required value={editForm.minimumStock} onChange={(e) => setEditForm({ ...editForm, minimumStock: e.target.value })} fullWidth />
            </Stack>
            <TextField label="Unit Cost (KES)" type="number" value={editForm.unitCost} onChange={(e) => setEditForm({ ...editForm, unitCost: e.target.value })} />
            <TextField label="Expiry Date" type="date" InputLabelProps={{ shrink: true }} value={editForm.expiryDate} onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })} />
            <TextField label="Description / Storage Bin" multiline rows={2} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Save Changes</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Item Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete Inventory Item ${deleteTarget?.name}?`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        busy={deleteItem.isPending}
        onConfirm={() => deleteItem.mutate()}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Adjust Stock Movement Dialog */}
      <Dialog open={!!moveTarget} onClose={() => setMoveTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!moveForm.quantity || Number(moveForm.quantity) <= 0) { setErr('Quantity must be positive.'); return; }
          addMovement.mutate();
        }}>
          <DialogTitle fontWeight={700}>Stock Movement — {moveTarget?.name}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Current stock: <strong>{moveTarget?.currentStock} {moveTarget?.unit}</strong>
            </Typography>
            <TextField select label="Movement Type" value={moveForm.movementType} onChange={(e) => setMoveForm({ ...moveForm, movementType: e.target.value })}>
              {MOVEMENTS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
            <TextField label={`Quantity (${moveTarget?.unit})`} type="number" required value={moveForm.quantity} onChange={(e) => setMoveForm({ ...moveForm, quantity: e.target.value })} />
            <TextField label="Unit Cost (KES, optional)" type="number" value={moveForm.unitCost} onChange={(e) => setMoveForm({ ...moveForm, unitCost: e.target.value })} />
            <TextField label="Movement Date" type="date" InputLabelProps={{ shrink: true }} value={moveForm.movementDate} onChange={(e) => setMoveForm({ ...moveForm, movementDate: e.target.value })} />
            <TextField label="Reference / Invoice No" value={moveForm.reference} onChange={(e) => setMoveForm({ ...moveForm, reference: e.target.value })} />
            <TextField label="Notes" multiline rows={2} value={moveForm.notes} onChange={(e) => setMoveForm({ ...moveForm, notes: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setMoveTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Record Movement</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
