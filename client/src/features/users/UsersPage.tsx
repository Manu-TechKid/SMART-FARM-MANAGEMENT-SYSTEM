import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

const ROLES = [
  'FarmManager',
  'LivestockOfficer',
  'VeterinaryOfficer',
  'ProductionOfficer',
  'Storekeeper',
  'DeliveryOfficer',
  'Accountant',
  'Viewer',
];

interface FarmUserRow {
  id: number;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  joinedAt: string;
}

interface AuditLogRow {
  id: number;
  userName: string;
  action: string;
  entityType: string;
  entityId?: number;
  oldValues?: string;
  newValues?: string;
  timestamp: string;
}

export default function UsersPage() {
  const { farmId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ email: '', role: 'LivestockOfficer' });

  // Change Password state
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passBusy, setPassBusy] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  const { data: users } = useQuery({
    queryKey: ['farm-users', farmId],
    enabled: !!farmId,
    queryFn: async () => (await api.get<FarmUserRow[]>(`/farms/${farmId}/users`)).data,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs', farmId],
    enabled: !!farmId,
    queryFn: async () => (await api.get<AuditLogRow[]>(`/farms/${farmId}/audit-logs`)).data,
  });

  const addUser = useMutation({
    mutationFn: () => api.post(`/farms/${farmId}/users`, { email: form.email.trim(), role: form.role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farm-users'] });
      qc.invalidateQueries({ queryKey: ['audit-logs'] });
      setOpen(false);
      setForm({ email: '', role: 'LivestockOfficer' });
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role, isActive }: { id: number; role: string; isActive: boolean }) =>
      api.put(`/farms/${farmId}/users/${id}`, { role, isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farm-users'] });
      qc.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  if (!farmId) return <Alert severity="info">Select or create a farm in Farm Settings first.</Alert>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Users, Roles & Audit Trail</Typography>
        <Stack direction="row" spacing={1.2}>
          <Button
            variant="outlined"
            startIcon={<VpnKeyIcon />}
            onClick={() => {
              setCurPass('');
              setNewPass('');
              setConfirmPass('');
              setPassError('');
              setPassSuccess('');
              setChangePassOpen(true);
            }}
          >
            Change My Password
          </Button>
          <Button variant="contained" onClick={() => { setErr(''); setOpen(true); }}>Add Staff Member</Button>
        </Stack>
      </Stack>

      {err && <Alert severity="error" onClose={() => setErr('')}>{err}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={`Farm Staff & Permissions (${users?.length ?? 0})`} />
        <Tab label={`Security Audit Logs (${auditLogs?.length ?? 0})`} />
      </Tabs>

      {tab === 0 && (
        <Paper>
          <TableContainer>
            <Table size="small" aria-label="Farm users">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell>
                  <TableCell>Status</TableCell><TableCell>Joined</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(!users || users.length === 0) && <TableRow><TableCell colSpan={5}>No staff members found.</TableCell></TableRow>}
                {users?.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell><strong>{u.firstName} {u.lastName}</strong></TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <TextField
                        select size="small" variant="standard" value={u.role}
                        onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value, isActive: u.isActive })}
                      >
                        {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={u.isActive ? 'Active' : 'Suspended'} color={u.isActive ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>{new Date(u.joinedAt).toLocaleDateString()}</TableCell>
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
            <Table size="small" aria-label="Audit logs">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell><TableCell>User</TableCell><TableCell>Action</TableCell>
                  <TableCell>Entity</TableCell><TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(!auditLogs || auditLogs.length === 0) && <TableRow><TableCell colSpan={5}>No audit log entries recorded yet.</TableCell></TableRow>}
                {auditLogs?.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell>{log.userName}</TableCell>
                    <TableCell><Chip size="small" label={log.action} variant="outlined" /></TableCell>
                    <TableCell>{log.entityType} {log.entityId ? `#${log.entityId}` : ''}</TableCell>
                    <TableCell>{log.newValues ?? log.oldValues ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!form.email.trim()) { setErr('Email is required.'); return; }
          addUser.mutate();
        }} noValidate>
          <DialogTitle>Grant Farm Access to Staff User</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <TextField label="Registered User Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} sx={{ mt: 1 }} />
            <TextField select label="Assigned Farm Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
          </DialogContent>
          <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Grant Access</Button></DialogActions>
        </Box>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={changePassOpen}
        onClose={() => !passBusy && setChangePassOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <Box
          component="form"
          onSubmit={async (e) => {
            e.preventDefault();
            setPassError('');
            setPassSuccess('');
            if (!curPass) {
              setPassError('Please enter your current password.');
              return;
            }
            if (newPass.length < 8) {
              setPassError('New password must be at least 8 characters long.');
              return;
            }
            if (newPass !== confirmPass) {
              setPassError('New password and confirm password do not match.');
              return;
            }
            setPassBusy(true);
            try {
              await api.post('/auth/change-password', {
                currentPassword: curPass,
                newPassword: newPass,
              });
              setPassSuccess('Password updated successfully!');
              setTimeout(() => {
                setChangePassOpen(false);
                setCurPass('');
                setNewPass('');
                setConfirmPass('');
              }, 1200);
            } catch (err) {
              setPassError(errorMessage(err));
            } finally {
              setPassBusy(false);
            }
          }}
        >
          <DialogTitle fontWeight={800}>Change Your Password</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {passError && <Alert severity="error">{passError}</Alert>}
            {passSuccess && <Alert severity="success">{passSuccess}</Alert>}
            <TextField
              label="Current Password"
              type="password"
              size="small"
              required
              fullWidth
              value={curPass}
              onChange={(e) => setCurPass(e.target.value)}
              autoFocus
            />
            <TextField
              label="New Password"
              type="password"
              size="small"
              required
              fullWidth
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              helperText="Must be at least 8 characters"
            />
            <TextField
              label="Confirm New Password"
              type="password"
              size="small"
              required
              fullWidth
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setChangePassOpen(false)} disabled={passBusy}>Cancel</Button>
            <Button type="submit" variant="contained" color="success" disabled={passBusy}>
              {passBusy ? 'Updating...' : 'Save New Password'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
