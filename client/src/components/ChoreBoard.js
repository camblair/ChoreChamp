import React, { useState } from 'react';
import {
  Grid, Paper, Typography, IconButton,
  Card, CardContent, CardActions,
  Button, Dialog, DialogTitle,
  DialogContent, DialogActions,
  TextField, Box, Chip, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DroppableContainer = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <Box 
      ref={setNodeRef} 
      sx={{ 
        minHeight: '100px',
        backgroundColor: isOver ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
        transition: 'background-color 0.2s ease',
        padding: '8px',
        borderRadius: '4px'
      }}
    >
      {children}
    </Box>
  );
};

const SortableChoreCard = ({ chore, onEdit, onDelete, onUnassign }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: chore._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginBottom: '8px',
    cursor: 'grab'
  };

  return (
    <Card ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardContent>
        <Typography variant="h6">{chore.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {chore.description}
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={`${chore.points} points`} size="small" />
          {chore.completed && (
            <Chip label="Completed" color="success" size="small" />
          )}
        </Box>
      </CardContent>
      <CardActions>
        <IconButton size="small" onClick={() => onEdit(chore)}>
          <EditIcon />
        </IconButton>
        {onUnassign && (
          <IconButton size="small" onClick={() => onUnassign(chore._id)}>
            <PersonOffIcon />
          </IconButton>
        )}
        <IconButton size="small" onClick={() => onDelete(chore._id)}>
          <DeleteIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
};

const ChoreBoard = ({
  chores,
  children,
  onChoreMove,
  onEditChore,
  onDeleteChore,
  onUnassignChore
}) => {
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedChore, setSelectedChore] = useState(null);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getChildColumn = (childId) => {
    return chores.filter(chore => chore.assignedTo?._id === childId);
  };

  const getUnassignedChores = () => {
    return chores.filter(chore => !chore.assignedTo);
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const choreId = active.id;
    const targetId = over.id;

    // Don't do anything if dropping on the same column
    const sourceChore = getChoreById(choreId);
    if (!sourceChore) return;

    const currentAssigneeId = sourceChore.assignedTo?._id;
    if (targetId === currentAssigneeId) return;

    // If dropping on unassigned column
    if (targetId === 'unassigned') {
      onChoreMove(choreId, null);
      return;
    }

    // If dropping on a child's column
    const targetChild = children.find(child => child._id === targetId);
    if (targetChild) {
      onChoreMove(choreId, targetId);
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    
    if (!over) return;

    const choreId = active.id;
    const overId = over.id;

    // Skip if dropping on the same column or invalid target
    const sourceChore = getChoreById(choreId);
    if (!sourceChore) return;

    const currentAssigneeId = sourceChore.assignedTo?._id;
    if (overId === currentAssigneeId) return;

    // Add any visual feedback here if needed
  };

  const handleEdit = (chore) => {
    setSelectedChore(chore);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setSelectedChore(null);
    setEditDialogOpen(false);
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const updatedData = {
      title: formData.get('title'),
      description: formData.get('description'),
      points: Number(formData.get('points'))
    };

    try {
      await onEditChore(selectedChore._id, updatedData);
      handleCloseEditDialog();
    } catch (error) {
      setError('Failed to update chore. Please try again.');
    }
  };

  const getChoreById = (id) => chores.find(chore => chore._id === id);

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Unassigned Chores
              </Typography>
              <DroppableContainer id="unassigned">
                <SortableContext
                  items={getUnassignedChores().map(c => c._id)}
                  strategy={verticalListSortingStrategy}
                >
                  {getUnassignedChores().map((chore) => (
                    <SortableChoreCard
                      key={chore._id}
                      chore={chore}
                      onEdit={handleEdit}
                      onDelete={onDeleteChore}
                    />
                  ))}
                </SortableContext>
              </DroppableContainer>
            </Paper>
          </Grid>

          {children.map((child) => (
            <Grid item xs={12} md={3} key={child._id}>
              <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  {child.firstName || child.username}'s Chores
                </Typography>
                <DroppableContainer id={child._id}>
                  <SortableContext
                    items={getChildColumn(child._id).map(c => c._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {getChildColumn(child._id).map((chore) => (
                      <SortableChoreCard
                        key={chore._id}
                        chore={chore}
                        onEdit={handleEdit}
                        onDelete={onDeleteChore}
                        onUnassign={onUnassignChore}
                      />
                    ))}
                  </SortableContext>
                </DroppableContainer>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <DragOverlay>
          {activeId ? (
            <Card sx={{ width: 300, cursor: 'grabbing' }}>
              <CardContent>
                <Typography variant="h6">
                  {getChoreById(activeId)?.title}
                </Typography>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog}>
        <DialogTitle>Edit Chore</DialogTitle>
        <form onSubmit={handleSaveEdit}>
          <DialogContent>
            <TextField
              name="title"
              label="Title"
              defaultValue={selectedChore?.title}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              name="description"
              label="Description"
              defaultValue={selectedChore?.description}
              fullWidth
              margin="normal"
              multiline
              rows={3}
            />
            <TextField
              name="points"
              label="Points"
              type="number"
              defaultValue={selectedChore?.points}
              fullWidth
              margin="normal"
              required
              inputProps={{ min: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditDialog}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ChoreBoard;
