import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Chip,
  IconButton,
  Skeleton,
  Paper,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  Warning as WarningIcon,
  ShoppingCart as ShoppingCartIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
  ZoomIn as ZoomInIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const EventFeed = ({ events, loading }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);

  const getEventIcon = (eventType) => {
    const iconMap = {
      'person_entered': PersonIcon,
      'person_exited': PersonIcon,
      'object_picked': ShoppingCartIcon,
      'object_placed': ShoppingCartIcon,
      'unusual_activity': WarningIcon,
      'multiple_people': PersonIcon,
      'loitering': ScheduleIcon
    };
    return iconMap[eventType] || VisibilityIcon;
  };

  const getEventColor = (eventType) => {
    const colorMap = {
      'person_entered': 'success',
      'person_exited': 'info',
      'object_picked': 'warning',
      'object_placed': 'primary',
      'unusual_activity': 'error',
      'multiple_people': 'secondary',
      'loitering': 'warning'
    };
    return colorMap[eventType] || 'default';
  };

  const formatEventType = (eventType) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Box sx={{ height: '100%', overflow: 'auto' }}>
        {[...Array(8)].map((_, index) => (
          <Box key={index} sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box flex={1}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" />
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Box 
        display="flex" 
        alignItems="center" 
        justifyContent="center" 
        height="100%"
        flexDirection="column"
        color="text.secondary"
      >
        <VisibilityIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
        <Typography variant="h6">No events detected</Typography>
        <Typography variant="body2">Events will appear here as they occur</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {events.map((event, index) => {
          const IconComponent = getEventIcon(event.eventType);
          const eventColor = getEventColor(event.eventType);
          
          return (
            <React.Fragment key={event._id || index}>
              <ListItem
                sx={{ 
                  px: 0, 
                  py: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    borderRadius: 1
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar 
                    sx={{ 
                      bgcolor: `${eventColor}.main`,
                      width: 40,
                      height: 40
                    }}
                  >
                    <IconComponent />
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography variant="subtitle2" component="span">
                        {formatEventType(event.eventType)}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${Math.round((event.confidence || 0) * 100)}%`}
                        color={event.confidence > 0.8 ? 'success' : 'default'}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.primary" gutterBottom>
                        {event.description}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="caption" color="text.secondary">
                          📍 {event.location}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          🕒 {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </Typography>
                        {event.metadata?.personCount > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            👥 {event.metadata.personCount} people
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  }
                />
                
                {event.imageUrl && (
                  <IconButton
                    size="small"
                    onClick={() => setSelectedEvent(event)}
                    sx={{ ml: 1 }}
                  >
                    <ZoomInIcon />
                  </IconButton>
                )}
              </ListItem>
              
              {index < events.length - 1 && <Divider variant="inset" />}
            </React.Fragment>
          );
        })}
      </List>
      
      {/* Image Modal - Simple implementation */}
      {selectedEvent && selectedEvent.imageUrl && (
        <Paper
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1300,
            p: 2,
            maxWidth: '80vw',
            maxHeight: '80vh',
            overflow: 'auto'
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <img
            src={`http://localhost:5000${selectedEvent.imageUrl}`}
            alt="Event"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: 8
            }}
          />
          <Typography variant="caption" display="block" textAlign="center" mt={1}>
            Click to close
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default EventFeed;
