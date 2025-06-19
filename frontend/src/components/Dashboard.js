import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  IconButton,
  Chip,
  Alert
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { eventsAPI } from '../services/api';
import socketService from '../services/socket';
import EventFeed from './EventFeed';
import QueryInterface from './QueryInterface';
import StatsCards from './StatsCards';

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadDashboardData();

    const socket = socketService.connect();

    const handleNewEvent = (newEvent) => {
      console.log('📡 New event received:', newEvent);
      setEvents(prevEvents => [newEvent, ...prevEvents.slice(0, 49)]);
      setStats(prevStats => ({
        ...prevStats,
        todayTotal: (prevStats.todayTotal || 0) + 1
      }));
    };

    socket.on('connect', () => {
      setIsConnected(true);
      socketService.joinMonitoring('cam-001');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socketService.on('new-event', handleNewEvent);

    return () => {
      socketService.off('new-event', handleNewEvent);
      socketService.disconnect();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [eventsResponse, statsResponse] = await Promise.all([
        eventsAPI.getEvents({ limit: 50 }),
        eventsAPI.getStats()
      ]);

      setEvents(eventsResponse.data.events || []);
      setStats(statsResponse.data || {});
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Smart Surveillance Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Chip 
            icon={<VisibilityIcon />}
            label={isConnected ? "Live" : "Disconnected"}
            color={isConnected ? "success" : "error"}
            variant="outlined"
          />
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <StatsCards stats={stats} loading={loading} />

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '600px' }}>
            <Typography variant="h6" gutterBottom>
              Live Event Feed
            </Typography>
            <EventFeed events={events} loading={loading} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '600px' }}>
            <Typography variant="h6" gutterBottom>
              Ask Questions
            </Typography>
            <QueryInterface />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
