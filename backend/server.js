// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL Connection (Render ready)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Render/Neon/Supabase
});

// Gemini AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. API to Submit Form
app.post('/api/responses', async (req, res) => {
    const { q1, q2, q3 } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO responses (q1, q2, q3) VALUES ($1, $2, $3) RETURNING *',
            [q1, q2, q3]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 2. API to Get All Responses
app.get('/api/responses', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM responses ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 3. API to Summarize with Gemini
app.post('/api/summarize', async (req, res) => {
    try {
        // Fetch all responses
        const result = await pool.query('SELECT q1, q2, q3 FROM responses');
        const responses = result.rows;

        if (responses.length === 0) {
            return res.status(400).json({ error: 'No responses to summarize.' });
        }

        // Format data for the AI prompt
        let promptData = responses.map((r, index) => 
            `Response ${index + 1}:\nQ1 (Tenure/Collaboration): ${r.q1}\nQ2 (Shortcomings): ${r.q2}\nQ3 (Improvements): ${r.q3}\n`
        ).join('\n');

        const prompt = `
        You are an HR analyst. Analyze the following employee feedback regarding collaboration at Fatima Group.
        Based on the data, identify and summarize 3 to 5 common themes. 
        Format the output clearly with bullet points.
        
        Data:
        ${promptData}
        `;

        // Call Gemini 1.5 Flash
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const aiResult = await model.generateContent(prompt);
        const responseText = aiResult.response.text();

        res.status(200).json({ summary: responseText });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'AI Summarization error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));