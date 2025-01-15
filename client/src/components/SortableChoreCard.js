import { Card, CardContent, CardActions, Typography, IconButton, Box, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableChoreCard({ chore, onEdit, onDelete, onUnassign }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chore._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    mb: 2,
    width: '100%',
    maxWidth: '100%',
    position: 'relative',
    '&:hover': {
      boxShadow: 3,
    }
  };

  return (
    <Card
      ref={setNodeRef}
      sx={style}
      {...attributes}
      {...listeners}
    >
      <CardContent sx={{ 
        pb: 1,
        '&:last-child': { pb: 1 }
      }}>
        <Typography variant="h6" component="div" sx={{ 
          mb: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '1rem'
        }}>
          {chore.title}
        </Typography>
        
        {chore.description && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '1.2em',
              maxHeight: '2.4em',
              fontSize: '0.875rem'
            }}
          >
            {chore.description}
          </Typography>
        )}

        <Box sx={{ 
          display: 'flex', 
          gap: 0.5, 
          flexWrap: 'wrap',
          mb: 1 
        }}>
          <Chip
            label={`${chore.points} points`}
            color="primary"
            size="small"
            sx={{ maxWidth: '100%' }}
          />
          {chore.choreType === 'recurring' && (
            <Chip
              label={chore.recurrence?.frequency || 'Daily'}
              size="small"
              variant="outlined"
              sx={{ maxWidth: '100%' }}
            />
          )}
          {chore.dueDate && (
            <Chip
              label={`Due: ${new Date(chore.dueDate).toLocaleDateString()}`}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ maxWidth: '100%' }}
            />
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ 
        justifyContent: 'flex-end',
        p: 1,
        pt: 0,
        gap: 0.5
      }}>
        <IconButton 
          size="small" 
          onClick={(e) => {
            e.stopPropagation();
            onEdit(chore);
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
        {onUnassign && (
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              onUnassign(chore._id);
            }} 
            color="warning"
          >
            <PersonOffIcon fontSize="small" />
          </IconButton>
        )}
        <IconButton 
          size="small" 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(chore._id);
          }} 
          color="error"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
} 