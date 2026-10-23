import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';

const CATEGORIES = ['Feed', 'Veterinary', 'Labour', 'Transport', 'Utilities', 'Equipment', 'Medicine', 'Maintenance', 'Other'];
const today = () => new Date().toISOString().slice(0, 10);

interface ExpenseRow { id: number; category: string; amount: number; expenseDate: string; description: string; reference?: string; }
interface SupplierRow { id: number; name: string; contactPerson?: string; phone?: string; email?: string; }
interface FinanceSummary {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netOperatingProfit: number;
  invoicedRevenue: number;
  outstandingReceivables: number;
  netCashFlow: number;
}

const fmt = (n?: number) => (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function FinancePage() {
  const { farmId } = useAuth();
  const qc = useQueryClient();
  const [from, setFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(today());
  const [catFilter, setCatFilter] = useState('');
  const [expOpen, setExpOpen] = useState(false);
  const [supOpen, setSupOpen] = useState(false);
  const [err, setErr] = useState('');

  const [expForm, setExpForm] = useState({ category: 'Feed', amount: '', expenseDate: today(), description: '', supplierId: '', reference: '' });
  const [supForm, setSupForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '' });

  const { data: summary } = useQuery({
    queryKey: ['finance-summary', farmId, from, to],
    enabled: !!farmId,
    queryFn: async () => (await api.get<FinanceSummary>(`/farms/${farmId}/finance/summary`, { params: { from, to } })).data,
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
    onSuccess: () => { refresh(); setExpOpen(false); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const createSup = useMutation({
    mutationFn: () => api.post(`/farms/${farmId}/suppliers`, supForm),
    onSuccess: () => { refresh(); setSupOpen(false); },
    onError: (e) => setErr(errorMessage(e)),
  });

  if (!farmId) return <Alert severity="info">Select or create a farm in Farm Settings first.</Alert>;

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Expenses, Suppliers & Financial Performance</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => { setErr(''); setSupOpen(true); }}>Add Supplier</Button>
          <Button variant="contained" onClick={() => { setErr(''); setExpOpen(true); }}>Record Expense</Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField size="small" type="date" label="Period From" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="Period To" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField select size="small" label="Expense Category" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">All categories</MenuItem>
          {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card><CardContent>
            <Typography variant="caption" color="text.secondary">Invoiced Revenue (Accrual)</Typography>
            <Typography variant="h5" fontWeight={700}>{fmt(summary?.invoicedRevenue)}</Typography>
            <Typography variant="caption" color="text.secondary">Unpaid receivables: {fmt(summary?.outstandingReceivables)}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card><CardContent>
            <Typography variant="caption" color="text.secondary">Cash Collected (Cash Inflow)</Typography>
            <Typography variant="h5" fontWeight={700} color="success.main">{fmt(summary?.totalRevenue)}</Typography>
            <Typography variant="caption" color="text.secondary">Actual payments received</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card><CardContent>
            <Typography variant="caption" color="text.secondary">Total Expenses (incl. Vet)</Typography>
            <Typography variant="h5" fontWeight={700} color="error.main">{fmt(summary?.totalExpenses)}</Typography>
            <Typography variant="caption" color="text.secondary">Gross Margin: {fmt(summary?.grossProfit)}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card><CardContent>
            <Typography variant="caption" color="text.secondary">Net Operating Profit vs Cash Flow</Typography>
            <Typography variant="h6" fontWeight={700}>Profit: {fmt(summary?.netOperatingProfit)}</Typography>
            <Typography variant="caption" color="text.secondary">Net Cash Flow: {fmt(summary?.netCashFlow)}</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Typography variant="h6" fontWeight={600}>Operating Expense Ledger</Typography>
      <Paper>
        <TableContainer>
          <Table size="small" aria-label="Expenses">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell><TableCell>Category</TableCell><TableCell>Description</TableCell>
                <TableCell>Reference</TableCell><TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(!expenses || expenses.length === 0) && <TableRow><TableCell colSpan={5}>No expenses recorded in this period.</TableCell></TableRow>}
              {expenses?.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>{new Date(e.expenseDate).toLocaleDateString()}</TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>{e.reference ?? '—'}</TableCell>
                  <TableCell align="right"><strong>{fmt(e.amount)}</strong></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Typography variant="h6" fontWeight={600}>Registered Suppliers ({suppliers?.length ?? 0})</Typography>
      <Paper>
        <TableContainer>
          <Table size="small" aria-label="Suppliers">
            <TableHead>
              <TableRow>
                <TableCell>Supplier Name</TableCell><TableCell>Contact Person</TableCell><TableCell>Phone</TableCell><TableCell>Email</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(!suppliers || suppliers.length === 0) && <TableRow><TableCell colSpan={4}>No suppliers registered yet.</TableCell></TableRow>}
              {suppliers?.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell><strong>{s.name}</strong></TableCell>
                  <TableCell>{s.contactPerson ?? '—'}</TableCell>
                  <TableCell>{s.phone ?? '—'}</TableCell>
                  <TableCell>{s.email ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={expOpen} onClose={() => setExpOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!expForm.amount || Number(expForm.amount) <= 0 || !expForm.description.trim()) {
            setErr('Enter a positive amount and description.'); return;
          }
          createExp.mutate();
        }} noValidate>
          <DialogTitle>Record Operating Expense</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <TextField select label="Category" value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })} sx={{ mt: 1 }}>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField label="Amount" type="number" required value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} />
            <TextField label="Date" type="date" value={expForm.expenseDate} onChange={(e) => setExpForm({ ...expForm, expenseDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Description" required value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
            <TextField select label="Supplier (optional)" value={expForm.supplierId} onChange={(e) => setExpForm({ ...expForm, supplierId: e.target.value })}>
              <MenuItem value="">None</MenuItem>
              {(suppliers ?? []).map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
            </TextField>
            <TextField label="Receipt / Invoice reference" value={expForm.reference} onChange={(e) => setExpForm({ ...expForm, reference: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setExpOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Save Expense</Button></DialogActions>
        </Box>
      </Dialog>

      <Dialog open={supOpen} onClose={() => setSupOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!supForm.name.trim()) { setErr('Supplier name is required.'); return; }
          createSup.mutate();
        }} noValidate>
          <DialogTitle>Add Supplier</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField label="Supplier name" required value={supForm.name} onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} sx={{ mt: 1 }} />
            <TextField label="Contact person" value={supForm.contactPerson} onChange={(e) => setSupForm({ ...supForm, contactPerson: e.target.value })} />
            <TextField label="Phone" value={supForm.phone} onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })} />
            <TextField label="Email" value={supForm.email} onChange={(e) => setSupForm({ ...supForm, email: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setSupOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
