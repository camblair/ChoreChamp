import React from 'react';
import { Box, Typography, Button, Container, Grid, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 8 }}>
        {!user ? (
          <>
            <Typography variant="h2" component="h1" align="center" gutterBottom>
              Welcome to ChoreChamp! 🏆
            </Typography>
            <Typography variant="h5" align="center" color="text.secondary" paragraph>
              Make household chores fun and rewarding for the whole family.
              Parents can assign tasks, track progress, and reward their children for completing chores.
            </Typography>
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/register')}
              >
                Get Started
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="h3" gutterBottom>
              Welcome back, {user.username}! 👋
            </Typography>
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => navigate('/chores')}
                >
                  <Typography variant="h6" gutterBottom>
                    {user.role === 'parent' ? 'Manage Chores' : 'My Chores'}
                  </Typography>
                  <Typography color="text.secondary">
                    {user.role === 'parent'
                      ? 'Assign and track chores'
                      : 'View and complete your tasks'}
                  </Typography>
                </Paper>
              </Grid>
              {user.role === 'parent' && (
                <Grid item xs={12} md={4}>
                  <Paper
                    sx={{
                      p: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => navigate('/manage-children')}
                  >
                    <Typography variant="h6" gutterBottom>
                      Manage Children
                    </Typography>
                    <Typography color="text.secondary">
                      Add and manage child accounts
                    </Typography>
                  </Paper>
                </Grid>
              )}
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Points Earned
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {user.points || 0}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </Container>
  );
};

export default Home;
