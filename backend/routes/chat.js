const express = require('express');
const Groq = require('groq-sdk');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/auth');

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Multer — store in memory, max 10MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const LANG_INSTRUCTIONS = {
  en: 'Respond in English.',
  hi: 'Respond entirely in Hindi (हिन्दी). Use Devanagari script.',
  bn: 'Respond entirely in Bengali (বাংলা). Use Bengali script.',
  mr: 'Respond entirely in Marathi (मराठी). Use Devanagari script.',
  ta: 'Respond entirely in Tamil (தமிழ்). Use Tamil script.',
  te: 'Respond entirely in Telugu (తెలుగు). Use Telugu script.',
};

const buildSystemPrompt = (language = 'en') => {
  const langInstruction = LANG_INSTRUCTIONS[language] || LANG_INSTRUCTIONS.en;
  return `You are NyayBot, an expert Indian legal assistant. Your role is to help Indian citizens understand their legal rights and the law.

You cover: IPC (Indian Penal Code), CrPC (Code of Criminal Procedure), RTI Act 2005, Consumer Protection Act 2019, Domestic Violence Act 2005, POCSO Act 2012, IT Act 2000, Hindu Marriage Act, Hindu Succession Act, Transfer of Property Act, Labour laws, Dowry Prohibition Act, and Indian Constitution.

Guidelines:
- Be clear, accurate, and helpful
- Cite specific sections and acts when relevant (e.g., "Section 498A, IPC" or "Section 8, RTI Act 2005")
- Where applicable, mention relevant Supreme Court or High Court judgments briefly
- Always end with: "This is general legal information, not legal advice. For your specific situation, consult a qualified advocate."
- If asked about non-Indian law, politely redirect
- Keep answers concise but complete
- Use simple language — many users may not have legal background

LANGUAGE INSTRUCTION: ${langInstruction}`;
};

// POST /api/chat/message — streaming response
router.post('/message', protect, async (req, res) => {
  const { message, chatId, history = [], language = 'en' } = req.body;
  if (!message) return res.status(400).json({ message: 'Message is required' });

  try {
    const messages = [
      { role: 'system', content: buildSystemPrompt(language) },
      ...history.slice(-10),
      { role: 'user', content: message },
    ];

    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1200,
      temperature: 0.7,
      stream: true,
    });

    let fullReply = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullReply += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    // Save to DB after streaming completes
    let chat;
    if (chatId) {
      chat = await Chat.findById(chatId);
      if (chat && chat.user.toString() === req.user._id.toString()) {
        chat.messages.push({ role: 'user', content: message });
        chat.messages.push({ role: 'assistant', content: fullReply });
        await chat.save();
      }
    } else {
      chat = await Chat.create({
        user: req.user._id,
        messages: [
          { role: 'user', content: message },
          { role: 'assistant', content: fullReply },
        ],
      });
    }

    res.write(`data: ${JSON.stringify({ done: true, chatId: chat._id, title: chat.title })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Groq error:', err.message);
    try {
      res.write(`data: ${JSON.stringify({ error: 'AI service error: ' + err.message })}\n\n`);
      res.end();
    } catch (_) {}
  }
});

// GET /api/chat/history
router.get('/history', protect, async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user._id })
      .select('title createdAt updatedAt')
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/chat/analytics — stats for dashboard
router.get('/analytics', protect, async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user._id });
    const totalChats = chats.length;
    const totalMessages = chats.reduce((sum, c) => sum + c.messages.filter(m => m.role === 'user').length, 0);

    // Messages per day (last 30 days)
    const now = new Date();
    const dailyMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = 0;
    }
    chats.forEach(c => {
      c.messages.forEach(m => {
        if (m.role === 'user') {
          const key = new Date(m.timestamp).toISOString().slice(0, 10);
          if (dailyMap[key] !== undefined) dailyMap[key]++;
        }
      });
    });
    const dailyActivity = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

    // Top topics (simple keyword detection)
    const topicCounts = { RTI: 0, IPC: 0, Consumer: 0, 'Domestic Violence': 0, Labour: 0, Property: 0, Family: 0, Cyber: 0 };
    chats.forEach(c => {
      c.messages.forEach(m => {
        const t = m.content.toLowerCase();
        if (t.includes('rti') || t.includes('right to information')) topicCounts.RTI++;
        if (t.includes('ipc') || t.includes('penal code') || t.includes('fir') || t.includes('section 4')) topicCounts.IPC++;
        if (t.includes('consumer') || t.includes('refund') || t.includes('product')) topicCounts.Consumer++;
        if (t.includes('domestic violence') || t.includes('498a') || t.includes('dowry')) topicCounts['Domestic Violence']++;
        if (t.includes('labour') || t.includes('employment') || t.includes('wages') || t.includes('worker')) topicCounts.Labour++;
        if (t.includes('property') || t.includes('land') || t.includes('rent') || t.includes('tenant')) topicCounts.Property++;
        if (t.includes('marriage') || t.includes('divorce') || t.includes('custody') || t.includes('family')) topicCounts.Family++;
        if (t.includes('cyber') || t.includes('online fraud') || t.includes('it act') || t.includes('hacking')) topicCounts.Cyber++;
      });
    });
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));

    res.json({ totalChats, totalMessages, dailyActivity, topTopics });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/chat/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat || chat.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/chat/all/clear
router.delete('/all/clear', protect, async (req, res) => {
  try {
    await Chat.deleteMany({ user: req.user._id });
    res.json({ message: 'All chats cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/chat/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat || chat.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    await chat.deleteOne();
    res.json({ message: 'Chat deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/chat/analyze-document — extract text and stream legal analysis
router.post('/analyze-document', protect, upload.single('document'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const { language = 'en', chatId } = req.body;
  const { mimetype, buffer, originalname } = req.file;

  try {
    // ── Extract text from file ────────────────────────────────────────────
    let extractedText = '';

    if (mimetype === 'application/pdf') {
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (mimetype.startsWith('image/')) {
      // For images, describe what we have — Groq doesn't support vision in this flow
      // so we let Groq know it's an image and ask for guidance
      extractedText = `[Image file: ${originalname}. The user has uploaded an image document for legal analysis. Since direct image OCR is not available, please inform the user that image documents cannot be read directly and suggest they convert to PDF or type out the key text.]`;
    } else {
      return res.status(400).json({ message: 'Unsupported file type' });
    }

    if (!extractedText || extractedText.trim().length < 20) {
      return res.status(400).json({ message: 'Could not extract text from the document. The file may be scanned or image-only. Try a text-based PDF or DOCX.' });
    }

    // Truncate to avoid token limits (keep first 4000 chars)
    const truncated = extractedText.slice(0, 4000);
    const wasTruncated = extractedText.length > 4000;

    const userPrompt = `I have uploaded a legal document named "${originalname}". Please analyze it and provide:

1. **Document Type** — What kind of document is this? (contract, FIR copy, court notice, RTI reply, etc.)
2. **Key Parties** — Who are the parties involved?
3. **Main Subject** — What is the document about in simple language?
4. **Important Clauses / Points** — List the key legal points, obligations, rights, or risks mentioned.
5. **Potential Legal Issues** — Are there any red flags, unusual clauses, or areas of concern?
6. **Recommended Action** — What should the person reading this document do next?

Document content:
---
${truncated}
${wasTruncated ? '\n[Document truncated for analysis — first 4000 characters shown]' : ''}
---`;

    // ── Stream response ───────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: buildSystemPrompt(language) },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1500,
      temperature: 0.5,
      stream: true,
    });

    let fullReply = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullReply += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    // Save to DB
    let chat;
    const userContent = `📎 Document analysis: ${originalname}`;
    if (chatId) {
      chat = await Chat.findById(chatId);
      if (chat && chat.user.toString() === req.user._id.toString()) {
        chat.messages.push({ role: 'user', content: userContent });
        chat.messages.push({ role: 'assistant', content: fullReply });
        await chat.save();
      }
    } else {
      chat = await Chat.create({
        user: req.user._id,
        title: `Document: ${originalname.slice(0, 40)}`,
        messages: [
          { role: 'user', content: userContent },
          { role: 'assistant', content: fullReply },
        ],
      });
    }

    res.write(`data: ${JSON.stringify({ done: true, chatId: chat._id, title: chat.title })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Document analysis error:', err.message);
    try {
      res.write(`data: ${JSON.stringify({ error: 'Analysis failed: ' + err.message })}\n\n`);
      res.end();
    } catch (_) {}
  }
});

module.exports = router;
