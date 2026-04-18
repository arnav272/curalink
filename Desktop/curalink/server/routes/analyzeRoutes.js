const express  = require('express');
const router   = express.Router();
const axios    = require('axios');

// ── LLM caller (mirrors llmService.js but with its own prompt) ───────────────
const callOllama = async (prompt) => {
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
};

const callHuggingFace = async (prompt) => {
  const response = await axios.post(
    process.env.HF_MODEL_URL,
    {
      inputs: prompt,
      parameters: { max_new_tokens: 2000, temperature: 0.2, return_full_text: false },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 180000,
    }
  );
  return response.data?.[0]?.generated_text || '';
};

const callLLM = async (prompt) => {
  const provider = process.env.LLM_PROVIDER || 'ollama';
  console.log(`[LabAnalyzer] LLM provider: ${provider}`);
  if (provider === 'ollama') return callOllama(prompt);
  if (provider === 'huggingface') return callHuggingFace(prompt);
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
Explain in plain language what the abnormal values may indicate. Be specific but understandable to a non-medical person. If values are normal, provide a brief positive summary.

**Recommendations**
List 3-5 concrete suggested actions:
- Whether to consult a specialist (which type)
- Whether to retest (how soon)
- Lifestyle or dietary changes supported by the findings
- Any urgent follow-up needed

**Disclaimer**
This is an AI-generated analysis for informational purposes only. It does not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider before making any medical decisions. In case of emergency, contact emergency services immediately.

Be thorough, accurate, and professional. Use clear, patient-friendly language.`;

// ── POST /api/analyze ─────────────────────────────────────────────────────────
// Accepts JSON with { reportText, context }
// Frontend extracts text from PDF/image before sending
router.post('/', async (req, res) => {
  try {
    const { reportText, context } = req.body;

    if (!reportText || reportText.trim().length < 10) {
      return res.status(400).json({
        error: 'Report text is required and must be meaningful content.',
      });
    }

    console.log(`[LabAnalyzer] Analyzing report (${reportText.length} chars)`);

    const prompt   = buildAnalysisPrompt(reportText.trim(), context?.trim() || '');
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