import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const TASK_STATUSES = ['Pending', 'InProgress', 'Completed', 'Overdue', 'Cancelled'];
const CATEGORIES = ['Vaccination', 'AnimalCare', 'Breeding', 'Beehives', 'Production', 'Deliveries', 'Inventory', 'Finance', 'General'];
const today = () => new Date().toISOString().slice(0, 10);

interface TaskRow {
  id: number; title: string; description?: string; dueDate?: string; status: string; priority: string; category?: string;
}
interface NotificationRow {
  id: number; type: string; title: string; message: string; isRead: boolean; createdAt: string;
}

export default function TasksPage() {
  const { farmId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ title: '', description: '', dueDate: today(), priority: 'Medium', category: 'General' });

  const { data: tasks } = useQuery({
    queryKey: ['tasks', farmId],
    enabled: !!farmId,
    queryFn: async () => (await api.get<TaskRow[]>(`/farms/${farmId}/tasks`)).data,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications', farmId],
    enabled: !!farmId,
    queryFn: async () => (await api.get<NotificationRow[]>(`/farms/${farmId}/notifications`)).data,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createTask = useMutation({
    mutationFn: () => api.post(`/farms/${farmId}/tasks`, form),
    onSuccess: () => { refresh(); setOpen(false); },
    onError: (e) => setErr(errorMessage(e)),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.put(`/farms/${farmId}/tasks/${id}/status`, { status }),
    onSuccess: refresh,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api.put(`/farms/${farmId}/notifications/${id}/read`),
    onSuccess: refresh,
  });

  const markAllRead = useMutation({
    mutationFn: () => api.put(`/farms/${farmId}/notifications/read-all`),
    onSuccess: refresh,
  });

  const generateReminders = useMutation({
    mutationFn: async () => (await api.post<{ generatedCount: number }>(`/farms/${farmId}/notifications/generate-reminders`)).data,
    onSuccess: (res) => {
      refresh();
      setMsg(`Smart reminder scan completed: ${res.generatedCount} new reminder(s)/alert(s) generated.`);
      setTab(1);
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  if (!farmId) return <Alert severity="info">Select or create a farm in Farm Settings first.</Alert>;

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Tasks, Smart Reminders & Notifications</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => generateReminders.mutate()} disabled={generateReminders.isPending}>
            Run Smart Reminder Scan
          </Button>
          <Button variant="contained" onClick={() => { setErr(''); setOpen(true); }}>Create Task</Button>
        </Stack>
      </Stack>

      {msg && <Alert severity="success" onClose={() => setMsg('')}>{msg}</Alert>}
      {err && <Alert severity="error" onClose={() => setErr('')}>{err}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={`Assigned Tasks (${tasks?.length ?? 0})`} />
        <Tab label={`Alerts & Notifications (${unreadCount} unread)`} />
      </Tabs>

      {tab === 0 && (
        <Paper>
          <TableContainer>
            <Table size="small" aria-label="Farm tasks">
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell><TableCell>Category</TableCell><TableCell>Priority</TableCell>
                  <TableCell>Due Date</TableCell><TableCell>Status</TableCell><TableCell align="right">Update Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(!tasks || tasks.length === 0) && <TableRow><TableCell colSpan={6}>No tasks created yet.</TableCell></TableRow>}
                {tasks?.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell>
                      <strong>{t.title}</strong>
                      {t.description && <Typography variant="caption" display="block" color="text.secondary">{t.description}</Typography>}
                    </TableCell>
                    <TableCell>{t.category ?? 'General'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={t.priority} color={t.priority === 'Critical' || t.priority === 'High' ? 'error' : t.priority === 'Medium' ? 'warning' : 'default'} />
                    </TableCell>
                    <TableCell>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={t.status} color={t.status === 'Completed' ? 'success' : t.status === 'Overdue' ? 'error' : 'info'} />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        select size="small" variant="standard" value={t.status}
                        onChange={(e) => updateStatus.mutate({ id: t.id, status: e.target.value })}
                      >
                        {TASK_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                      </TextField>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {tab === 1 && (
        <Stack spacing={1.5}>
          {unreadCount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button size="small" onClick={() => markAllRead.mutate()}>Acknowledge all ({unreadCount})</Button>
            </Box>
          )}
          <Paper>
            <TableContainer>
              <Table size="small" aria-label="Notifications">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell><TableCell>Title</TableCell><TableCell>Message</TableCell>
                    <TableCell>Created</TableCell><TableCell align="right">Acknowledge</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(!notifications || notifications.length === 0) && <TableRow><TableCell colSpan={5}>No notifications yet. Click &ldquo;Run Smart Reminder Scan&rdquo; to check due tasks.</TableCell></TableRow>}
                  {notifications?.map((n) => (
                    <TableRow key={n.id} hover sx={{ opacity: n.isRead ? 0.6 : 1 }}>
                      <TableCell>
                        <Chip size="small" label={n.type} color={n.type === 'Alert' ? 'error' : n.type === 'Warning' ? 'warning' : 'info'} />
                      </TableCell>
                      <TableCell><strong>{n.title}</strong></TableCell>
                      <TableCell>{n.message}</TableCell>
                      <TableCell>{new Date(n.createdAt).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        {!n.isRead ? (
                          <Button size="small" onClick={() => markRead.mutate(n.id)}>Acknowledge</Button>
                        ) : (
                          <Typography variant="caption" color="text.secondary">Acknowledged</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!form.title.trim()) { setErr('Task title is required.'); return; }
          createTask.mutate();
        }} noValidate>
          <DialogTitle>Assign New Farm Task</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <TextField label="Task title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} sx={{ mt: 1 }} />
            <Stack direction="row" spacing={2}>
              <TextField select label="Category" fullWidth value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField select label="Priority" fullWidth value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Instructions / Notes" multiline minRows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="contained">Save Task</Button></DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
