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

interface Customer { id: number; name: string; contactPerson?: string; phone?: string; email?: string; address?: string; outstandingBalance: number; }
interface OrderRow { id: number; orderNumber: string; orderDate: string; status: string; totalAmount: number; customerName?: string; }
interface InvoiceRow { id: number; invoiceNumber: string; invoiceDate: string; dueDate: string; amount: number; paidAmount: number; status: string; customerName?: string; }
interface BatchRow { id: number; productType: string; batchCode: string; availableQuantity: number; unit: string; }

const PRODUCTS = ['Milk', 'Eggs', 'Honey', 'Beeswax', 'Wool', 'Meat'];
const today = () => new Date().toISOString().slice(0, 10);

export default function SalesPage() {
  const { farmId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [custOpen, setCustOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [invTarget, setInvTarget] = useState<OrderRow | null>(null);
  const [payTarget, setPayTarget] = useState<InvoiceRow | null>(null);
  const [err, setErr] = useState('');

  // Customer Edit & Delete states
  const [editCustTarget, setEditCustTarget] = useState<Customer | null>(null);
  const [editCustForm, setEditCustForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '' });
  const [deleteCustTarget, setDeleteCustTarget] = useState<Customer | null>(null);

  const [custForm, setCustForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '' });
  const [orderForm, setOrderForm] = useState({ customerId: '', orderDate: today(), productType: 'Milk', batchId: '', quantity: '10', unit: 'L', unitPrice: '60', notes: '' });
  const [invDueDate, setInvDueDate] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [payForm, setPayForm] = useState({ amount: '', method: 'M-Pesa', reference: '', notes: '' });

  const { data: customers } = useQuery({
    queryKey: ['customers', farmId],
    enabled: !!farmId,
    queryFn: async () => (await api.get<Customer[]>(`/farms/${farmId}/customers`)).data,
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

  const { data: batches } = useQuery({
    queryKey: ['production-batches', farmId],
    enabled: !!farmId && orderOpen,
    queryFn: async () => (await api.get<BatchRow[]>(`/farms/${farmId}/production/batches`)).data,
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
    onSuccess: () => { refresh(); setCustOpen(false); setCustForm({ name: '', contactPerson: '', phone: '', email: '', address: '' }); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const updateCust = useMutation({
    mutationFn: () => api.put(`/farms/${farmId}/customers/${editCustTarget!.id}`, editCustForm),
    onSuccess: () => { refresh(); setEditCustTarget(null); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const deleteCust = useMutation({
    mutationFn: () => api.delete(`/farms/${farmId}/customers/${deleteCustTarget!.id}`),
    onSuccess: () => { refresh(); setDeleteCustTarget(null); },
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
            batchId: orderForm.batchId ? Number(orderForm.batchId) : null,
            quantity: Number(orderForm.quantity),
            unit: orderForm.unit,
            unitPrice: Number(orderForm.unitPrice),
          },
        ],
      }),
    onSuccess: () => { refresh(); setOrderOpen(false); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const issueInvoice = useMutation({
    mutationFn: () =>
      api.post(`/farms/${farmId}/invoices`, {
        salesOrderId: invTarget!.id,
        dueDate: invDueDate,
      }),
    onSuccess: () => { refresh(); setInvTarget(null); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const recordPayment = useMutation({
    mutationFn: () =>
      api.post(`/farms/${farmId}/invoices/${payTarget!.id}/payments`, {
        amount: Number(payForm.amount),
        method: payForm.method,
        reference: payForm.reference || null,
        paidAt: today(),
        notes: payForm.notes || null,
      }),
    onSuccess: () => { refresh(); setPayTarget(null); setPayForm({ amount: '', method: 'M-Pesa', reference: '', notes: '' }); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const openEditCust = (c: Customer) => {
    setEditCustTarget(c);
    setEditCustForm({
      name: c.name,
      contactPerson: c.contactPerson ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
    });
    setErr('');
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Sales, Invoicing & Receivables</Typography>
          <Typography variant="body2" color="text.secondary">
            Process customer orders, bill against batches, track outstanding receivables, and record verified payments.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          {tab === 0 && (
            <Button variant="contained" color="success" onClick={() => { setErr(''); setOrderOpen(true); }} sx={{ fontWeight: 700 }}>
              + Create Sales Order
            </Button>
          )}
          {tab === 2 && (
            <Button variant="contained" color="success" onClick={() => { setErr(''); setCustOpen(true); }} sx={{ fontWeight: 700 }}>
              + Register Customer
            </Button>
          )}
        </Stack>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={`Sales Orders (${ordersData?.totalCount ?? 0})`} />
        <Tab label={`Invoices & Payments (${invoices?.length ?? 0})`} />
        <Tab label={`Customers (${customers?.length ?? 0})`} />
      </Tabs>

      {err && <Alert severity="error" onClose={() => setErr('')}>{err}</Alert>}

      {/* Tab 0: Sales Orders */}
      {tab === 0 && (
        <Paper>
          <TableContainer>
            <Table size="small" aria-label="Sales orders">
              <TableHead>
                <TableRow>
                  <TableCell>Order No</TableCell><TableCell>Date</TableCell><TableCell>Customer</TableCell>
                  <TableCell align="right">Total Amount (KES)</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ordersData?.items.length === 0 && <TableRow><TableCell colSpan={6}>No sales orders yet.</TableCell></TableRow>}
                {ordersData?.items.map((o) => (
                  <TableRow key={o.id} hover>
                    <TableCell><strong>{o.orderNumber}</strong></TableCell>
                    <TableCell>{new Date(o.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>{o.customerName ?? '—'}</TableCell>
                    <TableCell align="right"><strong>{o.totalAmount.toLocaleString()}</strong></TableCell>
                    <TableCell><Chip size="small" label={o.status} color={o.status === 'Confirmed' ? 'success' : 'warning'} /></TableCell>
                    <TableCell align="right">
                      {o.status === 'Pending' && (
                        <Button size="small" variant="contained" color="primary" sx={{ py: 0.25, px: 1, textTransform: 'none' }} onClick={() => setInvTarget(o)}>
                          Generate Invoice
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Tab 1: Invoices */}
      {tab === 1 && (
        <Paper>
          <TableContainer>
            <Table size="small" aria-label="Invoices">
              <TableHead>
                <TableRow>
                  <TableCell>Invoice No</TableCell><TableCell>Customer</TableCell><TableCell>Due Date</TableCell>
                  <TableCell align="right">Amount (KES)</TableCell><TableCell align="right">Paid (KES)</TableCell>
                  <TableCell align="right">Balance (KES)</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
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
                          <Button size="small" variant="outlined" color="success" sx={{ py: 0.25, px: 1, textTransform: 'none' }} onClick={() => {
                            setPayTarget(inv);
                            setPayForm({ amount: String(bal), method: 'M-Pesa', reference: '', notes: '' });
                          }}>
                            Receive Payment
                          </Button>
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

      {/* Tab 2: Customers */}
      {tab === 2 && (
        <Paper>
          <TableContainer>
            <Table size="small" aria-label="Customers">
              <TableHead>
                <TableRow>
                  <TableCell>Customer Name</TableCell><TableCell>Contact Person</TableCell>
                  <TableCell>Phone</TableCell><TableCell>Email</TableCell><TableCell align="right">Outstanding Balance (KES)</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(!customers || customers.length === 0) && <TableRow><TableCell colSpan={6}>No customers registered.</TableCell></TableRow>}
                {customers?.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell><strong>{c.name}</strong></TableCell>
                    <TableCell>{c.contactPerson ?? '—'}</TableCell>
                    <TableCell>{c.phone ?? '—'}</TableCell>
                    <TableCell>{c.email ?? '—'}</TableCell>
                    <TableCell align="right"><strong>{c.outstandingBalance.toLocaleString()}</strong></TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                        <Tooltip title="Edit Customer">
                          <IconButton size="small" color="primary" onClick={() => openEditCust(c)}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Customer">
                          <IconButton size="small" color="error" onClick={() => setDeleteCustTarget(c)}>
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

      {/* Add Customer Dialog */}
      <Dialog open={custOpen} onClose={() => setCustOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!custForm.name.trim()) { setErr('Customer name is required.'); return; }
          createCust.mutate();
        }} noValidate>
          <DialogTitle fontWeight={700}>Register Customer</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField label="Customer / Company Name" required value={custForm.name} onChange={(e) => setCustForm({ ...custForm, name: e.target.value })} sx={{ mt: 1 }} />
            <TextField label="Contact Person" value={custForm.contactPerson} onChange={(e) => setCustForm({ ...custForm, contactPerson: e.target.value })} />
            <TextField label="Phone Number" value={custForm.phone} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} />
            <TextField label="Email" type="email" value={custForm.email} onChange={(e) => setCustForm({ ...custForm, email: e.target.value })} />
            <TextField label="Physical / Delivery Address" value={custForm.address} onChange={(e) => setCustForm({ ...custForm, address: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCustOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Save Customer</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={!!editCustTarget} onClose={() => setEditCustTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!editCustForm.name.trim()) { setErr('Customer name is required.'); return; }
          updateCust.mutate();
        }} noValidate>
          <DialogTitle fontWeight={700}>Edit Customer — {editCustTarget?.name}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField label="Customer / Company Name" required value={editCustForm.name} onChange={(e) => setEditCustForm({ ...editCustForm, name: e.target.value })} sx={{ mt: 1 }} />
            <TextField label="Contact Person" value={editCustForm.contactPerson} onChange={(e) => setEditCustForm({ ...editCustForm, contactPerson: e.target.value })} />
            <TextField label="Phone Number" value={editCustForm.phone} onChange={(e) => setEditCustForm({ ...editCustForm, phone: e.target.value })} />
            <TextField label="Email" type="email" value={editCustForm.email} onChange={(e) => setEditCustForm({ ...editCustForm, email: e.target.value })} />
            <TextField label="Physical / Delivery Address" value={editCustForm.address} onChange={(e) => setEditCustForm({ ...editCustForm, address: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditCustTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Save Changes</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Customer Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteCustTarget}
        title={`Delete Customer ${deleteCustTarget?.name}?`}
        message={`Are you sure you want to deactivate customer "${deleteCustTarget?.name}"?`}
        confirmLabel="Delete"
        busy={deleteCust.isPending}
        onConfirm={() => deleteCust.mutate()}
        onCancel={() => setDeleteCustTarget(null)}
      />

      {/* Create Order Dialog */}
      <Dialog open={orderOpen} onClose={() => setOrderOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!orderForm.customerId) { setErr('Select a customer.'); return; }
          createOrder.mutate();
        }}>
          <DialogTitle fontWeight={700}>Create Sales Order</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <TextField select label="Customer" required fullWidth value={orderForm.customerId} onChange={(e) => setOrderForm({ ...orderForm, customerId: e.target.value })}>
                {customers?.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
              <TextField label="Order Date" type="date" InputLabelProps={{ shrink: true }} value={orderForm.orderDate} onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })} fullWidth />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField select label="Product" fullWidth value={orderForm.productType} onChange={(e) => setOrderForm({ ...orderForm, productType: e.target.value })}>
                {PRODUCTS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
              <TextField select label="Deduct from Batch (optional)" fullWidth value={orderForm.batchId} onChange={(e) => setOrderForm({ ...orderForm, batchId: e.target.value })}>
                <MenuItem value="">Unassigned Batch</MenuItem>
                {batches?.filter((b) => b.productType === orderForm.productType).map((b) => (
                  <MenuItem key={b.id} value={b.id}>{b.batchCode} ({b.availableQuantity} {b.unit} available)</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField label="Quantity" type="number" required value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} fullWidth />
              <TextField label="Unit Price (KES)" type="number" required value={orderForm.unitPrice} onChange={(e) => setOrderForm({ ...orderForm, unitPrice: e.target.value })} fullWidth />
            </Stack>

            <TextField label="Notes / Delivery instructions" multiline rows={2} value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOrderOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Create Order</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Issue Invoice Dialog */}
      <Dialog open={!!invTarget} onClose={() => setInvTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => { e.preventDefault(); issueInvoice.mutate(); }}>
          <DialogTitle fontWeight={700}>Issue Invoice for {invTarget?.orderNumber}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Amount: <strong>KES {invTarget?.totalAmount.toLocaleString()}</strong> for customer <strong>{invTarget?.customerName}</strong>.
            </Typography>
            <TextField label="Payment Due Date" type="date" InputLabelProps={{ shrink: true }} value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)} fullWidth />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setInvTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Issue Invoice</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={!!payTarget} onClose={() => setPayTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => { e.preventDefault(); recordPayment.mutate(); }}>
          <DialogTitle fontWeight={700}>Receive Payment — {payTarget?.invoiceNumber}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Total Invoiced: <strong>KES {payTarget?.amount.toLocaleString()}</strong> (Paid so far: KES {payTarget?.paidAmount.toLocaleString()})
            </Typography>
            <TextField label="Payment Amount (KES)" type="number" required value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} sx={{ mt: 1 }} />
            <TextField select label="Payment Method" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
              {['M-Pesa', 'Bank Transfer', 'Cash', 'Cheque'].map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
            <TextField label="Reference / M-Pesa Code" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} />
            <TextField label="Notes" multiline rows={2} value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">Confirm Payment</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
