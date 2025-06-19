import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { eventsAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

const QueryInterface = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [noResults, setNoResults] = useState(false);

  const predefinedQueries = [
    "What happened today?",
    "Show me people entering",
    "Any suspicious activity?",
    "Events in the last hour",
    "How many people were detected?"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setNoResults(false);
    setResults([]);

    try {
      const response = await eventsAPI.query(query);
      const queryResult = response.data;

      if (queryResult.results && queryResult.results.length > 0) {
        setResults(queryResult.results);
        setNoResults(false);
      } else {
        setResults([]);
        setNoResults(true);
      }
      
      // Add to query history
      setQueryHistory(prev => [
        {
          query,
          timestamp: new Date(),
          resultCount: queryResult.results?.length || 0
        },
        ...prev.slice(0, 4) // Keep last 5 queries
      ]);

    } catch (err) {
      console.error('Query error:', err);
      setError('Failed to process query. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePredefinedQuery = (predefinedQuery) => {
    setQuery(predefinedQuery);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Query Input */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Ask about events... (e.g., 'What happened at 2 PM?')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
            multiline
            maxRows={3}
          />
          
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
              disabled={loading || !query.trim()}
              size="small"
            >
              {loading ? 'Processing...' : 'Ask'}
            </Button>
            
            <Typography variant="caption" color="text.secondary">
              {query.length}/200
            </Typography>
          </Box>
        </form>
      </Paper>

      {/* Predefined Queries */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom color="text.secondary">
          Quick Questions:
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1}>
          {predefinedQueries.map((predefinedQuery, index) => (
            <Chip
              key={index}
              label={predefinedQuery}
              variant="outlined"
              size="small"
              onClick={() => handlePredefinedQuery(predefinedQuery)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Results */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {noResults && !loading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No events found for your query.
          </Alert>
        )}
        {results.length > 0 && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Results ({results.length}):
            </Typography>
            <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
              {results.map((event, index) => (
                <ListItem key={event._id || index} sx={{ px: 0, py: 1 }}>
                  <ListItemText
                    primary={event.description}
                    secondary={
                      <Box display="flex" flexDirection="column" gap={0.5}>
                        <Typography variant="caption">
                          📍 {event.location} • 🕒 {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </Typography>
                        <Chip
                          size="small"
                          label={event.eventType.replace(/_/g, ' ')}
                          color="primary"
                          variant="outlined"
                          sx={{ alignSelf: 'flex-start', height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}

        {/* Query History */}
        {queryHistory.length > 0 && (
          <Box sx={{ mt: 'auto' }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              <HistoryIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
              Recent Queries:
            </Typography>
            <List dense sx={{ p: 0 }}>
              {queryHistory.map((historyItem, index) => (
                <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                  <ListItemText
                    primary={
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { color: 'primary.main' }
                        }}
                        onClick={() => setQuery(historyItem.query)}
                      >
                        "{historyItem.query}"
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {historyItem.resultCount} results • {formatDistanceToNow(historyItem.timestamp, { addSuffix: true })}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default QueryInterface;