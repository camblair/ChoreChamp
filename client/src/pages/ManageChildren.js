import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useAuth } from '../context/AuthContext';
import API_ENDPOINTS from '../constants/apiEndpoints';

const ManageChildren = () => {
  const { user, token, selectedHousehold } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [households, setHouseholds] = useState([]);

  const [childForm, setChildForm] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    householdId: '',
    phone: ''
  });

  useEffect(() => {
    if (selectedHousehold) {
      fetchChildren();
      fetchHouseholds();
    }
  }, [selectedHousehold]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_ENDPOINTS.AUTH.CHILDREN}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch children');

      const data = await response.json();
      console.log('Fetched children data:', data);
      setChildren(data);
      setError('');
    } catch (err) {
      console.error('Error fetching children:', err);
      setError('Failed to load children. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHouseholds = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.GET_ALL_HOUSEHOLDS, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch households');

      const data = await response.json();
      if (Array.isArray(data)) {
        setHouseholds(data);
      } else {
        console.error('Unexpected households data format:', data);
        setHouseholds([]);
      }
    } catch (err) {
      console.error('Error fetching households:', err);
      setHouseholds([]);
    }
  };

  const handleOpenDialog = (child = null) => {
    if (child) {
      console.log('Opening dialog with child data:', child);
      setSelectedChild(child);
      setChildForm({
        username: child.username || '',
        password: '',
        firstName: child.firstName || '',
        lastName: child.lastName || '',
        email: child.email || '',
        householdId: child.householdId || '',
        phone: child.phone || ''
      });
    } else {
      setSelectedChild(null);
      setChildForm({
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        email: '',
        householdId: '',
        phone: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedChild(null);
    setChildForm({
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      email: '',
      householdId: '',
      phone: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setChildForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHousehold) {
      setError('Please select a household first');
      return;
    }

    try {
      console.log('Submitting child form:', childForm);
      const endpoint = selectedChild
        ? `${API_ENDPOINTS.AUTH.UPDATE_CHILD(selectedChild._id)}`
        : API_ENDPOINTS.AUTH.REGISTER_CHILD;
      
      const method = selectedChild ? 'PATCH' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...childForm,
          role: 'child'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save child');
      }

      const updatedChild = await response.json();
      console.log('Updated child data:', updatedChild);
      setSuccess(selectedChild ? 'Child updated successfully!' : 'Child added successfully!');
      handleCloseDialog();
      fetchChildren(); // Refresh the children list
    } catch (err) {
      console.error('Error saving child:', err);
      setError(err.message || 'Failed to save child. Please try again.');
    }
  };

  const handleDelete = async (childId) => {
    if (!window.confirm('Are you sure you want to remove this child?')) return;

    console.log('Attempting to delete child with ID:', childId);
    console.log('API endpoint:', API_ENDPOINTS.AUTH.DELETE_CHILD(childId));

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.DELETE_CHILD(childId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete child');
      }

      setSuccess('Child removed successfully!');
      fetchChildren();
    } catch (err) {
      console.error('Error deleting child:', err);
      setError(err.message || 'Failed to delete child. Please try again.');
    }
  };

  if (!selectedHousehold) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Please select a household to manage children
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Manage Children
          </Typography>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Child
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {children.length === 0 ? (
          <Alert severity="info">
            No children added yet. Click "Add Child" to get started!
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {children.map((child) => (
              <Grid item xs={12} sm={6} key={child._id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                        {child.username[0].toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" component="div">
                          {child.username}
                        </Typography>
                        {(child.firstName || child.lastName) && (
                          <Typography variant="body2" color="text.secondary">
                            {[child.firstName, child.lastName].filter(Boolean).join(' ')}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {child.email && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {child.email}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`Points: ${child.points || 0}`}
                        color="primary"
                        size="small"
                      />
                      <Chip
                        label={`Completed: ${child.completedChores || 0}`}
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(child)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(child._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedChild ? 'Edit Child' : 'Add Child'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="username"
              label="Username"
              type="text"
              fullWidth
              required
              value={childForm.username}
              onChange={handleInputChange}
            />
            <TextField
              margin="dense"
              name="password"
              label={selectedChild ? 'New Password (leave blank to keep current)' : 'Password'}
              type="password"
              fullWidth
              required={!selectedChild}
              value={childForm.password}
              onChange={handleInputChange}
            />
            <TextField
              margin="dense"
              name="firstName"
              label="First Name"
              type="text"
              fullWidth
              value={childForm.firstName}
              onChange={handleInputChange}
            />
            <TextField
              margin="dense"
              name="lastName"
              label="Last Name"
              type="text"
              fullWidth
              value={childForm.lastName}
              onChange={handleInputChange}
            />
            <TextField
              margin="dense"
              name="email"
              label="Email"
              type="email"
              fullWidth
              value={childForm.email}
              onChange={handleInputChange}
            />
            <TextField
              margin="dense"
              name="phone"
              label="Phone"
              type="text"
              fullWidth
              value={childForm.phone}
              onChange={handleInputChange}
            />
            <TextField
              select
              margin="dense"
              name="householdId"
              label="Household"
              fullWidth
              value={childForm.householdId}
              onChange={handleInputChange}
              SelectProps={{ native: true }}
            >
              <option value="">Select Household</option>
              {households.map((household) => (
                <option key={household._id} value={household._id}>
                  {household.name}
                </option>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {selectedChild ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default ManageChildren;
