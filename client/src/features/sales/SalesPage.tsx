import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';

const METHODS = ['Cash', 'MobileMoney', 'BankTransfer', 'Cheque', 'Other'];
const today = () => new Date().toISOString().slice(0, 10);

interface CustomerRow { id: number; name: string; contactPerson?: string; phone?: string; email?: string; outstandingBalance: number; }
interface OrderRow { id: number; orderNumber: string; orderDate: string; status: string; totalAmount: number; customerName?: string; }
interface InvoiceRow { id: number; invoiceNumber: string; invoiceDate: string; dueDate: string; amount: number; paidAmount: number; status: string; customerName?: string; }

export default function SalesPage() {
  const { farmId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [custOpen, setCustOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [invTarget, setInvTarget] = useState<OrderRow | null>(null);
  const [payTarget, setPayTarget] = useState<InvoiceRow | null>(null);
  const [err, setErr] = useState('');

  const [custForm, setCustForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '' });
  const [orderForm, setOrderForm] = useState({ customerId: '', orderDate: today(), productType: 'Milk', quantity: '', unit: 'L', unitPrice: '', notes: '' });
  const [invDueDate, setInvDueDate] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [payForm, setPayForm] = useState({ amount: '', paidAt: today(), method: 'MobileMoney', reference: '', notes: '' });

  const { data: customers } = useQuery({
    queryKey: ['customers', farmId],
    enabled: !!farmId,
    queryFn: async () => (await api.get<CustomerRow[]>(`/farms/${farmId}/customers`)).data,
  });

  const { data: ordersData } = useQuery({
    queryKey: ['sales-orders', farmId],
    enabled: !!farmId,
    queryFn: async () => (await api.get<{ items: OrderRow[]; totalCount: number }>(`/farms/${farmId}/sales-orders`)).data,
  });

  const { data: invoices } = useQuery({
    queryKey: ['invoices', farmId],
    enabled: !!farmId,
    queryFn: async () => (await api.get<InvoiceRow[]>(`/farms/${farmId}/invoices`)).data,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['customers'] });
    qc.invalidateQueries({ queryKey: ['sales-orders'] });
    qc.invalidateQueries({ queryKey: ['invoices'] });
    qc.invalidateQueries({ queryKey: ['finance-summary'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createCust = useMutation({
    mutationFn: () => api.post(`/farms/${farmId}/customers`, custForm),
    onSuccess: () => { refresh(); setCustOpen(false); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const createOrder = useMutation({
    mutationFn: () =>
      api.post(`/farms/${farmId}/sales-orders`, {
        customerId: Number(orderForm.customerId),
        orderDate: orderForm.orderDate,
        notes: orderForm.notes || null,
        items: [
          {
            productType: orderForm.productType,
            quantity: Number(orderForm.quantity),
            unit: orderForm.unit,
            unitPrice: Number(orderForm.unitPrice),
          },
        ],
      }),
    onSuccess: () => { refresh(); setOrderOpen(false); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const createInvoice = useMutation({
    mutationFn: () =>
      api.post(`/farms/${farmId}/invoices`, {
        salesOrderId: invTarget!.id,
        dueDate: invDueDate,
      }),
    onSuccess: () => { refresh(); setInvTarget(null); setTab(1); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const recordPayment = useMutation({
    mutationFn: () =>
      api.post(`/farms/${farmId}/invoices/${payTarget!.id}/payments`, {
        amount: Number(payForm.amount),
        paidAt: payForm.paidAt,
        method: payForm.method,
        reference: payForm.reference.trim() || null,
        notes: payForm.notes || null,
      }),
    onSuccess: () => { refresh(); setPayTarget(null); },
    onError: (e) => setErr(errorMessage(e)),
  });

  if (!farmId) return <Alert severity="info">Select or create a farm in Farm Settings first.</Alert>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Sales, Invoices & Customers</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => { setErr(''); setCustOpen(true); }}>Add Customer</Button>
          <Button variant="contained" onClick={() => { setErr(''); setOrderOpen(true); }}>Create Sales Order</Button>
        </Stack>
      </Stack>

      {err && <Alert severity="error" onClose={() => setErr('')}>{err}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={`Sales Orders (${ordersData?.totalCount ?? 0})`} />
        <Tab label={`Invoices & Payments (${invoices?.length ?? 0})`} />
        <Tab label={`Customers (${customers?.length ?? 0})`} />
      </Tabs>

      {tab === 0 && (
        <Paper>
          <TableContainer>
            <Table size="small" aria-label="Sales orders">
              <TableHead>
                <TableRow>
                  <TableCell>Order No</TableCell><TableCell>Date</TableCell><TableCell>Customer</TableCell>
                  <TableCell align="right">Total Amount</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ordersData?.items.length === 0 && <TableRow><TableCell colSpan={6}>No sales orders yet.</TableCell></TableRow>}
                {ordersData?.items.map((o) => (
                  <TableRow key={o.id} hover>
                    <TableCell><strong>{o.orderNumber}</strong></TableCell>
                    <TableCell>{new Date(o.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>{o.customerName ?? '—'}</TableCell>
                    <TableCell align="right">{o.totalAmount.toLocaleString()}</TableCell>
                    <TableCell><Chip size="small" label={o.status} color={o.status === 'Confirmed' ? 'success' : 'warning'} /></TableCell>
                    <TableCell align="right">
                      {o.status === 'Pending' && (
                        <Button size="small" variant="contained" onClick={() => { setErr(''); setInvTarget(o); }}>Generate Invoice</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {tab === 1 && (
        <Paper>
          <TableContainer>
            <Table size="small" aria-label="Invoices">
              <TableRow component="thead">
                <TableCell>Invoice No</TableCell><TableCell>Customer</TableCell><TableCell>Due Date</TableCell>
                <TableCell align="right">Amount</TableCell><TableCell align="right">Paid</TableCell>
                <TableCell align="right">Balance</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
              </TableRow>
              <TableBody>
                {(!invoices || invoices.length === 0) && <TableRow><TableCell colSpan={8}>No invoices issued yet.</TableCell></TableRow>}
                {invoices?.map((inv) => {
                  const bal = inv.amount - inv.paidAmount;
                  return (
                    <TableRow key={inv.id} hover>
                      <TableCell><strong>{inv.invoiceNumber}</strong></TableCell>
                      <TableCell>{inv.customerName ?? '—'}</TableCell>
                      <TableCell>{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell align="right">{inv.amount.toLocaleString()}</TableCell>
                      <TableCell align="right">{inv.paidAmount.toLocaleString()}</TableCell>
                      <TableCell align="right"><strong>{bal.toLocaleString()}</strong></TableCell>
                      <TableCell>
                        <Chip size="small" label={inv.status} color={inv.status === 'Paid' ? 'success' : inv.status === 'PartiallyPaid' ? 'warning' : 'error'} />
                      </TableCell>
                      <TableCell align="right">
                        {inv.status !== 'Paid' && (
                          <Button size="small" variant="contained" color="success" onClick={() => {
                            setErr('');
                            setPayTarget(inv);
                            setPayForm({ amount: String(bal), paidAt: today(), method: 'MobileMoney', reference: '', notes: '' });
                          }}>Record Payment</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {tab === 2 && (
        <Paper>
          <TableContainer>
            <Table size="small" aria-label="Customers">
              <TableHead>
                <TableRow>
                  <TableCell>Customer Name</TableCell><TableCell>Contact Person</TableCell>
                  <TableCell>Phone</TableCell><TableCell>Email</TableCell><TableCell align="right">Outstanding Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(!customers || customers.length === 0) && <TableRow><TableCell colSpan={5}>No customers registered.</TableCell></TableRow>}
                {customers?.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell><strong>{c.name}</strong></TableCell>
                    <TableCell>{c.contactPerson ?? '—'}</TableCell>
                    <TableCell>{c.phone ?? '—'}</TableCell>
                    <TableCell>{c.email ?? '—'}</TableCell>
                    <TableCell align="right">{c.outstandingBalance.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={custOpen} onClose={() => setCustOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!custForm.name.trim()) { setErr('Customer name is required.'); return; }
          createCust.mutate();
        }} noValidate>
          <DialogTitle>Register Customer</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField label="Customer / Company name" required value={custForm.name} onChange={(e) => setCustForm({ ...custForm, name: e.target.value })} sx={{ mt: 1 }} />
            <TextField label="Contact person" value={custForm.contactPerson} onChange={(e) => setCustForm({ ...custForm, contactPerson: e.target.value })} />
            <TextField label="Phone" value={custForm.phone} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} />
            <TextField label="Email" type="email" value={custForm.email} onChange={(e) => setCustForm({ ...custForm, email: e.target.value })} />
            <TextField label="Address" value={custForm.address} onChange={(e) => setCustForm({ ...custForm, address: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setCustOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
        </Box>
      </Dialog>

      {/* Create Sales Order Dialog */}
      <Dialog open={orderOpen} onClose={() => setOrderOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!orderForm.customerId) { setErr('Select a customer first.'); return; }
          if (!orderForm.quantity || Number(orderForm.quantity) <= 0 || !orderForm.unitPrice || Number(orderForm.unitPrice) <= 0) {
            setErr('Enter positive quantity and unit price.'); return;
          }
          createOrder.mutate();
        }} noValidate>
          <DialogTitle>Create Sales Order</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <TextField select label="Customer" required fullWidth value={orderForm.customerId} onChange={(e) => setOrderForm({ ...orderForm, customerId: e.target.value })}>
                {(customers ?? []).map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
              </TextField>
              <TextField label="Order date" type="date" fullWidth value={orderForm.orderDate} onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField select label="Product" fullWidth value={orderForm.productType} onChange={(e) => setOrderForm({ ...orderForm, productType: e.target.value })}>
                {['Milk', 'Eggs', 'Honey', 'Beeswax', 'Wool', 'Meat', 'Livestock'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
              <TextField label="Quantity" type="number" required fullWidth value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} />
              <TextField label="Unit" fullWidth value={orderForm.unit} onChange={(e) => setOrderForm({ ...orderForm, unit: e.target.value })} />
              <TextField label="Unit price" type="number" required fullWidth value={orderForm.unitPrice} onChange={(e) => setOrderForm({ ...orderForm, unitPrice: e.target.value })} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Order Total: <strong>{(Number(orderForm.quantity || 0) * Number(orderForm.unitPrice || 0)).toLocaleString()}</strong>
            </Typography>
            <TextField label="Notes" value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setOrderOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Create Order</Button></DialogActions>
        </Box>
      </Dialog>

      {/* Generate Invoice Dialog */}
      <Dialog open={!!invTarget} onClose={() => setInvTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => { e.preventDefault(); createInvoice.mutate(); }} noValidate>
          <DialogTitle>Issue Invoice — {invTarget?.orderNumber}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <Typography variant="body2">Amount: <strong>{invTarget?.totalAmount.toLocaleString()}</strong></Typography>
            <TextField label="Payment due date" type="date" value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </DialogContent>
          <DialogActions><Button onClick={() => setInvTarget(null)}>Cancel</Button><Button type="submit" variant="contained">Issue Invoice</Button></DialogActions>
        </Box>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={!!payTarget} onClose={() => setPayTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!payForm.amount || Number(payForm.amount) <= 0) { setErr('Amount must be greater than zero.'); return; }
          recordPayment.mutate();
        }} noValidate>
          <DialogTitle>Record Payment — {payTarget?.invoiceNumber}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <TextField label="Amount received" type="number" required value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} sx={{ mt: 1 }} />
            <TextField select label="Payment method" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
              {METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
            <TextField label="Transaction reference (prevents duplicate entry)" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} />
            <TextField label="Payment date" type="date" value={payForm.paidAt} onChange={(e) => setPayForm({ ...payForm, paidAt: e.target.value })} InputLabelProps={{ shrink: true }} />
          </DialogContent>
          <DialogActions><Button onClick={() => setPayTarget(null)}>Cancel</Button><Button type="submit" variant="contained" color="success">Confirm Payment</Button></DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
