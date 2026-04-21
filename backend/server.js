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
You are a senior HR analyst specializing in organizational behavior and workplace culture.

Below are employee survey responses about collaboration at Fatima Group. Your job is to:
1. Identify 3–5 recurring THEMES — patterns in how employees feel, what they struggle with, or what they value most. Each theme should have a short punchy title and a 2–3 sentence description grounded in the actual responses.
2. Extract 5–10 BUZZWORDS — specific words or short phrases that multiple employees used or that best capture the sentiment of the responses (e.g. "silos", "ownership", "clarity").
3. Write a brief OVERALL SUMMARY (2–3 sentences) that captures the big picture of what employees are saying about collaboration.
4. Generate a SLIDES array for a PowerPoint presentation. You must include slides for the summary, buzzwords, and each theme — but feel free to add any extra slides if you spot something interesting, surprising, or worth highlighting (e.g. a standout pattern, a concern that needs urgent attention, a positive trend worth celebrating, a recommendation). Be creative and analytical. Each slide needs a short punchy title and concise body content.

Be specific and analytical — avoid vague corporate-speak. Base everything on what the data actually says.

You MUST return ONLY a valid JSON object. No introductory text, no markdown, no backticks. Raw JSON only.
{
  "summary": "Overall summary here.",
  "buzzwords": ["word1", "word2", "word3"],
  "themes": [
    { "title": "Theme Title", "description": "2–3 sentence description grounded in the responses." }
  ],
  "slides": [
    { "title": "Slide Title", "content": "Slide body text." }
  ]
}

Survey Data:
${promptData}
`;

        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error("ANTHROPIC_API_KEY is missing on the server.");
        }

        const msg = await anthropic.messages.create({
            model: "claude-opus-4-6",
            max_tokens: 6000,
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

        // ── Design tokens ──────────────────────────────────────────────
        const DARK_BG   = "1A2B3C";   // deep navy  — title / closing slides
        const LIGHT_BG  = "F4F7FB";   // off-white  — content slides
        const ACCENT    = "2ECC71";   // green accent
        const ACCENT2   = "27AE60";   // darker green for shapes
        const TEXT_DARK = "1A2B3C";   // body text on light bg
        const TEXT_LITE = "FFFFFF";   // body text on dark bg
        const MUTED     = "7F8C8D";   // caption / sub-text

        // ── Generate PowerPoint ────────────────────────────────────────
        let pres = new PptxGenJS();
        pres.layout = 'LAYOUT_16x9';

        // ── Slide 1: Title (dark) ──────────────────────────────────────
        let titleSlide = pres.addSlide();
        titleSlide.background = { color: DARK_BG };

        // Accent bar on left
        titleSlide.addShape(pres.shapes.RECTANGLE, {
            x: 0, y: 0, w: 0.18, h: 5.625,
            fill: { color: ACCENT }, line: { color: ACCENT }
        });

        titleSlide.addText("Fatima Group", {
            x: 0.5, y: 1.6, w: 9, h: 0.9,
            fontSize: 44, bold: true, color: TEXT_LITE,
            fontFace: "Calibri", align: "center"
        });
        titleSlide.addText("Collaboration Survey Analysis", {
            x: 0.5, y: 2.6, w: 9, h: 0.6,
            fontSize: 22, color: ACCENT, fontFace: "Calibri",
            align: "center", charSpacing: 2
        });
        titleSlide.addText("Powered by Employee Feedback", {
            x: 0.5, y: 3.4, w: 9, h: 0.4,
            fontSize: 13, color: MUTED, fontFace: "Calibri",
            align: "center", italic: true
        });

        // ── Helper: content slide (light bg) ──────────────────────────
        function addContentSlide(titleText, bodyText) {
            let slide = pres.addSlide();
            slide.background = { color: LIGHT_BG };

            // Top accent bar
            slide.addShape(pres.shapes.RECTANGLE, {
                x: 0, y: 0, w: 10, h: 0.08,
                fill: { color: ACCENT }, line: { color: ACCENT }
            });

            // Left accent stripe behind title
            slide.addShape(pres.shapes.RECTANGLE, {
                x: 0.4, y: 0.3, w: 0.06, h: 0.75,
                fill: { color: ACCENT2 }, line: { color: ACCENT2 }
            });

            // Title
            slide.addText(titleText, {
                x: 0.6, y: 0.28, w: 9.0, h: 0.8,
                fontSize: 22, bold: true, color: TEXT_DARK,
                fontFace: "Calibri", valign: "middle"
            });

            // Divider line
            slide.addShape(pres.shapes.LINE, {
                x: 0.4, y: 1.15, w: 9.2, h: 0,
                line: { color: "D5E8F0", width: 1.2 }
            });

            // Body text card
            slide.addShape(pres.shapes.RECTANGLE, {
                x: 0.4, y: 1.3, w: 9.2, h: 3.8,
                fill: { color: "FFFFFF" },
                line: { color: "E0E9F4", width: 0.5 },
                shadow: { type: "outer", blur: 8, offset: 2, angle: 135, color: "000000", opacity: 0.07 }
            });

            slide.addText(bodyText, {
                x: 0.65, y: 1.45, w: 8.7, h: 3.5,
                fontSize: 15, color: TEXT_DARK, fontFace: "Calibri",
                valign: "top", wrap: true
            });

            return slide;
        }

        // ── Render all slides Opus decided ────────────────────────────
        parsedData.slides.forEach((s) => {
            addContentSlide(s.title, s.content);
        });

        // ── Last slide: closing (dark) ─────────────────────────────────
        let endSlide = pres.addSlide();
        endSlide.background = { color: DARK_BG };

        endSlide.addShape(pres.shapes.RECTANGLE, {
            x: 0, y: 0, w: 0.18, h: 5.625,
            fill: { color: ACCENT }, line: { color: ACCENT }
        });

        endSlide.addText("Thank You", {
            x: 0.5, y: 1.8, w: 9, h: 0.9,
            fontSize: 40, bold: true, color: TEXT_LITE,
            fontFace: "Calibri", align: "center"
        });
        endSlide.addText("Fatima Group · Collaboration Survey", {
            x: 0.5, y: 2.85, w: 9, h: 0.45,
            fontSize: 15, color: MUTED, fontFace: "Calibri",
            align: "center", italic: true
        });

        // ── Write & send ───────────────────────────────────────────────
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