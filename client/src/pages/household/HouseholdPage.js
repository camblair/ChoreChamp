import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useAuth } from '../../context/AuthContext';
import API_ENDPOINTS from '../../constants/apiEndpoints';

const HouseholdPage = () => {
  const { user } = useAuth();
  const [household, setHousehold] = useState(null);
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchHousehold = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.GET, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch household');
      }

      const data = await response.json();
      setHousehold(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHousehold();
  }, []);

  const handleCreateHousehold = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: `${user.username}'s Household`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create household');
      }

      const data = await response.json();
      setHousehold(data);
      setSuccess('Household created successfully!');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleInviteParent = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.INVITE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ email: inviteEmail })
      });

      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }

      const data = await response.json();
      setSuccess('Invitation sent successfully!');
      setOpenInviteDialog(false);
      setInviteEmail('');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleRemoveParent = async (userId) => {
    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.REMOVE_PARENT(userId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove parent');
      }

      await fetchHousehold();
      setSuccess('Parent removed successfully!');
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" mt={4}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (!household) {
    return (
      <Container>
        <Box mt={4}>
          <Typography variant="h5" gutterBottom>
            Welcome to ChoreChamp!
          </Typography>
          <Typography paragraph>
            You haven't created a household yet. Create one to start managing chores!
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateHousehold}
          >
            Create Household
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container>
      <Box mt={4}>
        <Typography variant="h4" gutterBottom>
          {household.name}
        </Typography>

        <Paper sx={{ mt: 3, p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Parents</Typography>
            <Button
              startIcon={<PersonAddIcon />}
              onClick={() => setOpenInviteDialog(true)}
            >
              Invite Co-Parent
            </Button>
          </Box>

          <List>
            {household.parents.map((parent) => (
              <ListItem key={parent.user._id}>
                <ListItemText
                  primary={parent.user.username}
                  secondary={`${parent.role} • ${parent.user.email}`}
                />
                {household.createdBy._id === user._id && 
                 parent.user._id !== user._id && (
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveParent(parent.user._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </List>
        </Paper>

        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Children
          </Typography>
          <List>
            {household.children.map((child) => (
              <ListItem key={child._id}>
                <ListItemText
                  primary={child.firstName || child.username}
                  secondary={child.username}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>

      {/* Invite Co-Parent Dialog */}
      <Dialog open={openInviteDialog} onClose={() => setOpenInviteDialog(false)}>
        <DialogTitle>Invite Co-Parent</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInviteDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleInviteParent} color="primary">
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default HouseholdPage;
