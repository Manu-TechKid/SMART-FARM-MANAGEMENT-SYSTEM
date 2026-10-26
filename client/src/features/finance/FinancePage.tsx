import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { EditOutlined, DeleteOutline } from '@mui/icons-material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';

const CATEGORIES = ['Feed', 'Medicine', 'Veterinary', 'Labor', 'Fuel', 'Maintenance', 'Utilities', 'Packaging', 'Other'];
const today = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

interface Summary {
  cashRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netOperatingProfit: number;
  netCashFlow: number;
  invoicedRevenue: number;
  outstandingReceivables: number;
}
interface ExpenseRow {
  id: number;
  category: string;
  amount: number;
  expenseDate: string;
  description: string;
  reference?: string;
  supplierId?: number;
}
interface SupplierRow { id: number; name: string; contactPerson?: string; phone?: string; email?: string; address?: string; notes?: string; }

export default function FinancePage() {
  const { farmId } = useAuth();
  const qc = useQueryClient();
  const [from, setFrom] = useState(startOfMonth);
  const [to, setTo] = useState(today);
  const [catFilter, setCatFilter] = useState('');
  const [expOpen, setExpOpen] = useState(false);
  const [supOpen, setSupOpen] = useState(false);
  const [err, setErr] = useState('');

  // Edit / Delete states
  const [editExpTarget, setEditExpTarget] = useState<ExpenseRow | null>(null);
  const [editExpForm, setEditExpForm] = useState({ category: 'Feed', amount: '', expenseDate: today(), description: '', reference: '', supplierId: '' });
  const [deleteExpTarget, setDeleteExpTarget] = useState<ExpenseRow | null>(null);

  const [editSupTarget, setEditSupTarget] = useState<SupplierRow | null>(null);
  const [editSupForm, setEditSupForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '' });
  const [deleteSupTarget, setDeleteSupTarget] = useState<SupplierRow | null>(null);

  const [expForm, setExpForm] = useState({ category: 'Feed', amount: '', expenseDate: today(), description: '', supplierId: '', reference: '' });
  const [supForm, setSupForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '' });

  const { data: summary } = useQuery({
    queryKey: ['finance-summary', farmId, from, to],
    enabled: !!farmId,
    queryFn: async () =>
      (await api.get<Summary>(`/farms/${farmId}/finance/summary`, { params: { from, to } })).data,
  });

  const { data: expenses } = useQuery({
    queryKey: ['expenses', farmId, catFilter, from, to],
    enabled: !!farmId,
    queryFn: async () =>
      (await api.get<ExpenseRow[]>(`/farms/${farmId}/expenses`, {
        params: { category: catFilter || undefined, from, to },
      })).data,
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', farmId],
    enabled: !!farmId,
    queryFn: async () => (await api.get<SupplierRow[]>(`/farms/${farmId}/suppliers`)).data,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['finance-summary'] });
    qc.invalidateQueries({ queryKey: ['expenses'] });
    qc.invalidateQueries({ queryKey: ['suppliers'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createExp = useMutation({
    mutationFn: () =>
      api.post(`/farms/${farmId}/expenses`, {
        category: expForm.category,
        amount: Number(expForm.amount),
        expenseDate: expForm.expenseDate,
        description: expForm.description.trim(),
        supplierId: expForm.supplierId ? Number(expForm.supplierId) : null,
        reference: expForm.reference || null,
      }),
    onSuccess: () => { refresh(); setExpOpen(false); setExpForm({ category: 'Feed', amount: '', expenseDate: today(), description: '', supplierId: '', reference: '' }); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const updateExp = useMutation({
    mutationFn: () =>
      api.put(`/farms/${farmId}/expenses/${editExpTarget!.id}`, {
        category: editExpForm.category,
        amount: Number(editExpForm.amount),
        expenseDate: editExpForm.expenseDate,
        description: editExpForm.description.trim(),
        supplierId: editExpForm.supplierId ? Number(editExpForm.supplierId) : null,
        reference: editExpForm.reference || null,
      }),
    onSuccess: () => { refresh(); setEditExpTarget(null); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const deleteExp = useMutation({
    mutationFn: () => api.delete(`/farms/${farmId}/expenses/${deleteExpTarget!.id}`),
    onSuccess: () => { refresh(); setDeleteExpTarget(null); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const createSup = useMutation({
    mutationFn: () => api.post(`/farms/${farmId}/suppliers`, supForm),
    onSuccess: () => { refresh(); setSupOpen(false); setSupForm({ name: '', contactPerson: '', phone: '', email: '', address: '' }); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const updateSup = useMutation({
    mutationFn: () => api.put(`/farms/${farmId}/suppliers/${editSupTarget!.id}`, editSupForm),
    onSuccess: () => { refresh(); setEditSupTarget(null); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const deleteSup = useMutation({
    mutationFn: () => api.delete(`/farms/${farmId}/suppliers/${deleteSupTarget!.id}`),
    onSuccess: () => { refresh(); setDeleteSupTarget(null); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const openEditExp = (e: ExpenseRow) => {
    setEditExpTarget(e);
    setEditExpForm({
      category: e.category,
      amount: String(e.amount),
      expenseDate: e.expenseDate ? e.expenseDate.slice(0, 10) : today(),
      description: e.description,
      reference: e.reference ?? '',
      supplierId: e.supplierId ? String(e.supplierId) : '',
    });
    setErr('');
  };

  const openEditSup = (s: SupplierRow) => {
    setEditSupTarget(s);
    setEditSupForm({
      name: s.name,
      contactPerson: s.contactPerson ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      address: s.address ?? '',
    });
    setErr('');
  };

  if (!farmId) return <Alert severity="info">Select or create a farm in Farm Settings first.</Alert>;

  const fmt = (n: number) => `KES ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Financials & Operating Expense Ledger</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage cost centers, track supplier accounts, analyze gross & net operating profit margins, and review cash flows.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" color="success" onClick={() => { setErr(''); setSupOpen(true); }}>+ Add Supplier</Button>
          <Button variant="contained" color="success" onClick={() => { setErr(''); setExpOpen(true); }} sx={{ fontWeight: 700 }}>+ Record Expense</Button>
        </Stack>
      </Stack>

      {/* Date & Filter controls */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
        <TextField size="small" select label="Filter Category" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All Categories</MenuItem>
          {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
      </Stack>

      {err && <Alert severity="error" onClose={() => setErr('')}>{err}</Alert>}

      {/* Financial Health Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">Collected Cash Revenue</Typography>
            <Typography variant="h6" fontWeight={800} color="success.main">{fmt(summary?.cashRevenue ?? 0)}</Typography>
            <Typography variant="caption" color="text.secondary">Invoiced: {fmt(summary?.invoicedRevenue ?? 0)}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">Total Operating Expenses</Typography>
            <Typography variant="h6" fontWeight={800} color="error.main">{fmt(summary?.totalExpenses ?? 0)}</Typography>
            <Typography variant="caption" color="text.secondary">Feeds, vet & utilities</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">Net Operating Profit</Typography>
            <Typography variant="h6" fontWeight={800} color={(summary?.netOperatingProfit ?? 0) >= 0 ? 'success.main' : 'error.main'}>
              {fmt(summary?.netOperatingProfit ?? 0)}
            </Typography>
            <Typography variant="caption" color="text.secondary">Revenue basis less expenses</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">Outstanding Receivables</Typography>
            <Typography variant="h6" fontWeight={800} color="warning.main">{fmt(summary?.outstandingReceivables ?? 0)}</Typography>
            <Typography variant="caption" color="text.secondary">Unpaid invoices</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Expenses Table */}
      <Typography variant="h6" fontWeight={700}>Operating Expense Ledger</Typography>
      <Paper>
        <TableContainer>
          <Table size="small" aria-label="Expenses">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell><TableCell>Category</TableCell><TableCell>Description</TableCell>
                <TableCell>Reference</TableCell><TableCell align="right">Amount</TableCell><TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(!expenses || expenses.length === 0) && <TableRow><TableCell colSpan={6}>No expenses recorded in this period.</TableCell></TableRow>}
              {expenses?.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>{new Date(e.expenseDate).toLocaleDateString()}</TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>{e.reference ?? '—'}</TableCell>
                  <TableCell align="right"><strong>{fmt(e.amount)}</strong></TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                      <Tooltip title="Edit Expense">
                        <IconButton size="small" color="primary" onClick={() => openEditExp(e)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Expense">
                        <IconButton size="small" color="error" onClick={() => setDeleteExpTarget(e)}>
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

      {/* Suppliers Table */}
      <Typography variant="h6" fontWeight={700}>Registered Suppliers ({suppliers?.length ?? 0})</Typography>
      <Paper>
        <TableContainer>
          <Table size="small" aria-label="Suppliers">
            <TableHead>
              <TableRow>
                <TableCell>Supplier Name</TableCell><TableCell>Contact Person</TableCell><TableCell>Phone</TableCell><TableCell>Email</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(!suppliers || suppliers.length === 0) && <TableRow><TableCell colSpan={5}>No suppliers registered yet.</TableCell></TableRow>}
              {suppliers?.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell><strong>{s.name}</strong></TableCell>
                  <TableCell>{s.contactPerson ?? '—'}</TableCell>
                  <TableCell>{s.phone ?? '—'}</TableCell>
                  <TableCell>{s.email ?? '—'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                      <Tooltip title="Edit Supplier">
                        <IconButton size="small" color="primary" onClick={() => openEditSup(s)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Supplier">
                        <IconButton size="small" color="error" onClick={() => setDeleteSupTarget(s)}>
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

      {/* Add Expense Dialog */}
      <Dialog open={expOpen} onClose={() => setExpOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!expForm.amount || Number(expForm.amount) <= 0) { setErr('Amount must be positive.'); return; }
          if (!expForm.description.trim()) { setErr('Description is required.'); return; }
          createExp.mutate();
        }}>
          <DialogTitle fontWeight={700}>Record Operating Expense</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField select label="Expense Category" value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })} sx={{ mt: 1 }}>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField label="Amount (KES)" type="number" required value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} />
            <TextField label="Expense Date" type="date" InputLabelProps={{ shrink: true }} value={expForm.expenseDate} onChange={(e) => setExpForm({ ...expForm, expenseDate: e.target.value })} />
            <TextField label="Description" required value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
            <TextField select label="Supplier (optional)" value={expForm.supplierId} onChange={(e) => setExpForm({ ...expForm, supplierId: e.target.value })}>
              <MenuItem value="">None / Direct</MenuItem>
              {suppliers?.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
            <TextField label="Receipt / Voucher Reference" value={expForm.reference} onChange={(e) => setExpForm({ ...expForm, reference: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setExpOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Save Expense</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={!!editExpTarget} onClose={() => setEditExpTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!editExpForm.amount || Number(editExpForm.amount) <= 0) { setErr('Amount must be positive.'); return; }
          if (!editExpForm.description.trim()) { setErr('Description is required.'); return; }
          updateExp.mutate();
        }}>
          <DialogTitle fontWeight={700}>Edit Operating Expense</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField select label="Expense Category" value={editExpForm.category} onChange={(e) => setEditExpForm({ ...editExpForm, category: e.target.value })} sx={{ mt: 1 }}>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField label="Amount (KES)" type="number" required value={editExpForm.amount} onChange={(e) => setEditExpForm({ ...editExpForm, amount: e.target.value })} />
            <TextField label="Expense Date" type="date" InputLabelProps={{ shrink: true }} value={editExpForm.expenseDate} onChange={(e) => setEditExpForm({ ...editExpForm, expenseDate: e.target.value })} />
            <TextField label="Description" required value={editExpForm.description} onChange={(e) => setEditExpForm({ ...editExpForm, description: e.target.value })} />
            <TextField select label="Supplier (optional)" value={editExpForm.supplierId} onChange={(e) => setEditExpForm({ ...editExpForm, supplierId: e.target.value })}>
              <MenuItem value="">None / Direct</MenuItem>
              {suppliers?.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
            <TextField label="Receipt / Voucher Reference" value={editExpForm.reference} onChange={(e) => setEditExpForm({ ...editExpForm, reference: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditExpTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Save Changes</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Expense Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteExpTarget}
        title="Delete Expense?"
        message={`Are you sure you want to delete this expense of ${fmt(deleteExpTarget?.amount ?? 0)} for "${deleteExpTarget?.description}"?`}
        confirmLabel="Delete"
        busy={deleteExp.isPending}
        onConfirm={() => deleteExp.mutate()}
        onCancel={() => setDeleteExpTarget(null)}
      />

      {/* Add Supplier Dialog */}
      <Dialog open={supOpen} onClose={() => setSupOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!supForm.name.trim()) { setErr('Supplier name is required.'); return; }
          createSup.mutate();
        }}>
          <DialogTitle fontWeight={700}>Register Supplier</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField label="Supplier / Company Name" required value={supForm.name} onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} sx={{ mt: 1 }} />
            <TextField label="Contact Person" value={supForm.contactPerson} onChange={(e) => setSupForm({ ...supForm, contactPerson: e.target.value })} />
            <TextField label="Phone Number" value={supForm.phone} onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })} />
            <TextField label="Email" type="email" value={supForm.email} onChange={(e) => setSupForm({ ...supForm, email: e.target.value })} />
            <TextField label="Address" value={supForm.address} onChange={(e) => setSupForm({ ...supForm, address: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSupOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Save Supplier</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={!!editSupTarget} onClose={() => setEditSupTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!editSupForm.name.trim()) { setErr('Supplier name is required.'); return; }
          updateSup.mutate();
        }}>
          <DialogTitle fontWeight={700}>Edit Supplier — {editSupTarget?.name}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField label="Supplier / Company Name" required value={editSupForm.name} onChange={(e) => setEditSupForm({ ...editSupForm, name: e.target.value })} sx={{ mt: 1 }} />
            <TextField label="Contact Person" value={editSupForm.contactPerson} onChange={(e) => setEditSupForm({ ...editSupForm, contactPerson: e.target.value })} />
            <TextField label="Phone Number" value={editSupForm.phone} onChange={(e) => setEditSupForm({ ...editSupForm, phone: e.target.value })} />
            <TextField label="Email" type="email" value={editSupForm.email} onChange={(e) => setEditSupForm({ ...editSupForm, email: e.target.value })} />
            <TextField label="Address" value={editSupForm.address} onChange={(e) => setEditSupForm({ ...editSupForm, address: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditSupTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Save Changes</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Supplier Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteSupTarget}
        title={`Delete Supplier ${deleteSupTarget?.name}?`}
        message={`Are you sure you want to deactivate supplier "${deleteSupTarget?.name}"?`}
        confirmLabel="Delete"
        busy={deleteSup.isPending}
        onConfirm={() => deleteSup.mutate()}
        onCancel={() => setDeleteSupTarget(null)}
      />
    </Stack>
  );
}
