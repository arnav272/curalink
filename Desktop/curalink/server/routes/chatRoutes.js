const express = require('express');
const router  = express.Router();
const Chat    = require('../models/Chat');
const { rankResults }            = require('../utils/ranker');
const { expandQuery }            = require('../utils/queryExpander');
const { fetchPubMedData }        = require('../services/pubmedService');
const { fetchOpenAlexData }      = require('../services/openAlexService');
const { fetchClinicalTrialsData }= require('../services/clinicalTrialsService');
const { generateLLMResponse }    = require('../services/llmService');

// POST /api/chat/query
router.post('/query', async (req, res) => {
  try {
    const { message, sessionId, patientContext } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Message and sessionId are required' });
    }

    const disease  = patientContext?.disease  || '';
    const location = patientContext?.location || '';

    // Expand query
    const expandedQuery = expandQuery(message, disease);
    console.log(`🔍 Query: "${message}" → "${expandedQuery}"`);

    // ── Load existing chat (upsert — never create duplicate) ──────────────────
    // findOneAndUpdate with upsert=true is atomic and never causes duplicate key
    let chat = await Chat.findOneAndUpdate(
      { sessionId },
      {
        $setOnInsert: {
          sessionId,
          patientContext: patientContext || {},
          messages: [],
          createdAt: new Date(),
        },
        $set: { updatedAt: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Last 3 exchanges (6 messages) for context
    const recentHistory = chat.messages.slice(-6).map(m => ({
      role:    m.role,
      content: m.content,
    }));
    console.log(`📜 History: ${recentHistory.length} messages`);

    // ── Parallel API fetch ────────────────────────────────────────────────────
    const [pubmedRes, openAlexRes, clinicalRes] = await Promise.allSettled([
      fetchPubMedData(expandedQuery),
      fetchOpenAlexData(expandedQuery),
      fetchClinicalTrialsData(expandedQuery),
    ]);

    const pubmed   = pubmedRes.status   === 'fulfilled' ? pubmedRes.value   : [];
    const openAlex = openAlexRes.status === 'fulfilled' ? openAlexRes.value : [];
    const clinical = clinicalRes.status === 'fulfilled' ? clinicalRes.value : [];

    const allResults = [...pubmed, ...openAlex, ...clinical];
    console.log(`📊 PubMed:${pubmed.length} OpenAlex:${openAlex.length} ClinicalTrials:${clinical.length}`);

    // ── Rank ──────────────────────────────────────────────────────────────────
    const topResults = rankResults(allResults, message, disease, 8);
    console.log(`🏆 Top ${topResults.length} selected`);

    // ── LLM ───────────────────────────────────────────────────────────────────
    const llmResponse = await generateLLMResponse(
      message, topResults, recentHistory,
      { disease, location, name: patientContext?.name || '' }
    );

    // ── Persist with $push — never overwrite, just append ─────────────────────
    await Chat.findOneAndUpdate(
      { sessionId },
      {
        $push: {
          messages: {
            $each: [
              { role: 'user',      content: message,             timestamp: new Date() },
              { role: 'assistant', content: llmResponse.answer,
                sources: topResults.map(r => ({
                  title:    r.title,
                  authors:  r.authors,
                  year:     r.year,
                  platform: r.platform,
                  url:      r.url,
                  snippet:  r.snippet,
                })),
                timestamp: new Date(),
              },
            ],
          },
        },
        $set: { updatedAt: new Date() },
      }
    );

    res.json({ answer: llmResponse.answer, sources: topResults, sessionId });

  } catch (error) {
    console.error('❌ Chat query error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/chat/history/:sessionId
router.get('/history/:sessionId', async (req, res) => {
  try {
    const chat = await Chat.findOne({ sessionId: req.params.sessionId });
    if (!chat) return res.json({ messages: [], sessionId: req.params.sessionId });
    res.json({ messages: chat.messages, patientContext: chat.patientContext, sessionId: chat.sessionId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// DELETE /api/chat/history/:sessionId
router.delete('/history/:sessionId', async (req, res) => {
  try {
    await Chat.findOneAndDelete({ sessionId: req.params.sessionId });
    res.json({ message: 'Chat history cleared', sessionId: req.params.sessionId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete history' });
  }
});

module.exports = router;