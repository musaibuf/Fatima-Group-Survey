// src/Dashboard.js
import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, Button, CircularProgress, Card, CardContent, Divider } from '@mui/material';
import axios from 'axios';

// Safely remove trailing slash here too
const rawApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_URL = rawApiUrl.replace(/\/$/, '');

function Dashboard() {
  const [responses, setResponses] = useState([]);
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/responses`);
      setResponses(res.data);
    } catch (error) {
      console.error("Error fetching responses", error);
    }
  };

  const generateSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await axios.post(`${API_URL}/api/summarize`);
      setSummary(res.data.summary);
    } catch (error) {
      console.error("Error generating summary", error);
      setSummary("Failed to generate summary. Please try again.");
    }
    setLoadingSummary(false);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 5, mb: 5 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Survey Responses Dashboard
        </Typography>

        {/* AI Summary Section */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, bgcolor: '#f3f6f9' }}>
          <Typography variant="h5" gutterBottom color="primary">
            AI Theme Analysis (Gemini Flash)
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Click the button below to analyze all responses and find 3-5 common themes.
          </Typography>
          
          <Box sx={{ mt: 2, mb: 2 }}>
            <Button 
              variant="contained" 
              color="secondary" 
              onClick={generateSummary} 
              disabled={loadingSummary || responses.length === 0}
            >
              {loadingSummary ? <CircularProgress size={24} color="inherit" /> : "Generate AI Summary"}
            </Button>
          </Box>

          {summary && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #ddd' }}>
              <Typography component="div" sx={{ whiteSpace: 'pre-wrap' }}>
                {summary}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Individual Responses Section */}
        <Typography variant="h5" gutterBottom>
          All Individual Responses ({responses.length})
        </Typography>
        
        {responses.map((res, index) => (
          <Card key={res.id} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Response #{responses.length - index} - {new Date(res.created_at).toLocaleDateString()}
              </Typography>
              <Divider sx={{ my: 1 }} />
              
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>Q1: Tenure & Importance</Typography>
              <Typography variant="body2" paragraph>{res.q1}</Typography>

              <Typography variant="subtitle1" fontWeight="bold">Q2: Shortcomings</Typography>
              <Typography variant="body2" paragraph>{res.q2}</Typography>

              <Typography variant="subtitle1" fontWeight="bold">Q3: Improvements</Typography>
              <Typography variant="body2">{res.q3}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Container>
  );
}

export default Dashboard;