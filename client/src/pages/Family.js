import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Grid,
  IconButton,
  Chip,
  Divider,
  Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useAuth } from '../context/AuthContext';
import API_ENDPOINTS from '../constants/apiEndpoints';

const Family = () => {
  const { user, token, selectedHousehold, updateCurrentUser } = useAuth();
  const [familyMembers, setFamilyMembers] = useState({ parents: [], children: [] });
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    role: 'child', // default to child when adding new member
  });
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  // Memoize fetchFamilyMembers to prevent unnecessary re-renders
  const fetchFamilyMembers = useCallback(async () => {
    if (!selectedHousehold) {
      console.log('No household selected, skipping family member fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch household data which includes both parents and children
      const householdUrl = API_ENDPOINTS.HOUSEHOLD.GET_BY_ID(selectedHousehold);
      console.log('Fetching household data from:', householdUrl);
      
      const response = await fetch(householdUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch household data');
      }

      const householdData = await response.json();
      console.log('Household data:', householdData);
      
      // Process parents data
      const parents = householdData.parents.map(parent => ({
        ...parent.user,
        firstName: parent.user.firstName || parent.user.username,
        lastName: parent.user.lastName || '',
        role: parent.role
      }));

      // Process children data
      const children = householdData.children.map(child => ({
        ...child,
        firstName: child.firstName || child.username,
        lastName: child.lastName || '',
        role: 'child'
      }));

      setFamilyMembers({
        parents: parents,
        children: children
      });
      setFormError('');
    } catch (error) {
      console.error('Error in fetchFamilyMembers:', error);
      setFormError('Failed to fetch family members. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedHousehold, token]);

  useEffect(() => {
    if (user && token) {
      fetchFamilyMembers();
    }
  }, [fetchFamilyMembers, user, token, selectedHousehold]);

  const handleOpenDialog = (member = null) => {
    if (member) {
      setFormData({
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        username: member.username || '',
        email: member.email || '',
        phone: member.phone || '',
        role: member.role || 'child'
      });
      setEditingMember(member);
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        phone: '',
        role: 'child'
      });
      setEditingMember(null);
    }
    setOpenDialog(true);
    setFormError('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMember(null);
    setFormData({
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      phone: '',
      role: 'child'
    });
    setFormError('');
    setSuccess('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();

    if (!firstName) {
      setFormError('First name is required');
      return false;
    }
    if (!lastName) {
      setFormError('Last name is required');
      return false;
    }

    // Allow letters, spaces, hyphens, apostrophes, and periods
    const nameRegex = /^[a-zA-Z\s\-'.]+$/;
    
    if (!nameRegex.test(firstName)) {
      setFormError('First name can only contain letters, spaces, hyphens, apostrophes, and periods');
      return false;
    }
    
    if (!nameRegex.test(lastName)) {
      setFormError('Last name can only contain letters, spaces, hyphens, apostrophes, and periods');
      return false;
    }

    // Additional validation for new users
    if (!editingMember) {
      if (!formData.username || formData.username.trim() === '') {
        setFormError('Username is required');
        return false;
      }
      // Username can only contain letters, numbers, and underscores
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(formData.username)) {
        setFormError('Username can only contain letters, numbers, and underscores');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    try {
      const endpoint = editingMember
        ? editingMember.role === 'child'
          ? API_ENDPOINTS.AUTH.UPDATE_CHILD(editingMember._id)
          : API_ENDPOINTS.AUTH.UPDATE_PROFILE(editingMember._id)
        : API_ENDPOINTS.AUTH.REGISTER_CHILD;

      const method = editingMember ? 'PUT' : 'POST';
      
      // Clean up the form data
      const updateData = {
        ...(formData.firstName && { firstName: formData.firstName.trim() }),
        ...(formData.lastName && { lastName: formData.lastName.trim() }),
        ...(formData.username && { username: formData.username.trim() }),
        ...(formData.email && { email: formData.email.trim() }),
        ...(formData.phone && { phone: formData.phone.trim() })
      };

      console.log('Sending update to endpoint:', endpoint);
      console.log('Update data:', updateData);

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to save family member');
      }

      const data = await response.json();
      console.log('Server response:', data);
      
      if (editingMember) {
        if (editingMember._id === user._id) {
          // Update the auth context with the server response
          await updateCurrentUser(data.user);
        }
        setSuccess('Family member updated successfully!');
      } else {
        setSuccess('New family member added successfully!');
      }

      // Close the dialog first to avoid stale data display
      handleCloseDialog();
      
      // Then refresh the family members list
      await fetchFamilyMembers();
    } catch (error) {
      console.error('Error saving family member:', error);
      setFormError(error.message || 'Failed to save family member');
    }
  };

  const handleDelete = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this family member?')) {
      return;
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.AUTH.DELETE_USER}/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete family member');
      }

      fetchFamilyMembers();
    } catch (error) {
      console.error('Error deleting family member:', error);
    }
  };

  const renderFamilyMember = (member) => (
    <Card key={member._id} sx={{ mb: 2 }}>
      <CardContent>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs>
            <Typography variant="h6">
              {member.firstName} {member.lastName}
            </Typography>
            <Typography color="textSecondary">
              @{member.username}
            </Typography>
            {member.email && (
              <Typography color="textSecondary" variant="body2">
                {member.email}
              </Typography>
            )}
            {member.phone && (
              <Typography color="textSecondary" variant="body2">
                {member.phone}
              </Typography>
            )}
          </Grid>
          <Grid item>
            <Chip 
              label={member.role === 'owner' ? 'Owner' : member.role === 'parent' ? 'Parent' : 'Child'} 
              color={member.role === 'child' ? 'primary' : 'secondary'} 
              sx={{ mr: 1 }}
            />
          </Grid>
          <Grid item>
            <IconButton onClick={() => handleOpenDialog(member)} size="small">
              <EditIcon />
            </IconButton>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container>
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Family Members</Typography>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Family Member
          </Button>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Parents
          </Typography>
          {familyMembers.parents.map((parent) => (
            renderFamilyMember(parent)
          ))}
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box>
          <Typography variant="h5" gutterBottom>
            Children
          </Typography>
          {familyMembers.children.map((child) => (
            renderFamilyMember(child)
          ))}
        </Box>
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingMember ? 'Edit Family Member' : 'Add Family Member'}
        </DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                name="firstName"
                label="First Name"
                value={formData.firstName}
                onChange={handleInputChange}
                fullWidth
                required
                error={!!formError && formError.includes('First name')}
                helperText={formError && formError.includes('First name') ? formError : ''}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                name="lastName"
                label="Last Name"
                value={formData.lastName}
                onChange={handleInputChange}
                fullWidth
                required
                error={!!formError && formError.includes('Last name')}
                helperText={formError && formError.includes('Last name') ? formError : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="username"
                label="Username"
                value={formData.username}
                onChange={handleInputChange}
                fullWidth
                required={!!editingMember}
                disabled={!!editingMember}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="email"
                label="Email"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="phone"
                label="Phone"
                value={formData.phone}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingMember ? 'Save Changes' : 'Add Member'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Family;
