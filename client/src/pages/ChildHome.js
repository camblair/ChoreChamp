import React, { useState, useEffect } from 'react';
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
  ListItemSecondaryAction,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ChildHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chores, setChores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [points, setPoints] = useState(0);

  const fetchChores = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chores/assigned/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chores');
      }

      const data = await response.json();
      console.log('Fetched chores for child:', data); // Debug log
      setChores(data);
      
      // Fetch updated points
      const userResponse = await fetch(`/api/users/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setPoints(userData.points);
      }
    } catch (err) {
      console.error('Error fetching chores:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'child') {
      navigate('/');
      return;
    }
    console.log('Fetching chores for user:', user._id); // Debug log
    fetchChores();
  }, [user, navigate]);

  const handleCompleteChore = async (choreId) => {
    try {
      const response = await fetch(`/api/chores/${choreId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to complete chore');
      }

      // Refresh chores and points
      fetchChores();
    } catch (err) {
      console.error('Error completing chore:', err);
      setError(err.message);
    }
  };

  const handleUndoComplete = async (choreId) => {
    try {
      const response = await fetch(`/api/chores/${choreId}/undo`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to undo chore completion');
      }

      // Refresh chores and points
      fetchChores();
    } catch (err) {
      console.error('Error undoing chore completion:', err);
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

  return (
    <Container>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h4" gutterBottom>
              Welcome, {user?.firstName || user?.username}!
            </Typography>
            <Typography variant="h6" color="primary">
              Your Points: {points}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Your Chores
              </Typography>
              {Array.isArray(chores) && chores.length > 0 ? (
                <List>
                  {chores.map((chore) => (
                    <ListItem 
                      key={chore._id} 
                      divider
                      sx={{
                        backgroundColor: chore.status === 'completed' ? '#e8f5e9' : 'inherit',
                        transition: 'background-color 0.3s'
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography 
                            variant="subtitle1"
                            sx={{
                              textDecoration: chore.status === 'completed' ? 'line-through' : 'none'
                            }}
                          >
                            {chore.title}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography component="span" variant="body2" color="text.secondary" display="block">
                              Points: {chore.points}
                            </Typography>
                            <Typography component="span" variant="body2" color="text.secondary" display="block">
                              {chore.choreType === 'recurring'
                                ? `Repeats: ${chore.recurrence.frequency}`
                                : `Due: ${new Date(chore.dueDate).toLocaleDateString()}`}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Button
                          variant="contained"
                          color={chore.status === 'completed' ? 'warning' : 'primary'}
                          onClick={() => chore.status === 'completed' 
                            ? handleUndoComplete(chore._id)
                            : handleCompleteChore(chore._id)
                          }
                        >
                          {chore.status === 'completed' ? 'JK - Not Complete' : 'Complete'}
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No chores assigned yet!
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ChildHome;
