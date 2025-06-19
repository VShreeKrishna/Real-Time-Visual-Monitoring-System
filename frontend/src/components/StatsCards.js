import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  CircularProgress
} from '@mui/material';
import {
  People,
  Security,
  Event,
  TrendingUp
} from '@mui/icons-material';

const StatsCards = ({ stats, loading }) => {
  const cardData = [
    {
      title: 'Total Events',
      value: stats?.totalEvents || 0,
      icon: Event,
      color: '#2196f3',
      trend: '+12%'
    },
    {
      title: 'People Detected',
      value: stats?.peopleDetected || 0,
      icon: People,
      color: '#4caf50',
      trend: '+5%'
    },
    {
      title: 'Security Alerts',
      value: stats?.securityAlerts || 0,
      icon: Security,
      color: '#ff9800',
      trend: '-2%'
    },
    {
      title: 'Active Cameras',
      value: stats?.activeCameras || 1,
      icon: TrendingUp,
      color: '#9c27b0',
      trend: '100%'
    }
  ];

  if (loading) {
    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="center">
                  <CircularProgress size={24} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {cardData.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                background: `linear-gradient(135deg, ${card.color}20 0%, ${card.color}10 100%)`,
                border: `1px solid ${card.color}30`
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      {card.title}
                    </Typography>
                    <Typography variant="h4" component="h2" fontWeight="bold">
                      {card.value.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ color: card.color, fontWeight: 'medium' }}>
                      {card.trend} from last week
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: card.color, width: 56, height: 56 }}>
                    <IconComponent />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default StatsCards;