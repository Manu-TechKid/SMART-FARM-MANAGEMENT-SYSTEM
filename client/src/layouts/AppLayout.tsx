import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar, Avatar, Box, Button, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  MenuItem, Select, Stack, Toolbar, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PetsIcon from '@mui/icons-material/Pets';
import HiveIcon from '@mui/icons-material/EmojiNature';
import FactoryIcon from '@mui/icons-material/Factory';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory2';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PaymentsIcon from '@mui/icons-material/Payments';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import { useAuth } from '../features/auth/AuthContext';

const WIDTH = 268;
const COLLAPSED = 74;

export const NAV = [
  { label: 'Dashboard', to: '/', icon: <DashboardIcon /> },
  { label: 'Livestock', to: '/livestock', icon: <PetsIcon /> },
  { label: 'Beehives', to: '/beehives', icon: <HiveIcon /> },
  { label: 'Production', to: '/production', icon: <FactoryIcon /> },
  { label: 'Vaccination & Veterinary', to: '/veterinary', icon: <VaccinesIcon /> },
  { label: 'Breeding', to: '/breeding', icon: <FavoriteIcon /> },
  { label: 'Deliveries', to: '/deliveries', icon: <LocalShippingIcon /> },
  { label: 'Inventory & Feed', to: '/inventory', icon: <InventoryIcon /> },
  { label: 'Sales & Customers', to: '/sales', icon: <StorefrontIcon /> },
  { label: 'Expenses & Finance', to: '/finance', icon: <PaymentsIcon /> },
  { label: 'Tasks & Notifications', to: '/tasks', icon: <NotificationsIcon /> },
  { label: 'Reports', to: '/reports', icon: <AssessmentIcon /> },
  { label: 'Users & Permissions', to: '/users', icon: <GroupIcon /> },
  { label: 'Farm Settings', to: '/settings', icon: <SettingsIcon /> },
];

export default function AppLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, farms, farmId, setFarmId, logout } = useAuth();
  const navigate = useNavigate();

  const width = isMobile ? WIDTH : collapsed ? COLLAPSED : WIDTH;
  const showLabels = isMobile || !collapsed;

  const drawer = (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#ffffff' }}
    >
      <Toolbar sx={{ justifyContent: showLabels ? 'space-between' : 'center', py: 1.2, px: 2 }}>
        {showLabels && (
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #1b5e20 0%, #43a047 100%)',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
              }}
            >
              <AgricultureIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={900} sx={{ lineHeight: 1.1, color: '#112617' }}>
                SmartFarm OS
              </Typography>
              <Typography variant="caption" sx={{ color: '#546e5a', fontWeight: 600 }}>
                Farm Management
              </Typography>
            </Box>
          </Stack>
        )}
        {!isMobile && (
          <IconButton onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1, overflowY: 'auto', px: 1, py: 1.5 }}>
        {NAV.map((item) => (
          <Tooltip key={item.to} title={showLabels ? '' : item.label} placement="right">
            <ListItemButton
              component={NavLink}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                py: 1,
                px: 1.5,
                color: '#2c4231',
                '& .MuiListItemIcon-root': { color: '#3b5e42', minWidth: 38 },
                '& .MuiListItemText-primary': { fontWeight: 600, fontSize: '0.92rem' },
                '&:hover': { bgcolor: '#eef6f0' },
                '&.active': {
                  bgcolor: '#1b5e20',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(27, 94, 32, 0.22)',
                  '& .MuiListItemIcon-root': { color: '#ffffff' },
                  '& .MuiListItemText-primary': { fontWeight: 800 },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              {showLabels && <ListItemText primary={item.label} />}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f7f4' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          ml: { md: `${width}px` },
          width: { md: `calc(100% - ${width}px)` },
          bgcolor: '#ffffff',
          borderBottom: '1px solid #e2ebe4',
        }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          {isMobile && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <MenuIcon />
            </IconButton>
          )}
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Chip
              label="Active Farm"
              size="small"
              sx={{ display: { xs: 'none', sm: 'inline-flex' }, bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 800 }}
            />
            <Select
              size="small"
              value={farmId ?? ''}
              displayEmpty
              onChange={(e) => setFarmId(Number(e.target.value))}
              inputProps={{ 'aria-label': 'Select farm' }}
              sx={{
                minWidth: { xs: 180, sm: 250 },
                fontWeight: 700,
                bgcolor: '#f8fbf8',
                borderRadius: 2,
              }}
            >
              {farms.length === 0 && <MenuItem value="" disabled>No farm selected</MenuItem>}
              {farms.map((f) => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
            </Select>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ width: 34, height: 34, bgcolor: '#1b5e20', fontSize: '0.88rem', fontWeight: 800 }}>
              {(user?.firstName?.[0] ?? 'F').toUpperCase()}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1.1, color: '#132a19' }}>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="caption" sx={{ color: '#5b7260' }}>
                {user?.email}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<LogoutIcon fontSize="small" />}
              onClick={() => { logout(); navigate('/login'); }}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                borderColor: '#d0ddd3',
                color: '#2b4230',
                '&:hover': { bgcolor: '#fbe9e7', borderColor: '#d32f2f', color: '#c62828' },
              }}
            >
              Sign out
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: WIDTH } }}>
          {drawer}
        </Drawer>
      ) : (
        <Drawer variant="permanent" sx={{ width, flexShrink: 0, '& .MuiDrawer-paper': { width, boxSizing: 'border-box', overflowX: 'hidden', transition: 'width .2s', borderRight: '1px solid #e2ebe4' } }}>
          {drawer}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3.5 }, mt: 8, minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
