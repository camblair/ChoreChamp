import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondary,
  IconButton,
  Divider,
  Chip,
  Avatar
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../context/AuthContext';
import API_ENDPOINTS from '../constants/apiEndpoints';

const Household = () => {
  const { user, token, selectedHousehold } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [householdData, setHouseholdData] = useState(null);
  const [availableChildren, setAvailableChildren] = useState([]);
  const [addChildrenDialogOpen, setAddChildrenDialogOpen] = useState(false);

  useEffect(() => {
    if (selectedHousehold) {
      fetchHouseholdData();
      fetchAvailableChildren();
      fetchHouseholdChildren();
    }
  }, [selectedHousehold]);

  const fetchHouseholdData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_ENDPOINTS.HOUSEHOLD.GET}?householdId=${selectedHousehold}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch household data');
      }

      const data = await response.json();
      setHouseholdData(data);
      setError('');
    } catch (err) {
      console.error('Error fetching household data:', err);
      setError(err.message || 'Failed to load household data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableChildren = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.GET_AVAILABLE_CHILDREN, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch available children');
      }

      const data = await response.json();
      setAvailableChildren(data);
    } catch (err) {
      console.error('Error fetching available children:', err);
    }
  };

  const fetchHouseholdChildren = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.HOUSEHOLD.GET_CHILDREN}?householdId=${selectedHousehold}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch children in household');
      }

      const children = await response.json();
      setHouseholdData((prevData) => ({
        ...prevData,
        children
      }));
    } catch (err) {
      console.error('Error fetching children in household:', err);
    }
  };

  const handleAddChildren = async (childIds) => {
    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.ADD_CHILDREN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          childrenIds: childIds
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add children to household');
      }

      setSuccess('Children added to household successfully!');
      fetchHouseholdData();
      fetchAvailableChildren();
    } catch (err) {
      console.error('Error adding children to household:', err);
      setError(err.message || 'Failed to add children to household. Please try again.');
    }
  };

  const handleRemoveChild = async (childId) => {
    if (!window.confirm('Are you sure you want to remove this child from the household?')) return;

    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.REMOVE_CHILD(childId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove child from household');
      }

      setSuccess('Child removed from household successfully!');
      fetchHouseholdData();
      fetchAvailableChildren();
    } catch (err) {
      console.error('Error removing child from household:', err);
      setError(err.message || 'Failed to remove child from household. Please try again.');
    }
  };

  const renderChildren = () => {
    if (!householdData?.children?.length) {
      return (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No children in this household yet.
        </Typography>
      );
    }

    return (
      <List>
        {householdData.children.map((child) => (
          <ListItem
            key={child._id}
            secondaryAction={
              <IconButton
                edge="end"
                aria-label="remove"
                onClick={() => handleRemoveChild(child._id)}
              >
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemText
              primary={`${child.firstName} ${child.lastName || ''}`}
              secondary={child.username}
            />
            <Chip
              label={`${child.points || 0} points`}
              color="primary"
              size="small"
              sx={{ mr: 2 }}
            />
          </ListItem>
        ))}
      </List>
    );
  };

  if (!selectedHousehold) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Please select a household to view details
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
        <Typography variant="h4" component="h1" gutterBottom>
          {householdData?.name || 'Household Details'}
        </Typography>

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

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Children
            </Typography>
            {renderChildren()}
          </CardContent>
          <CardActions>
            <Button
              startIcon={<PersonAddIcon />}
              onClick={() => setAddChildrenDialogOpen(true)}
            >
              Add Children
            </Button>
          </CardActions>
        </Card>
      </Box>

      <Dialog
        open={addChildrenDialogOpen}
        onClose={() => setAddChildrenDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Children to Household</DialogTitle>
        <DialogContent>
          <List>
            {availableChildren.map((child) => (
              <ListItem key={child._id}>
                <ListItemText
                  primary={`${child.firstName} ${child.lastName || ''}`}
                  secondary={child.username}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleAddChildren([child._id])}
                >
                  Add
                </Button>
              </ListItem>
            ))}
            {availableChildren.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="No available children"
                  secondary="Create new children in the Manage Children page"
                />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddChildrenDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Household;
