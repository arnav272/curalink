const axios = require('axios');
const xml2js = require('xml2js');
const { withRetry } = require('../middleware/rateLimiter');
const { mapPubMedArticle } = require('../utils/dataMapper');

const PUBMED_SEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const PUBMED_FETCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

const fetchPubMedData = async (query) => {
  try {
    console.log(`[PubMed] Searching: ${query}`);

    // Step 1 — Get IDs
    const searchRes = await withRetry(() =>
      axios.get(PUBMED_SEARCH, {
        params: {
          db: 'pubmed',
          term: query,
          retmax: 40,
          sort: 'pub date',
          retmode: 'json',
        },
        timeout: 10000,
      })
    );

    const ids = searchRes.data?.esearchresult?.idlist || [];
    if (ids.length === 0) {
      console.log('[PubMed] No IDs found');
      return [];
    }

    console.log(`[PubMed] Found ${ids.length} IDs`);

    // Step 2 — Fetch details
    const fetchRes = await withRetry(() =>
      axios.get(PUBMED_FETCH, {
        params: {
          db: 'pubmed',
          id: ids.join(','),
          retmode: 'xml',
        },
        timeout: 15000,
      })
    );

    // Parse XML
    const parser = new xml2js.Parser({ explicitArray: true });
    const parsed = await parser.parseStringPromise(fetchRes.data);
    const articles = parsed?.PubmedArticleSet?.PubmedArticle || [];

    const mapped = articles.map(mapPubMedArticle).filter(Boolean);
    console.log(`[PubMed] Mapped ${mapped.length} articles`);
    return mapped;

  } catch (error) {
    console.error(`[PubMed] Error: ${error.message}`);
    return [];
  }
};

module.exports = { fetchPubMedData };