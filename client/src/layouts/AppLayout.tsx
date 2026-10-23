import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  MenuItem, Select, Toolbar, Tooltip, Typography, useMediaQuery, useTheme,
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
import { useAuth } from '../features/auth/AuthContext';

const WIDTH = 248;
const COLLAPSED = 68;

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
    <Box component="nav" aria-label="Main navigation" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ justifyContent: showLabels ? 'space-between' : 'center' }}>
        {showLabels && <Typography variant="h6" fontWeight={700} color="primary">🌾 Smart Farm</Typography>}
        {!isMobile && (
          <IconButton onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {NAV.map((item) => (
          <Tooltip key={item.to} title={showLabels ? '' : item.label} placement="right">
            <ListItemButton
              component={NavLink}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              sx={{ '&.active': { bgcolor: 'primary.light', color: 'primary.contrastText', '& .MuiListItemIcon-root': { color: 'inherit' } } }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              {showLabels && <ListItemText primary={item.label} />}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" color="inherit" elevation={1} sx={{ ml: { md: `${width}px` }, width: { md: `calc(100% - ${width}px)` } }}>
        <Toolbar>
          {isMobile && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open navigation" sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Select
            size="small"
            value={farmId ?? ''}
            displayEmpty
            onChange={(e) => setFarmId(Number(e.target.value))}
            inputProps={{ 'aria-label': 'Select farm' }}
            sx={{ minWidth: 200 }}
          >
            {farms.length === 0 && <MenuItem value="" disabled>No farm</MenuItem>}
            {farms.map((f) => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
          </Select>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Tooltip title="Sign out">
            <IconButton onClick={() => { logout(); navigate('/login'); }} aria-label="Sign out"><LogoutIcon /></IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: WIDTH } }}>
          {drawer}
        </Drawer>
      ) : (
        <Drawer variant="permanent" sx={{ width, flexShrink: 0, '& .MuiDrawer-paper': { width, boxSizing: 'border-box', overflowX: 'hidden', transition: 'width .2s' } }}>
          {drawer}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, mt: 8, minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
