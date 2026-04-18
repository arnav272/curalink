# Curalink - Complete Project Summary

## Environment Setup
- macOS Tahoe 26.1
- Node.js v25.9.0 installed via Homebrew
- npm v11.12.1
- MongoDB running in Docker container (mongo:7.0) on port 27017
- Ollama v0.20.7 running as background service
- Llama 3.2 model (2.0 GB) downloaded and working

## Backend Structure (server/)
- server.js - Express app on port 5001 with CORS, MongoDB connection
- config/db.js - Mongoose connection to MongoDB
- models/Chat.js - Chat session schema with messages and sources
- routes/chatRoutes.js - API endpoints for /query, /history
- services/ - API integrations
  - pubmedService.js - Fetches from PubMed API
  - openAlexService.js - Fetches from OpenAlex API  
  - clinicalTrialsService.js - Fetches from ClinicalTrials.gov API
  - llmService.js - Calls Ollama with citation-forced prompts
- utils/
  - queryExpander.js - Expands user queries
  - dataMapper.js - Normalizes 3 APIs into unified format
  - ranker.js - Scores and selects top 8 results
- middleware/rateLimiter.js - API rate limiting

## Frontend Structure (client/)
- React app created with create-react-app
- components/
  - ChatWindow.js - Main chat interface with persistent suggestions
  - MessageBubble.js - Renders user/assistant messages
  - SourceCard.js - Displays sources with expandable abstracts
  - PatientContextForm.js - Collects patient info
  - Sidebar.js - Chat history navigation
- hooks/useChat.js - Custom hook for API calls

## Working Features
- 3 APIs fetch in parallel using Promise.allSettled
- Query expansion transforms simple queries
- DataMapper normalizes PubMed, OpenAlex, ClinicalTrials formats
- Ranker scores by recency (2024-2026 priority) and keyword relevance
- LLM generates responses using ONLY provided sources
- Citations embedded with source numbers
- MongoDB saves conversation history
- Frontend shows loading states and source cards

## Current Bug
**OpenAlex title parsing error**: OpenAlex returns titles as objects like:
{
  "_": "actual title text",
  "i": [0,1,2]  // italics markers
}
The dataMapper.js cleanOpenAlexText function is not properly extracting the "_" property before saving to MongoDB. This causes "Cast to string failed" validation errors.

## Files That Need Fix
- server/utils/dataMapper.js - The cleanOpenAlexText function needs to be more aggressive
- server/models/Chat.js - Sources schema may need default values

## Deployment Status
- Backend: Running locally on port 5001
- Frontend: Running locally on port 3000
- Not yet deployed to production

## Next Steps for Hackathon
1. Fix OpenAlex title parsing bug
2. Add persistent clickable suggestions (already in ChatWindow.js)
3. Add pause/cancel button for response generation
4. Improve UI with professional app shell
5. Deploy to Render (backend) and Vercel (frontend)
6. Record Loom video demonstrating the agentic pipeline
