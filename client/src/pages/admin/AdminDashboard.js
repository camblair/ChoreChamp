import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../../context/AuthContext';
import API_ENDPOINTS from '../../constants/apiEndpoints';

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`admin-tabpanel-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const AdminDashboard = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [households, setHouseholds] = useState([]);
  const [users, setUsers] = useState([]);
  const [defaultChores, setDefaultChores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch all households
      const householdsResponse = await fetch(API_ENDPOINTS.HOUSEHOLD.GET_ALL_HOUSEHOLDS, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!householdsResponse.ok) throw new Error('Failed to fetch households');
      const householdsData = await householdsResponse.json();
      setHouseholds(householdsData);

      // Fetch all users
      const usersResponse = await fetch(`${API_ENDPOINTS.AUTH.PROFILE}/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!usersResponse.ok) throw new Error('Failed to fetch users');
      const usersData = await usersResponse.json();
      setUsers(usersData);

      // Fetch default chores
      const choresResponse = await fetch(`${API_ENDPOINTS.CHORES.GET}/defaults`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!choresResponse.ok) throw new Error('Failed to fetch default chores');
      const choresData = await choresResponse.json();
      setDefaultChores(choresData);

    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Households" />
          <Tab label="Users" />
          <Tab label="Default Chores" />
          <Tab label="Statistics" />
        </Tabs>
      </Box>

      {/* Households Tab */}
      <TabPanel value={activeTab} index={0}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Members</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {households.map((household) => (
                <TableRow key={household._id}>
                  <TableCell>{household.name}</TableCell>
                  <TableCell>{household.owner?.username}</TableCell>
                  <TableCell>
                    {household.parents?.length + household.children?.length} members
                  </TableCell>
                  <TableCell>
                    {new Date(household.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Users Tab */}
      <TabPanel value={activeTab} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Household</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role} 
                      color={user.role === 'parent' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.household?.name}</TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Default Chores Tab */}
      <TabPanel value={activeTab} index={2}>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {/* TODO: Add default chore */}}
          >
            Add Default Chore
          </Button>
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Points</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Frequency</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {defaultChores.map((chore) => (
                <TableRow key={chore._id}>
                  <TableCell>{chore.title}</TableCell>
                  <TableCell>{chore.points}</TableCell>
                  <TableCell>{chore.choreType}</TableCell>
                  <TableCell>
                    {chore.recurrence?.frequency || 'One-time'}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Statistics Tab */}
      <TabPanel value={activeTab} index={3}>
        <Typography variant="h6" gutterBottom>
          System Statistics
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h4">{households.length}</Typography>
            <Typography color="text.secondary">Total Households</Typography>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h4">{users.length}</Typography>
            <Typography color="text.secondary">Total Users</Typography>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h4">
              {users.filter(u => u.role === 'parent').length}
            </Typography>
            <Typography color="text.secondary">Parents</Typography>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h4">
              {users.filter(u => u.role === 'child').length}
            </Typography>
            <Typography color="text.secondary">Children</Typography>
          </Paper>
        </Box>
      </TabPanel>
    </Box>
  );
};

export default AdminDashboard; 