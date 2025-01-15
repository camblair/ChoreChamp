import React, { useState, useEffect } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Container,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Menu,
  Divider,
  ListItemIcon,
  ListItemText,
  Avatar,
  Tooltip,
  Switch
} from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import API_ENDPOINTS from '../constants/apiEndpoints';
import NotificationsCenter from './NotificationsCenter';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';

const Layout = ({ children }) => {
  const { user, logout, token, selectedHousehold, setSelectedHousehold } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [households, setHouseholds] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chores, setChores] = useState([]);
  const [snoozedChores, setSnoozedChores] = useState(new Map());
  const [isSuperUser, setIsSuperUser] = useState(false);

  useEffect(() => {
    const loadSelectedHousehold = async () => {
      if (user?.role === 'parent') {
        await fetchHouseholds();
      }
    };
    loadSelectedHousehold();
  }, [user]);

  useEffect(() => {
    const fetchChores = async () => {
      if (!selectedHousehold) return;
      
      try {
        const response = await fetch(API_ENDPOINTS.CHORES.GET(selectedHousehold), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch chores');
        }
        
        const data = await response.json();
        setChores(data);
      } catch (error) {
        console.error('Error fetching chores:', error);
      }
    };

    fetchChores();
  }, [selectedHousehold, token]);

  const handleCompleteChore = async (chore) => {
    try {
      const response = await fetch(API_ENDPOINTS.CHORES.COMPLETE(chore._id), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to complete chore');
      }

      setChores(prevChores => prevChores.map(c => 
        c._id === chore._id 
          ? { ...c, completed: true }
          : c
      ));
    } catch (error) {
      console.error('Error completing chore:', error);
    }
  };

  const handleSnoozeChore = (chore) => {
    const snoozeUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    setSnoozedChores(prev => new Map(prev).set(chore._id, snoozeUntil));
  };

  const fetchHouseholds = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.GET, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch households:', errorText);
        throw new Error('Failed to fetch households');
      }

      const data = await response.json();
      console.log('Fetched households:', data);
      
      const householdsList = Array.isArray(data) ? data : [data];
      setHouseholds(householdsList);
      
      // If there's only one household or if none is selected, select the first one
      if (householdsList.length > 0 && (!selectedHousehold || !householdsList.find(h => h._id === selectedHousehold))) {
        setSelectedHousehold(householdsList[0]._id);
      }
    } catch (err) {
      console.error('Failed to load households:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHouseholdChange = (event) => {
    const householdId = event.target.value;
    setSelectedHousehold(householdId);
    
    // Refresh the current page to update data for the new household
    if (location.pathname !== '/') {
      window.location.reload();
    }
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    navigate('/login');
  };

  const handleSuperUserToggle = () => {
    setIsSuperUser(prev => !prev);
    // You might want to store this in localStorage or similar
    localStorage.setItem('isSuperUserMode', (!isSuperUser).toString());
  };

  // Load super user state on mount
  useEffect(() => {
    const savedSuperUserMode = localStorage.getItem('isSuperUserMode') === 'true';
    setIsSuperUser(savedSuperUserMode);
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{ 
              flexGrow: 0, 
              cursor: 'pointer', 
              mr: 4,
              display: 'flex',
              alignItems: 'center'
            }}
            onClick={() => navigate('/')}
          >
            ChoreChamp
          </Typography>

          {user && user.role === 'parent' && !loading && (
            <FormControl 
              sx={{ 
                minWidth: 200, 
                mr: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 1,
                '& .MuiSelect-select': {
                  color: 'white',
                },
                '& .MuiSvgIcon-root': {
                  color: 'white',
                }
              }}
              size="small"
            >
              <Select
                value={selectedHousehold}
                onChange={handleHouseholdChange}
                displayEmpty
                sx={{ color: 'white' }}
              >
                <MenuItem disabled value="">
                  Select Household
                </MenuItem>
                {households.map((household) => (
                  <MenuItem key={household._id} value={household._id}>
                    {household.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
            {user && user.role === 'parent' && (
              <>
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/chores"
                  startIcon={<AssignmentIcon />}
                >
                  Chores
                </Button>
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/family"
                  startIcon={<PeopleIcon />}
                >
                  Family
                </Button>
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/household"
                  startIcon={<HomeIcon />}
                >
                  Household
                </Button>
              </>
            )}
          </Box>

          {user ? (
            <>
              <NotificationsCenter 
                chores={chores.filter(chore => {
                  const snoozedUntil = snoozedChores.get(chore._id);
                  return !snoozedUntil || Date.now() > snoozedUntil;
                })}
                handleComplete={handleCompleteChore}
                handleSnooze={handleSnoozeChore}
              />
              <Tooltip title="Account settings">
                <IconButton
                  onClick={handleProfileMenuOpen}
                  size="small"
                  sx={{ ml: 2 }}
                  aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                    {user.username[0].toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={Boolean(anchorEl)}
                onClose={handleProfileMenuClose}
                onClick={handleProfileMenuClose}
                PaperProps={{
                  elevation: 0,
                  sx: {
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                    mt: 1.5,
                    '& .MuiAvatar-root': {
                      width: 32,
                      height: 32,
                      ml: -0.5,
                      mr: 1,
                    },
                  },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                {user?.email === 'dadblair@gmail.com' && (
                  <>
                    <MenuItem>
                      <ListItemIcon>
                        {isSuperUser ? <AdminPanelSettingsIcon fontSize="small" /> : <SupervisorAccountIcon fontSize="small" />}
                      </ListItemIcon>
                      <ListItemText>Super User Mode</ListItemText>
                      <Switch
                        edge="end"
                        checked={isSuperUser}
                        onChange={handleSuperUserToggle}
                        inputProps={{
                          'aria-labelledby': 'super-user-toggle',
                        }}
                      />
                    </MenuItem>
                    {isSuperUser && (
                      <MenuItem onClick={() => navigate('/admin')}>
                        <ListItemIcon>
                          <AdminPanelSettingsIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Admin Dashboard</ListItemText>
                      </MenuItem>
                    )}
                    <Divider />
                  </>
                )}
                <MenuItem onClick={() => navigate('/family')}>
                  <ListItemIcon>
                    <AccountCircleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Profile Settings</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => navigate('/household/settings')}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Household Settings</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">
                Login
              </Button>
              <Button color="inherit" component={RouterLink} to="/register">
                Register
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container component="main" sx={{ flex: 1, py: 4 }}>
        {children}
      </Container>

      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[200]
              : theme.palette.grey[800],
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="body2" color="text.secondary" align="center">
            ChoreChamp {new Date().getFullYear()}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
