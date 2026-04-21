// src/Dashboard.js
import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, Button, CircularProgress, Card, CardContent, Divider } from '@mui/material';
import axios from 'axios';

const rawApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_URL = rawApiUrl.replace(/\/$/, '');

function Dashboard() {
  const [responses, setResponses] = useState([]);
  const [summaryStatus, setSummaryStatus] = useState('');
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
    setSummaryStatus('Analyzing data with Claude Opus and generating PPTX...');
    
    try {
      const res = await axios.post(`${API_URL}/api/summarize`, {}, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Fatima_Group_Analysis.pptx');
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSummaryStatus('✅ Presentation downloaded successfully!');
    } catch (error) {
      console.error("Error generating summary", error);
      
      // Safely read the error message from the Blob
      if (error.response && error.response.data instanceof Blob) {
        const text = await error.response.data.text();
        try {
          const errData = JSON.parse(text);
          setSummaryStatus(`❌ Error: ${errData.details}`);
        } catch (e) {
          setSummaryStatus("❌ Failed to generate presentation. Check backend logs.");
        }
      } else {
        setSummaryStatus("❌ Failed to connect to the server.");
      }
    }
    setLoadingSummary(false);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 5, mb: 5 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ color: '#4CAF50' }}>
          Survey Responses Dashboard
        </Typography>

        {/* AI Summary Section */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, bgcolor: '#f3f6f9' }}>
          <Typography variant="h5" gutterBottom sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
            AI Presentation Generator (Claude Opus)
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Click below to analyze all responses, extract themes and buzzwords, and download a PowerPoint presentation.
          </Typography>
          
          <Box sx={{ mt: 2, mb: 2 }}>
            <Button 
              variant="contained" 
              onClick={generateSummary} 
              disabled={loadingSummary || responses.length === 0}
              sx={{ bgcolor: '#4CAF50', '&:hover': { bgcolor: '#388E3C' } }}
            >
              {loadingSummary ? <CircularProgress size={24} color="inherit" /> : "Generate & Download PPTX"}
            </Button>
          </Box>

          {summaryStatus && (
            <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold', color: summaryStatus.includes('❌') ? 'red' : '#4CAF50' }}>
              {summaryStatus}
            </Typography>
          )}
        </Paper>

        {/* Individual Responses Section */}
        <Typography variant="h5" gutterBottom sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
          All Individual Responses ({responses.length})
        </Typography>
        
        {responses.map((res, index) => (
          <Card key={res.id} sx={{ mb: 3, borderLeft: '5px solid #4CAF50' }}>
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