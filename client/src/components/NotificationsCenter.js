import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  Divider,
  Chip,
  Tooltip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SnoozeIcon from '@mui/icons-material/Snooze';
import { format, startOfToday, addDays } from 'date-fns';

const NotificationsCenter = ({ chores, handleComplete, handleSnooze }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  const getUpcomingChores = () => {
    const now = new Date();
    const today = startOfToday();
    const endOfDay = new Date(today);
    endOfDay.setHours(20, 0, 0, 0); // 8 PM

    return chores.filter(chore => {
      if (chore.completed) return false;
      
      if (chore.choreType === 'one-time') {
        const dueDate = new Date(chore.dueDate);
        return dueDate >= now && dueDate <= addDays(now, 1);
      } else if (chore.choreType === 'recurring') {
        if (chore.recurrence.frequency === 'daily') {
          return now < endOfDay;
        } else if (chore.recurrence.frequency === 'weekly') {
          const dayOfWeek = format(now, 'EEEE').toLowerCase();
          return chore.recurrence.daysOfWeek.includes(dayOfWeek) && now < endOfDay;
        }
      }
      return false;
    });
  };

  const upcomingChores = getUpcomingChores();
  
  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        size="large"
        sx={{ ml: 2 }}
      >
        <Badge badgeContent={upcomingChores.length} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: '300px',
            mt: 1.5
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="h6">Upcoming Chores</Typography>
        </Box>
        <Divider />
        {upcomingChores.length === 0 ? (
          <MenuItem disabled>
            <ListItemText primary="No upcoming chores" />
          </MenuItem>
        ) : (
          upcomingChores.map(chore => (
            <MenuItem key={chore._id} sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-start',
              py: 1 
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                width: '100%',
                mb: 0.5
              }}>
                <Typography variant="subtitle1">{chore.title}</Typography>
                <Chip 
                  label={`${chore.points} pts`}
                  size="small"
                  color="primary"
                />
              </Box>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                width: '100%',
                mt: 0.5
              }}>
                <Box>
                  <Tooltip title="Mark Complete">
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleComplete(chore);
                      }}
                    >
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Snooze 1 hour">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSnooze(chore);
                      }}
                    >
                      <SnoozeIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {chore.choreType === 'recurring' && chore.recurrence.frequency === 'daily' 
                    ? 'Due by 8 PM'
                    : `Due ${format(new Date(chore.dueDate), 'MMM d, yyyy')}`
                  }
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
};

export default NotificationsCenter; 