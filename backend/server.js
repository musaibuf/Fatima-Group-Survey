// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');
const PptxGenJS = require('pptxgenjs');

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const createTableQuery = `
CREATE TABLE IF NOT EXISTS responses (
    id SERIAL PRIMARY KEY,
    q1 TEXT NOT NULL,
    q2 TEXT NOT NULL,
    q3 TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;
pool.query(createTableQuery).catch(err => console.error("Error creating table:", err));

// Claude AI Setup
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

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
        res.status(500).json({ error: 'Database error' });
    }
});

// 2. API to Get All Responses
app.get('/api/responses', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM responses ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// 3. API to Summarize with Claude & Generate PPTX
// 3. API to Summarize with Claude & Generate PPTX
app.post('/api/summarize', async (req, res) => {
    try {
        const result = await pool.query('SELECT q1, q2, q3 FROM responses');
        const responses = result.rows;

        if (responses.length === 0) {
            return res.status(400).json({ error: 'No responses to summarize.' });
        }

        let promptData = responses.map((r, index) => 
            `Response ${index + 1}:\nQ1: ${r.q1}\nQ2: ${r.q2}\nQ3: ${r.q3}\n`
        ).join('\n');

        const prompt = `
        You are an HR analyst. Analyze the following employee feedback regarding collaboration at Fatima Group.
        Identify 3 to 5 common themes and a list of 5 to 10 buzzwords used by the employees.
        
        You MUST return ONLY a valid JSON object. Do not include any introductory text, and do not use markdown formatting. Just the raw JSON.
        {
          "buzzwords": ["word1", "word2", "word3"],
          "themes": [
            { "title": "Theme Title", "description": "Detailed description of the theme based on the data." }
          ]
        }
        
        Data:
        ${promptData}
        `;

        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error("ANTHROPIC_API_KEY is missing on the server.");
        }

        // Call Claude 3 Opus
        const msg = await anthropic.messages.create({
            model: "claude-3-opus-20240229",
            max_tokens: 2000,
            temperature: 0.2,
            messages: [{ role: "user", content: prompt }]
        });

        let rawText = msg.content[0].text.trim();
        
        // BULLETPROOF JSON EXTRACTION: Find the first '{' and last '}'
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1) {
            throw new Error("Claude did not return valid JSON.");
        }
        const jsonString = rawText.substring(firstBrace, lastBrace + 1);
        const parsedData = JSON.parse(jsonString);

        // Generate PowerPoint
        let pres = new PptxGenJS();
        
        let slide1 = pres.addSlide();
        slide1.addText("Fatima Group", { x: 0.5, y: 1.5, w: 9, fontSize: 36, bold: true, color: "4CAF50", align: "center" });
        slide1.addText("Collaboration Survey Analysis", { x: 0.5, y: 2.5, w: 9, fontSize: 24, color: "333333", align: "center" });

        let slide2 = pres.addSlide();
        slide2.addText("Common Buzzwords", { x: 0.5, y: 0.5, w: 9, fontSize: 28, bold: true, color: "4CAF50" });
        slide2.addText(parsedData.buzzwords.join(" • "), { x: 0.5, y: 1.5, w: 9, fontSize: 20, color: "555555" });

        parsedData.themes.forEach((theme, idx) => {
            let slide = pres.addSlide();
            slide.addText(`Theme ${idx + 1}: ${theme.title}`, { x: 0.5, y: 0.5, w: 9, fontSize: 24, bold: true, color: "4CAF50" });
            slide.addText(theme.description, { x: 0.5, y: 1.5, w: 9, fontSize: 18, color: "333333" });
        });

        const buffer = await pres.write('nodebuffer');
        res.writeHead(200, {
            'Content-Disposition': 'attachment; filename="Fatima_Group_Analysis.pptx"',
            'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Content-Length': buffer.length
        });
        res.end(buffer);

    } catch (err) {
        console.error("CLAUDE/PPT ERROR:", err);
        res.status(500).json({ error: 'Analysis error', details: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));