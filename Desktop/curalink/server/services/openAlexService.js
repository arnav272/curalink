const axios = require('axios');
const { withRetry } = require('../middleware/rateLimiter');
const { mapOpenAlexWork } = require('../utils/dataMapper');

const OPENALEX_BASE = 'https://api.openalex.org/works';

const fetchOpenAlexData = async (query) => {
  try {
    console.log(`[OpenAlex] Searching: ${query}`);

    // Fetch two pages for broader pool
    const [page1, page2] = await Promise.allSettled([
      withRetry(() =>
        axios.get(OPENALEX_BASE, {
          params: {
            search: query,
            'per-page': 40,
            page: 1,
            sort: 'relevance_score:desc',
            filter: 'from_publication_date:2018-01-01',
          },
          headers: {
            'User-Agent': 'Curalink/1.0 (mailto:curalink@example.com)',
          },
          timeout: 10000,
        })
      ),
      withRetry(() =>
        axios.get(OPENALEX_BASE, {
          params: {
            search: query,
            'per-page': 40,
            page: 2,
            sort: 'relevance_score:desc',
            filter: 'from_publication_date:2018-01-01',
          },
          headers: {
            'User-Agent': 'Curalink/1.0 (mailto:curalink@example.com)',
          },
          timeout: 10000,
        })
      ),
    ]);

    const results = [];

    if (page1.status === 'fulfilled') {
      const works = page1.value.data?.results || [];
      results.push(...works.map(mapOpenAlexWork).filter(Boolean));
    }

    if (page2.status === 'fulfilled') {
      const works = page2.value.data?.results || [];
      results.push(...works.map(mapOpenAlexWork).filter(Boolean));
    }

    console.log(`[OpenAlex] Mapped ${results.length} works`);
    return results;

  } catch (error) {
    console.error(`[OpenAlex] Error: ${error.message}`);
    return [];
  }
};

module.exports = { fetchOpenAlexData };