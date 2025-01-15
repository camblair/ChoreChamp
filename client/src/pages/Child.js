import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '../context/AuthContext';
import EditChildForm from '../components/EditChildForm';

const Child = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [child, setChild] = useState(null);
  const [chores, setChores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchChildData();
  }, [id]);

  const fetchChildData = async () => {
    try {
      setLoading(true);
      const [childRes, choresRes] = await Promise.all([
        fetch(`/api/users/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch(`/api/chores/assigned/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      if (!childRes.ok || !choresRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [childData, choresData] = await Promise.all([
        childRes.json(),
        choresRes.json()
      ]);

      setChild(childData);
      setChores(choresData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditChild = async (updateData) => {
    try {
      const response = await fetch(`/api/auth/child/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update child');
      }

      const updatedChild = await response.json();
      setChild(updatedChild);
      setEditDialogOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!child) {
    return (
      <Container>
        <Alert severity="error">Child not found</Alert>
      </Container>
    );
  }

  return (
    <Container>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            {child.firstName}'s Profile
          </Typography>
          {user?.role === 'parent' && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setEditDialogOpen(true)}
            >
              Edit Profile
            </Button>
          )}
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Profile Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography>
                    <strong>Username:</strong> {child.username}
                  </Typography>
                  <Typography>
                    <strong>First Name:</strong> {child.firstName}
                  </Typography>
                  {child.email && (
                    <Typography>
                      <strong>Email:</strong> {child.email}
                    </Typography>
                  )}
                  {child.phone && (
                    <Typography>
                      <strong>Phone:</strong> {child.phone}
                    </Typography>
                  )}
                  <Typography>
                    <strong>Points:</strong> {child.points}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Assigned Chores
                </Typography>
                {chores.length === 0 ? (
                  <Typography color="text.secondary">
                    No chores assigned
                  </Typography>
                ) : (
                  <List>
                    {chores.map((chore, index) => (
                      <React.Fragment key={chore._id}>
                        <ListItem>
                          <ListItemText
                            primary={chore.title}
                            secondary={`Points: ${chore.points} | Status: ${chore.status}`}
                          />
                        </ListItem>
                        {index < chores.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {user?.role === 'parent' && (
        <EditChildForm
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onSubmit={handleEditChild}
          child={child}
        />
      )}
    </Container>
  );
};

export default Child;
