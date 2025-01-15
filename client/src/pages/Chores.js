import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  IconButton,
  Alert,
  Fab,
  Tooltip,
  Chip,
  Paper,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Checkbox
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuth } from '../context/AuthContext';
import API_ENDPOINTS from '../constants/apiEndpoints';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isValid, addDays, startOfToday, getDay } from 'date-fns';
import FilterListIcon from '@mui/icons-material/FilterList';
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';

const ItemType = {
  CHORE: 'chore',
};

const ChoresPage = () => {
  const { user, token, selectedHousehold } = useAuth();
  const navigate = useNavigate();
  const [chores, setChores] = useState([]);
  const [children, setChildren] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingChore, setEditingChore] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [view, setView] = useState('all');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const [choreForm, setChoreForm] = useState({
    title: '',
    description: '',
    points: 1,
    assignedTo: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    householdId: selectedHousehold,
    choreType: 'one-time',
    recurrence: {
      frequency: 'daily',
      daysOfWeek: []
    }
  });

  useEffect(() => {
    if (!selectedHousehold) {
      setLoading(false);
      setError('Please select a household first');
      setChildren([]);
      setParents([]);
      setChores([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      console.log('Selected Household:', selectedHousehold);
      
      try {
        // Fetch household data (includes both children and parents)
        const householdUrl = API_ENDPOINTS.HOUSEHOLD.GET_BY_ID(selectedHousehold);
        console.log('Fetching household data from:', householdUrl);
        
        const householdResponse = await fetch(householdUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!householdResponse.ok) {
          const errorText = await householdResponse.text();
          console.error('Household fetch failed:', householdResponse.status, errorText);
          throw new Error(`Failed to fetch household data: ${householdResponse.status} ${errorText}`);
        }
        
        const householdData = await householdResponse.json();
        console.log('Household data:', householdData);
        
        // Set children and parents from household data
        setChildren(householdData.children || []);
        setParents(householdData.parents?.map(p => p.user) || []);

        // Fetch chores
        const choresUrl = API_ENDPOINTS.CHORES.GET(selectedHousehold);
        console.log('Fetching chores from:', choresUrl);
        
        const choresResponse = await fetch(choresUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!choresResponse.ok) {
          const errorText = await choresResponse.text();
          console.error('Chores fetch failed:', choresResponse.status, errorText);
          throw new Error(`Failed to fetch chores: ${choresResponse.status} ${errorText}`);
        }
        
        const choresData = await choresResponse.json();
        console.log('Chores data:', choresData);
        setChores(choresData);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedHousehold, token]);

  const formatDate = (dateString) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) {
        return 'Invalid date';
      }
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getNextDueDate = (chore) => {
    if (!chore || !chore.choreType) return null;

    if (chore.choreType === 'one-time') {
      return chore.dueDate;
    }

    if (chore.choreType === 'recurring' && chore.recurrence) {
      if (chore.recurrence.frequency === 'daily') {
        return null; // No specific due date for daily chores
      }

      if (chore.recurrence.frequency === 'weekly' && chore.recurrence.daysOfWeek?.length > 0) {
        const today = startOfToday();
        const todayDayIndex = getDay(today); // 0 = Sunday, 1 = Monday, etc.
        const daysOfWeek = chore.recurrence.daysOfWeek.map(day => {
          // Convert day names to numbers (0-6)
          const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
          return dayMap[day.toLowerCase()];
        }).sort((a, b) => a - b);

        // Find the next occurrence
        let nextDayIndex = daysOfWeek.find(day => day > todayDayIndex);
        if (nextDayIndex === undefined) {
          // If no days left this week, get the first day of next week
          nextDayIndex = daysOfWeek[0];
        }

        // Calculate days until next occurrence
        const daysUntilNext = nextDayIndex > todayDayIndex 
          ? nextDayIndex - todayDayIndex 
          : 7 - todayDayIndex + nextDayIndex;

        return addDays(today, daysUntilNext).toISOString();
      }
    }

    return null;
  };

  const handleDrop = async (choreId, newChildId) => {
    try {
      const response = await fetch(API_ENDPOINTS.CHORES.ASSIGN(choreId), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          assignedTo: newChildId === 'unassigned' ? null : newChildId 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reassign chore');
      }

      const updatedChore = await response.json();
      
      // Update the local state
      setChores(prevChores => 
        prevChores.map(chore => 
          chore._id === choreId ? updatedChore : chore
        )
      );

      setSuccess('Chore reassigned successfully!');
    } catch (err) {
      console.error('Error reassigning chore:', err);
      setError(err.message || 'Failed to reassign chore. Please try again.');
    }
  };

  const handleOpenDialog = (chore = null) => {
    if (chore) {
      // For editing, ensure the date is in YYYY-MM-DD format
      const dueDate = chore.dueDate ? chore.dueDate.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
      
      setChoreForm({
        title: chore.title || '',
        description: chore.description || '',
        points: chore.points || 1,
        assignedTo: chore.assignedTo?._id || '',
        dueDate,
        householdId: selectedHousehold,
        choreType: chore.choreType || 'one-time',
        recurrence: chore.recurrence || { frequency: 'daily', daysOfWeek: [] }
      });
      setEditingChore(chore);
    } else {
      setChoreForm({
        title: '',
        description: '',
        points: 1,
        assignedTo: '',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        householdId: selectedHousehold,
        choreType: 'one-time',
        recurrence: {
          frequency: 'daily',
          daysOfWeek: []
        }
      });
      setEditingChore(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setChoreForm({
      title: '',
      description: '',
      points: 1,
      assignedTo: '',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      householdId: selectedHousehold,
      choreType: 'one-time',
      recurrence: {
        frequency: 'daily',
        daysOfWeek: []
      }
    });
    setEditingChore(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested recurrence fields
    if (name.startsWith('recurrence.')) {
      const field = name.split('.')[1];
      setChoreForm(prev => ({
        ...prev,
        recurrence: {
          ...prev.recurrence,
          [field]: value
        }
      }));
    } else {
      setChoreForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleChoreTypeChange = (e) => {
    const { value } = e.target;
    setChoreForm(prev => ({
      ...prev,
      choreType: value,
      // Reset recurrence when switching to one-time
      ...(value === 'one-time' && { recurrence: { frequency: 'daily', daysOfWeek: [] } })
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    console.log('Form submitted:', choreForm);

    if (!choreForm.title || !choreForm.points) {
      console.error('Missing required fields');
      setError('Please fill in all required fields');
      return;
    }

    try {
      const choreData = {
        title: choreForm.title,
        description: choreForm.description,
        points: parseInt(choreForm.points),
        choreType: choreForm.choreType,
        assignedTo: choreForm.assignedTo || undefined,
        householdId: selectedHousehold
      };

      if (choreForm.choreType === 'one-time') {
        choreData.dueDate = choreForm.dueDate;
      } else if (choreForm.choreType === 'recurring') {
        choreData.recurrence = {
          frequency: choreForm.recurrence.frequency,
          daysOfWeek: choreForm.recurrence.frequency === 'weekly' ? choreForm.recurrence.daysOfWeek : undefined
        };
      }

      console.log('Submitting chore data:', choreData);

      if (editingChore) {
        await handleEditChore(editingChore._id, choreData);
      } else {
        const response = await fetch(API_ENDPOINTS.CHORES.CREATE(selectedHousehold), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(choreData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create chore');
        }

        await fetchChores();
      }

      setChoreForm({
        title: '',
        description: '',
        points: 1,
        assignedTo: '',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        householdId: selectedHousehold,
        choreType: 'one-time',
        recurrence: {
          frequency: 'daily',
          daysOfWeek: []
        }
      });
      setOpenDialog(false);
      setEditingChore(null);
      setSuccess(editingChore ? 'Chore updated successfully!' : 'Chore created successfully!');
    } catch (error) {
      console.error('Error submitting chore:', error);
      setError(error.message || 'Failed to submit chore');
    }
  };

  const handleDelete = async (choreId) => {
    if (!window.confirm('Are you sure you want to delete this chore?')) return;

    try {
      const response = await fetch(API_ENDPOINTS.CHORES.DELETE(choreId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete chore');
      }

      setSuccess('Chore deleted successfully!');
      // fetchChores();
    } catch (err) {
      console.error('Error deleting chore:', err);
      setError(err.message || 'Failed to delete chore. Please try again.');
    }
  };

  const handleManageChildren = () => {
    navigate('/manage-children');
  };

  const handleEditChore = async (choreId, choreData) => {
    try {
      const response = await fetch(API_ENDPOINTS.CHORES.UPDATE(choreId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(choreData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update chore');
      }

      // Refresh the chores list
      await fetchChores();
      setSuccess('Chore updated successfully!');
    } catch (error) {
      console.error('Error updating chore:', error);
      setError(error.message || 'Failed to update chore');
    }
  };

  const fetchChores = async () => {
    if (!selectedHousehold) return;
    
    try {
      const choresUrl = API_ENDPOINTS.CHORES.GET(selectedHousehold);
      console.log('Fetching chores from:', choresUrl);
      
      const response = await fetch(choresUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Chores fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch chores: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Chores data:', data);
      setChores(data);
    } catch (error) {
      console.error('Error fetching chores:', error);
      setError(error.message);
    }
  };

  const handleRotateChores = async () => {
    try {
      // Get all unlocked chores
      const unlockedChores = chores.filter(chore => !chore.isLocked);
      const familyMembers = [...parents, ...children];
      
      if (familyMembers.length === 0) {
        throw new Error('No family members to rotate chores between');
      }

      if (unlockedChores.length === 0) {
        setSuccess('No unlocked chores to rotate');
        return;
      }

      // Group chores by assignee
      const choresByAssignee = {};
      unlockedChores.forEach(chore => {
        const assigneeId = chore.assignedTo?._id || 'unassigned';
        if (!choresByAssignee[assigneeId]) {
          choresByAssignee[assigneeId] = [];
        }
        choresByAssignee[assigneeId].push(chore);
      });

      // Create updates for unlocked chores only
      const updates = unlockedChores.map(chore => {
        const currentAssigneeId = chore.assignedTo?._id;
        let currentIndex = familyMembers.findIndex(member => member._id === currentAssigneeId);
        
        // If chore is unassigned or assignee not found, start from beginning
        if (currentIndex === -1) currentIndex = familyMembers.length - 1;
        
        // Get next family member (cycle back to start if at end)
        const nextIndex = (currentIndex + 1) % familyMembers.length;
        const nextAssignee = familyMembers[nextIndex];

        return fetch(API_ENDPOINTS.CHORES.ASSIGN(chore._id), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            assignedTo: nextAssignee._id 
          })
        });
      });

      // Wait for all updates to complete
      await Promise.all(updates);
      
      // Update local state
      const updatedChores = chores.map(chore => {
        if (chore.isLocked) return chore;
        
        const currentAssigneeId = chore.assignedTo?._id;
        let currentIndex = familyMembers.findIndex(member => member._id === currentAssigneeId);
        if (currentIndex === -1) currentIndex = familyMembers.length - 1;
        
        const nextIndex = (currentIndex + 1) % familyMembers.length;
        const nextAssignee = familyMembers[nextIndex];
        
        return {
          ...chore,
          assignedTo: nextAssignee
        };
      });
      
      setChores(updatedChores);
      setSuccess('Chores rotated successfully!');
    } catch (error) {
      console.error('Error rotating chores:', error);
      setError(error.message || 'Failed to rotate chores');
    }
  };

  const filterChores = (choresToFilter) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return choresToFilter.filter(chore => {
      if (view === 'today') {
        if (chore.choreType === 'one-time') {
          const dueDate = new Date(chore.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() === today.getTime();
        } else if (chore.choreType === 'recurring') {
          if (chore.recurrence.frequency === 'daily') return true;
          if (chore.recurrence.frequency === 'weekly') {
            const dayOfWeek = format(today, 'EEEE').toLowerCase();
            return chore.recurrence.daysOfWeek.includes(dayOfWeek);
          }
        }
        return false;
      }
      return true;
    });
  };

  const handleToggleLock = async (chore) => {
    try {
      const response = await fetch(API_ENDPOINTS.CHORES.UPDATE(chore._id), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isLocked: !chore.isLocked
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Lock toggle failed:', errorData);
        throw new Error('Failed to update chore lock status');
      }

      // Update local state immediately
      setChores(prevChores => prevChores.map(c => 
        c._id === chore._id 
          ? { ...c, isLocked: !c.isLocked }
          : c
      ));
      
      setSuccess('Chore lock status updated successfully');
    } catch (error) {
      console.error('Error toggling chore lock:', error);
      setError(error.message);
    }
  };

  const handleCompleteChore = async (chore) => {
    try {
      const response = await fetch(API_ENDPOINTS.CHORES.COMPLETE(chore._id), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to complete chore');
      }

      // Update local state
      setChores(prevChores => prevChores.map(c => 
        c._id === chore._id 
          ? { ...c, completed: true }
          : c
      ));
      setSuccess('Chore marked as complete!');
    } catch (error) {
      console.error('Error completing chore:', error);
      setError(error.message);
    }
  };

  const renderDesktopChoreGrid = (filteredChores) => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Family Members Row */}
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: `repeat(${parents.length + children.length}, minmax(250px, 1fr))`,
          gap: 2,
          width: '100%',
          overflowX: 'auto',
        }}>
          {/* Parent Columns */}
          {Array.isArray(parents) && parents.map((parent) => (
            <Paper 
              key={parent._id} 
              sx={{ 
                height: 'fit-content',
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 1,
                boxShadow: 1
              }}
            >
              <Typography variant="h6" gutterBottom>
                {parent.username || 'Parent'}
              </Typography>
              <DroppableColumn
                childId={parent._id}
                getChoresByColumn={() => filteredChores.filter(chore => chore.assignedTo?._id === parent._id)}
                formatDate={formatDate}
                user={user}
                handleOpenDialog={handleOpenDialog}
                handleDelete={handleDelete}
                handleDrop={handleDrop}
                getNextDueDate={getNextDueDate}
                handleToggleLock={handleToggleLock}
              />
            </Paper>
          ))}

          {/* Child Columns */}
          {Array.isArray(children) && children.map((child) => (
            <Paper 
              key={child._id} 
              sx={{ 
                height: 'fit-content',
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 1,
                boxShadow: 1
              }}
            >
              <Typography variant="h6" gutterBottom>
                {child.firstName} {child.lastName}
              </Typography>
              <DroppableColumn
                childId={child._id}
                getChoresByColumn={() => filteredChores.filter(chore => chore.assignedTo?._id === child._id)}
                formatDate={formatDate}
                user={user}
                handleOpenDialog={handleOpenDialog}
                handleDelete={handleDelete}
                handleDrop={handleDrop}
                getNextDueDate={getNextDueDate}
                handleToggleLock={handleToggleLock}
              />
            </Paper>
          ))}
        </Box>

        {/* Unassigned Chores Row */}
        <Paper 
          sx={{ 
            bgcolor: 'grey.50',
            p: 2,
            borderRadius: 1,
            boxShadow: 1
          }}
        >
          <Typography variant="h6" gutterBottom>
            Unassigned
          </Typography>
          <DroppableColumn 
            childId="unassigned" 
            getChoresByColumn={() => filteredChores.filter(chore => !chore.assignedTo)} 
            formatDate={formatDate} 
            user={user} 
            handleOpenDialog={handleOpenDialog} 
            handleDelete={handleDelete}
            handleDrop={handleDrop}
            getNextDueDate={getNextDueDate}
            handleToggleLock={handleToggleLock}
          />
        </Paper>
      </Box>
    );
  };

  if (!selectedHousehold) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Please select a household first.</Typography>
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
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ p: 3 }}>
        {/* Top Bar */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3 
        }}>
          <Typography variant="h4" component="h1">
            Chores
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {user?.role === 'parent' && (
              <>
                <Button
                  variant="outlined"
                  onClick={handleManageChildren}
                  startIcon={<PersonIcon />}
                >
                  Manage Children
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleRotateChores}
                >
                  Rotate Chores
                </Button>
                <Tooltip title="Add New Chore">
                  <Fab
                    color="primary"
                    aria-label="add"
                    onClick={() => handleOpenDialog()}
                    size="medium"
                  >
                    <AddIcon />
                  </Fab>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>

        {/* Messages */}
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

        {/* Main Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          // Use filtered chores
          <Box>
            {renderDesktopChoreGrid(filterChores(chores))}
          </Box>
        )}

        {/* Filter Drawer */}
        <SwipeableDrawer
          anchor="bottom"
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          onOpen={() => setFilterDrawerOpen(true)}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Filter Chores
            </Typography>
            {/* Add filter options here */}
          </Box>
        </SwipeableDrawer>

        {/* Mobile Navigation */}
        {isMobile ? (
          <>
            {user?.role === 'parent' && (
              <Fab 
                color="primary" 
                sx={{ position: 'fixed', bottom: 80, right: 16 }}
                onClick={() => handleOpenDialog()}
              >
                <AddIcon />
              </Fab>
            )}
            <BottomNavigation
              value={view}
              onChange={(event, newValue) => {
                setView(newValue);
              }}
              showLabels
              sx={{ 
                position: 'fixed', 
                bottom: 0, 
                left: 0, 
                right: 0,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper'
              }}
            >
              <BottomNavigationAction label="Today" value="today" icon={<TodayIcon />} />
              <BottomNavigationAction label="All" value="all" icon={<DateRangeIcon />} />
              <BottomNavigationAction 
                label="Filter" 
                value="filter" 
                icon={<FilterListIcon />}
                onClick={() => setFilterDrawerOpen(true)}
              />
            </BottomNavigation>
          </>
        ) : null}
      </Box>
    </DndProvider>
  );
};

const DroppableColumn = ({ 
  childId, 
  getChoresByColumn, 
  formatDate, 
  user, 
  handleOpenDialog, 
  handleDelete, 
  handleDrop, 
  getNextDueDate,
  handleToggleLock 
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: ItemType.CHORE,
    drop: (item) => {
      handleDrop(item.id, childId);
      return { name: childId };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const isUnassigned = childId === "unassigned";

  return (
    <Box 
      ref={drop} 
      sx={{ 
        minHeight: 100,
        maxHeight: isUnassigned ? 'auto' : 'calc(100vh - 250px)',
        overflowY: 'auto',
        backgroundColor: isOver ? 'action.hover' : 'transparent',
        transition: 'background-color 0.2s ease',
        p: 1,
        borderRadius: 1,
        '&::-webkit-scrollbar': {
          width: 6,
          bgcolor: 'background.paper',
        },
        '&::-webkit-scrollbar-thumb': {
          borderRadius: 2,
          bgcolor: 'grey.300',
        },
      }}
    >
      {getChoresByColumn(childId).map((chore, index) => (
        <DraggableChore 
          key={chore._id} 
          chore={chore} 
          index={index} 
          formatDate={formatDate} 
          user={user} 
          handleOpenDialog={handleOpenDialog} 
          handleDelete={handleDelete}
          getNextDueDate={getNextDueDate}
          isUnassigned={isUnassigned}
          handleToggleLock={handleToggleLock}
        />
      ))}
      {getChoresByColumn(childId).length === 0 && (
        <Box 
          sx={{ 
            height: 100, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'text.secondary',
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            borderStyle: 'dashed'
          }}
        >
          <Typography variant="body2">
            Drop chores here
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const DraggableChore = ({ 
  chore, 
  index, 
  formatDate, 
  user, 
  handleOpenDialog, 
  handleDelete, 
  getNextDueDate, 
  isUnassigned = false,
  handleToggleLock
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType.CHORE,
    item: { id: chore._id, index },
    canDrag: !chore.isLocked,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const nextDueDate = getNextDueDate(chore);
  const frequencyLabel = chore.choreType === 'recurring' && chore.recurrence
    ? chore.recurrence.frequency === 'daily' 
      ? 'Daily'
      : chore.recurrence.daysOfWeek?.length > 0
        ? `Weekly on ${chore.recurrence.daysOfWeek.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ')}`
        : null
    : null;

  if (isUnassigned) {
    return (
      <Card
        ref={drag}
        sx={{ 
          mb: 1, 
          opacity: isDragging ? 0.5 : 1,
          cursor: 'move',
          '&:hover': {
            boxShadow: 3
          }
        }}
      >
        <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
              <Typography variant="body1" component="div" sx={{ fontWeight: 500 }}>
                {chore.title}
              </Typography>
              <Chip
                label={`${chore.points} pts`}
                color="primary"
                size="small"
                sx={{ height: 20 }}
              />
              {frequencyLabel && (
                <Chip
                  label={frequencyLabel}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20 }}
                />
              )}
            </Box>
            {user?.role === 'parent' && (
              <Box sx={{ display: 'flex', ml: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => handleOpenDialog(chore)}
                  sx={{ padding: 0.5 }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(chore._id)}
                  color="error"
                  sx={{ padding: 0.5 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      ref={drag}
      sx={{ 
        mb: 1, 
        opacity: isDragging ? 0.5 : 1,
        cursor: chore.isLocked ? 'default' : 'move',
        '&:hover': {
          boxShadow: 3
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h6" component="div">
            {chore.title}
          </Typography>
          {user?.role === 'parent' && chore.assignedTo && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleLock(chore);
              }}
              color={chore.isLocked ? "primary" : "default"}
              sx={{ ml: 1 }}
            >
              {chore.isLocked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
            </IconButton>
          )}
        </Box>
        {chore.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {chore.description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`${chore.points} points`}
            color="primary"
            size="small"
          />
          {frequencyLabel && (
            <Chip
              label={frequencyLabel}
              size="small"
              variant="outlined"
            />
          )}
          {nextDueDate && (
            <Chip
              label={`Due: ${formatDate(nextDueDate)}`}
              size="small"
              color="secondary"
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>
      {user?.role === 'parent' && (
        <CardActions>
          <IconButton
            size="small"
            onClick={() => handleOpenDialog(chore)}
            aria-label="edit"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(chore._id)}
            aria-label="delete"
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </CardActions>
      )}
    </Card>
  );
};

export default ChoresPage;
