// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container, TextField, Button, Typography, Box, Paper, Alert } from '@mui/material';
import axios from 'axios';
import Dashboard from './Dashboard';

// This safely removes any accidental trailing slash from your Render URL
const rawApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_URL = rawApiUrl.replace(/\/$/, '');

function SurveyForm() {
  const [formData, setFormData] = useState({ q1: '', q2: '', q3: '' });
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      console.log("Attempting to submit to:", `${API_URL}/api/responses`);
      await axios.post(`${API_URL}/api/responses`, formData);
      setStatus('success');
      setFormData({ q1: '', q2: '', q3: '' });
    } catch (error) {
      console.error("Submission error:", error);
      setStatus('error');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 5, mb: 5 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
            Fatima Group Collaboration Survey
          </Typography>
          
          {status === 'success' && <Alert severity="success" sx={{ mb: 2 }}>Response submitted successfully!</Alert>}
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
              <Button type="submit" variant="contained" color="primary" size="large" fullWidth>
                Submit Response
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SurveyForm />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;