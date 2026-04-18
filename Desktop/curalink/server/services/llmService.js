const axios = require('axios');

// ── System prompt ─────────────────────────────────────────────────────────────
const buildSystemPrompt = (patientContext) => {
  const { disease, location, name } = patientContext;
  const patientRef = name ? `patient ${name}` : 'the patient';

  return `You are Curalink, an expert AI Medical Research Assistant specializing in evidence-based medical research synthesis.

PRIMARY MEDICAL CONTEXT:
- Condition being researched: ${disease}
- Patient location: ${location || 'not specified'}
- You are assisting ${patientRef}

CRITICAL CONTEXT RULES (follow strictly):
1. CONVERSATION MEMORY: You MUST maintain context across the conversation. When the user uses pronouns like "it", "this", "that", "these treatments", "the condition" — they are ALWAYS referring to "${disease}" unless explicitly stated otherwise.
2. FOLLOW-UP DETECTION: If the user asks a follow-up question (e.g., "Can I take Vitamin D?", "What about surgery?", "Are there side effects?"), connect it to "${disease}" and look for evidence in the provided sources.
3. EVIDENCE GUARDRAIL: If the provided research sources do NOT contain relevant information about the user's specific question, you MUST say: "I cannot find direct evidence in the current research results for [specific question] in the context of ${disease}. The available sources focus on [what they do cover]. I recommend consulting a specialist or searching specifically for [refined query]." Do NOT answer from general knowledge when sources are insufficient.
4. NEVER switch the medical condition being discussed unless the user explicitly states a completely new condition.
5. LOCATION AWARENESS: When clinical trials mention location, note whether they are relevant to ${location || 'the patient location'}.

MANDATORY OUTPUT FORMAT — Always use this exact structure:

## Condition Overview
[2-3 sentences about ${disease} relevant to the user's specific question]

## Research Insights
[4-6 numbered insights drawn ONLY from the provided sources. Each must end with its citation like [Source 1]]

## Clinical Trials
[List trials from sources relevant to ${disease}. Include recruiting status, location if available]

## Summary
[2-3 sentence actionable conclusion]`;

};

// ── User message builder ──────────────────────────────────────────────────────
const buildUserMessage = (query, sources, conversationHistory) => {
  let historyBlock = '';
  if (conversationHistory && conversationHistory.length > 0) {
    historyBlock = `Previous conversation:\n${conversationHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n\n`;
  }

  const sourcesBlock = sources.length > 0
    ? sources.map((s, i) => `[Source ${i + 1}] ${s.platform} (${s.year})\nTitle: ${s.title}\nAuthors: ${s.authors}\nAbstract: ${s.snippet}\nURL: ${s.url}`).join('\n\n')
    : 'No relevant sources retrieved for this query.';

  return `${historyBlock}Current question: ${query}\n\nResearch sources (use ONLY these):\n${sourcesBlock}\n\nProvide a structured answer with citations.`;
};

// ── Ollama ────────────────────────────────────────────────────────────────────
const callOllama = async (systemPrompt, userMessage) => {
  const response = await axios.post(
    `${process.env.OLLAMA_BASE_URL}/api/chat`,
    {
      model: process.env.OLLAMA_MODEL || 'llama3.2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage   },
      ],
      stream: false,
      options: { temperature: 0.2, num_predict: 2000 },
    },
    { timeout: 120000 }
  );
  return response.data?.message?.content || 'No response generated';
};

// ── Groq API ──────────────────────────────────────────────────────────────────
const callGroq = async (systemPrompt, userMessage) => {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt.substring(0, 3000) },
          { role: 'user', content: userMessage.substring(0, 4000) }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );
    return response.data?.choices?.[0]?.message?.content || 'No response generated';
  } catch (error) {
    console.error('Groq API Error:', error.response?.data || error.message);
    throw error;
  }
};

// ── Main export ───────────────────────────────────────────────────────────────
const generateLLMResponse = async (query, sources, conversationHistory = [], patientContext = {}) => {
  const systemPrompt = buildSystemPrompt(patientContext);
  const userMessage  = buildUserMessage(query, sources, conversationHistory);
  const provider     = process.env.LLM_PROVIDER || 'ollama';

  console.log(`[LLM] Provider: ${provider} | Sources: ${sources.length} | History: ${conversationHistory.length} msgs`);

  try {
    let answer;
    if (provider === 'ollama') {
      answer = await callOllama(systemPrompt, userMessage);
    } else if (provider === 'groq') {
      answer = await callGroq(systemPrompt, userMessage);
    } else {
      throw new Error(`Unknown LLM provider: ${provider}`);
    }

    console.log(`[LLM] Response: ${answer.length} chars`);
    return { answer };

  } catch (error) {
    console.error(`[LLM] Error: ${error.message}`);
    return {
      answer: `## Error\nUnable to generate response. Please check your LLM configuration.\n\nError: ${error.message}`,
    };
  }
};

module.exports = { generateLLMResponse };
