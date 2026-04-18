const express = require('express');
const router = express.Router();
const axios = require('axios');

// ── Groq LLM caller (fast, reliable) ─────────────────────────────────────────
const callGroq = async (prompt) => {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );
  return response.data?.choices?.[0]?.message?.content || '';
};

const callLLM = async (prompt) => {
  const provider = process.env.LLM_PROVIDER || 'groq';
  console.log(`[LabAnalyzer] LLM provider: ${provider}`);
  
  if (provider === 'groq') {
    return callGroq(prompt);
  }
  
  // Fallback for other providers
  if (provider === 'ollama') {
    const response = await axios.post(
      `${process.env.OLLAMA_BASE_URL}/api/chat`,
      {
        model: process.env.OLLAMA_MODEL || 'llama3.2',
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: { temperature: 0.2, num_predict: 2000 },
      },
      { timeout: 180000 }
    );
    return response.data?.message?.content || '';
  }
  
  throw new Error(`Unknown provider: ${provider}`);
};

// ── Build the analysis prompt ─────────────────────────────────────────────────
const buildAnalysisPrompt = (reportText, context) => `You are a medical lab report analyzer AI. Analyze the following lab report and return a structured, professional response.

EXTRACTED LAB REPORT TEXT:
${reportText}

ADDITIONAL PATIENT CONTEXT:
${context || 'No additional context provided.'}

Return your analysis using EXACTLY this format with these exact section headers:

**Abnormal Values**
For each abnormal value found, list it as:
- Test Name: [name] | Your Value: [value] | Normal Range: [range] | Severity: [Mild/Moderate/Severe]
If no abnormal values found, state "All values appear within normal ranges."

**Health Implications**
Explain in plain language what the abnormal values may indicate. Be specific but understandable to a non-medical person.

**Recommendations**
List 3-5 concrete suggested actions:
- Whether to consult a specialist (which type)
- Whether to retest (how soon)
- Lifestyle or dietary changes supported by the findings

**Disclaimer**
This is an AI-generated analysis for informational purposes only. Always consult a qualified healthcare provider.

Be thorough, accurate, and professional. Use clear, patient-friendly language.`;

// ── POST /api/analyze ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { reportText, context } = req.body;

    if (!reportText || reportText.trim().length < 10) {
      return res.status(400).json({
        error: 'Report text is required and must be meaningful content.',
      });
    }

    console.log(`[LabAnalyzer] Analyzing report (${reportText.length} chars)`);

    const prompt = buildAnalysisPrompt(reportText.trim(), context?.trim() || '');
    const rawAnswer = await callLLM(prompt);

    if (!rawAnswer) {
      return res.status(500).json({ error: 'LLM returned empty response.' });
    }

    console.log(`[LabAnalyzer] Analysis complete (${rawAnswer.length} chars)`);
    res.json({ analysis: rawAnswer });

  } catch (error) {
    console.error('[LabAnalyzer] Error:', error.message);
    res.status(500).json({
      error: 'Analysis failed. Please try again.',
      details: error.message,
    });
  }
});

module.exports = router;
