// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Box, Paper, Alert } from '@mui/material';
import axios from 'axios';
import Dashboard from './Dashboard';

const rawApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_URL = rawApiUrl.replace(/\/$/, '');

// --- 1. The Survey Form Component ---
function SurveyForm() {
  const navigate = useNavigate(); // Used to redirect the user
  const [formData, setFormData] = useState({ q1: '', q2: '', q3: '' });
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      await axios.post(`${API_URL}/api/responses`, formData);
      // On success, instantly redirect to the Thank You page
      navigate('/thank-you');
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 5, mb: 5 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ color: '#4CAF50' }}>
            Kick Off Survey
          </Typography>
          
          {status === 'error' && <Alert severity="error" sx={{ mb: 2 }}>Failed to submit response. Please try again.</Alert>}

          <form onSubmit={handleSubmit}>
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
              1. How long have you been at Fatima Group, and in your experience, how important is collaboration to getting work done here?
            </Typography>
            <TextField fullWidth multiline rows={3} name="q1" value={formData.q1} onChange={handleChange} required variant="outlined" />

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
              2. What are the top 2–3 shortcomings that hinder effective collaboration at Fatima Group?
            </Typography>
            <TextField fullWidth multiline rows={3} name="q2" value={formData.q2} onChange={handleChange} required variant="outlined" />

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
              3. What are 1–2 things that could improve collaboration in your day-to-day work?
            </Typography>
            <TextField fullWidth multiline rows={3} name="q3" value={formData.q3} onChange={handleChange} required variant="outlined" />

            <Box sx={{ mt: 4 }}>
              <Button type="submit" variant="contained" size="large" fullWidth sx={{ bgcolor: '#4CAF50', '&:hover': { bgcolor: '#388E3C' } }}>
                Submit Response
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}

// --- 2. The New Thank You Page Component ---
function ThankYou() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 10, display: 'flex', justifyContent: 'center', textAlign: 'center' }}>
        <Paper elevation={3} sx={{ p: 5, borderTop: '8px solid #4CAF50', width: '100%' }}>
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#4CAF50', mb: 2 }}>
            Thank You!
          </Typography>
          <Typography variant="h6" color="textSecondary">
            Your response has been recorded.
          </Typography>
          {/* Notice: No buttons or links here! */}
        </Paper>
      </Box>
    </Container>
  );
}

// --- 3. Main App Router ---
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SurveyForm />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;