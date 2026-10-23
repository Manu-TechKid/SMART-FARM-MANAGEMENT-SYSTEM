import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Button, Card, CardContent, CircularProgress, Grid, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../auth/AuthContext';

const REPORT_TYPES = [
  { id: 'production', label: 'Production Report' },
  { id: 'population', label: 'Animal Population Report' },
  { id: 'mortality', label: 'Mortality Report' },
  { id: 'vaccination', label: 'Vaccination Compliance Report' },
  { id: 'deliveries', label: 'Delivery & Distribution Report' },
  { id: 'inventory', label: 'Inventory & Feed Valuation Report' },
  { id: 'sales', label: 'Sales & Receivables Report' },
  { id: 'expenses', label: 'Expense Breakdown Report' },
  { id: 'profitability', label: 'Profitability & Cash Flow Report' },
];

interface ReportPayload {
  reportType: string;
  title: string;
  columns: string[];
  rows: string[][];
  summary: Record<string, string>;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function ReportsPage() {
  const { farmId } = useAuth();
  const [reportType, setReportType] = useState('production');
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(today());
  const [species, setSpecies] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', farmId, reportType, from, to, species],
    enabled: !!farmId,
    queryFn: async () =>
      (await api.get<ReportPayload>(`/farms/${farmId}/reports/${reportType}`, {
        params: { from, to, species: species || undefined },
      })).data,
  });

  const downloadExport = async (format: 'pdf' | 'excel') => {
    if (!farmId) return;
    setExporting(true);
    try {
      const res = await api.get(`/farms/${farmId}/reports/${reportType}/export`, {
        params: { format, from, to, species: species || undefined },
        responseType: 'blob',
      });
      const ext = format === 'excel' ? 'xls' : 'pdf';
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report-${today()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (!farmId) return <Alert severity="info">Select or create a farm in Farm Settings first.</Alert>;

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Reports & Analytics</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => downloadExport('pdf')} disabled={exporting}>
            Export PDF
          </Button>
          <Button variant="contained" startIcon={<TableViewIcon />} onClick={() => downloadExport('excel')} disabled={exporting}>
            Export Excel
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField select size="small" label="Report Type" value={reportType} onChange={(e) => setReportType(e.target.value)} sx={{ minWidth: 260 }}>
          {REPORT_TYPES.map((r) => <MenuItem key={r.id} value={r.id}>{r.label}</MenuItem>)}
        </TextField>
        <TextField size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField select size="small" label="Species Filter" value={species} onChange={(e) => setSpecies(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">All Species</MenuItem>
          {['Cow', 'Goat', 'Sheep', 'Chicken'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </Stack>

      {isLoading && <CircularProgress />}
      {error && <Alert severity="error">{errorMessage(error)}</Alert>}

      {data && (
        <>
          <Grid container spacing={2}>
            {Object.entries(data.summary).map(([k, v]) => (
              <Grid key={k} size={{ xs: 6, sm: 4, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">{k}</Typography>
                    <Typography variant="h6" fontWeight={700}>{v}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Paper>
            <TableContainer>
              <Table size="small" aria-label={data.title}>
                <TableHead>
                  <TableRow>
                    {data.columns.map((col) => <TableCell key={col}><strong>{col}</strong></TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.length === 0 && (
                    <TableRow><TableCell colSpan={data.columns.length}>No records match the selected filters.</TableCell></TableRow>
                  )}
                  {data.rows.map((row, idx) => (
                    <TableRow key={idx} hover>
                      {row.map((cell, cIdx) => <TableCell key={cIdx}>{cell}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Stack>
  );
}
