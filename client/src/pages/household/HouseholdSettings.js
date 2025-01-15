import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import API_ENDPOINTS from '../../constants/apiEndpoints';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EmailIcon from '@mui/icons-material/Email';

const HouseholdSettings = () => {
  const { user, token, updateUser } = useAuth();
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Household form state
  const [householdForm, setHouseholdForm] = useState({
    name: ''
  });

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Add children dialog state
  const [addChildrenDialogOpen, setAddChildrenDialogOpen] = useState(false);
  const [availableChildren, setAvailableChildren] = useState([]);
  const [selectedChildren, setSelectedChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(false);

  useEffect(() => {
    fetchHousehold();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({
        ...prev,
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    if (household) {
      setHouseholdForm({
        name: household.name || ''
      });
    }
  }, [household]);

  const fetchHousehold = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.GET, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch household');
      
      const data = await response.json();
      setHousehold(data);
    } catch (err) {
      setError('Failed to load household details');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleHouseholdChange = (e) => {
    const { name, value } = e.target;
    setHouseholdForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate passwords if attempting to change
    if (profileForm.newPassword || profileForm.confirmPassword) {
      if (!profileForm.currentPassword) {
        setError('Current password is required to change password');
        return;
      }
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        setError('New passwords do not match');
        return;
      }
    }

    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.UPDATE_PROFILE, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: profileForm.username,
          email: profileForm.email,
          phone: profileForm.phone,
          currentPassword: profileForm.currentPassword,
          newPassword: profileForm.newPassword
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      updateUser(updatedUser);
      setSuccess('Profile updated successfully');
      
      // Clear password fields
      setProfileForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateHousehold = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.UPDATE, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(householdForm)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update household');
      }

      const updatedHousehold = await response.json();
      setHousehold(updatedHousehold);
      setSuccess('Household updated successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInviteParent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setInviteLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.INVITE_PARENT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invitation');
      }

      setSuccess('Invitation sent successfully');
      setInviteEmail('');
      setInviteDialogOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const fetchAvailableChildren = async () => {
    setChildrenLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.GET_AVAILABLE_CHILDREN, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch available children');

      const data = await response.json();
      setAvailableChildren(data);
    } catch (err) {
      setError('Failed to load available children');
    } finally {
      setChildrenLoading(false);
    }
  };

  const handleAddChildren = async () => {
    if (!selectedChildren.length) return;

    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.ADD_CHILDREN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ childrenIds: selectedChildren })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add children');
      }

      const updatedHousehold = await response.json();
      setHousehold(updatedHousehold);
      setSuccess('Children added successfully');
      setAddChildrenDialogOpen(false);
      setSelectedChildren([]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveChild = async (childId) => {
    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.REMOVE_CHILD(childId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove child');
      }

      const updatedHousehold = await response.json();
      setHousehold(updatedHousehold);
      setSuccess('Child removed successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveParent = async (parentId) => {
    try {
      const response = await fetch(API_ENDPOINTS.HOUSEHOLD.REMOVE_PARENT(parentId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove parent');
      }

      const updatedHousehold = await response.json();
      setHousehold(updatedHousehold);
      setSuccess('Parent removed successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Household Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Household Settings
              </Typography>
              <form onSubmit={handleUpdateHousehold}>
                <TextField
                  fullWidth
                  label="Household Name"
                  name="name"
                  value={householdForm.name}
                  onChange={handleHouseholdChange}
                  margin="normal"
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                >
                  Update Household
                </Button>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Household Members */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Household Members
                </Typography>
                <Box>
                  <Button
                    startIcon={<PersonAddIcon />}
                    onClick={() => {
                      fetchAvailableChildren();
                      setAddChildrenDialogOpen(true);
                    }}
                    sx={{ mr: 1 }}
                  >
                    Add Children
                  </Button>
                  <Button
                    startIcon={<EmailIcon />}
                    onClick={() => setInviteDialogOpen(true)}
                  >
                    Invite Parent
                  </Button>
                </Box>
              </Box>

              {/* Parents List */}
              <Typography variant="subtitle1" gutterBottom>
                Parents
              </Typography>
              <List>
                {household?.parents.map((parent) => (
                  <ListItem key={parent.user._id}>
                    <ListItemText
                      primary={parent.user.username}
                      secondary={parent.user.email}
                    />
                    <Chip
                      label={parent.role}
                      color={parent.role === 'owner' ? 'primary' : 'default'}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    {parent.role !== 'owner' && (
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

              <Divider sx={{ my: 2 }} />

              {/* Children List */}
              <Typography variant="subtitle1" gutterBottom>
                Children
              </Typography>
              <List>
                {household?.children.map((child) => (
                  <ListItem key={child._id}>
                    <ListItemText
                      primary={child.username}
                      secondary={`${child.firstName || ''}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveChild(child._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Profile Settings
              </Typography>
              <form onSubmit={handleUpdateProfile}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={profileForm.username}
                  onChange={handleProfileChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={profileForm.email}
                  onChange={handleProfileChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={profileForm.phone}
                  onChange={handleProfileChange}
                  margin="normal"
                />

                <Divider sx={{ my: 3 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  Change Password
                </Typography>
                <TextField
                  fullWidth
                  label="Current Password"
                  name="currentPassword"
                  type="password"
                  value={profileForm.currentPassword}
                  onChange={handleProfileChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={profileForm.newPassword}
                  onChange={handleProfileChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  value={profileForm.confirmPassword}
                  onChange={handleProfileChange}
                  margin="normal"
                />
                
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                >
                  Update Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Invite Parent Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)}>
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
          <Button onClick={() => setInviteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleInviteParent}
            disabled={inviteLoading || !inviteEmail}
          >
            {inviteLoading ? <CircularProgress size={24} /> : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Children Dialog */}
      <Dialog
        open={addChildrenDialogOpen}
        onClose={() => setAddChildrenDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Children to Household</DialogTitle>
        <DialogContent>
          {childrenLoading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress />
            </Box>
          ) : availableChildren.length === 0 ? (
            <Typography color="textSecondary">
              No available children to add
            </Typography>
          ) : (
            <List>
              {availableChildren.map((child) => (
                <ListItem
                  key={child._id}
                  button
                  onClick={() => {
                    setSelectedChildren(prev =>
                      prev.includes(child._id)
                        ? prev.filter(id => id !== child._id)
                        : [...prev, child._id]
                    );
                  }}
                  selected={selectedChildren.includes(child._id)}
                >
                  <ListItemText
                    primary={child.username}
                    secondary={`${child.firstName} ${child.lastName}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddChildrenDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddChildren}
            disabled={childrenLoading || selectedChildren.length === 0}
            color="primary"
          >
            Add Selected Children
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HouseholdSettings;
