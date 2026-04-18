const axios = require('axios');
const { withRetry } = require('../middleware/rateLimiter');
const { mapClinicalTrial } = require('../utils/dataMapper');

const CLINICAL_TRIALS_BASE = 'https://clinicaltrials.gov/api/v2/studies';

const fetchClinicalTrialsData = async (query) => {
  try {
    console.log(`[ClinicalTrials] Query: "${query}"`);

    const [recruiting, completed] = await Promise.allSettled([
      withRetry(() =>
        axios.get(CLINICAL_TRIALS_BASE, {
          params: { 'query.cond': query, 'filter.overallStatus': 'RECRUITING', pageSize: 25, format: 'json' },
          timeout: 10000,
        })
      ),
      withRetry(() =>
        axios.get(CLINICAL_TRIALS_BASE, {
          params: { 'query.cond': query, 'filter.overallStatus': 'COMPLETED', pageSize: 15, format: 'json' },
          timeout: 10000,
        })
      ),
    ]);

    const results = [];

    if (recruiting.status === 'fulfilled') {
      const studies = recruiting.value.data?.studies || [];
      console.log(`[ClinicalTrials] Recruiting: ${studies.length}`);
      results.push(...studies.map(mapClinicalTrial).filter(Boolean));
    }

    if (completed.status === 'fulfilled') {
      const studies = completed.value.data?.studies || [];
      console.log(`[ClinicalTrials] Completed: ${studies.length}`);
      results.push(...studies.map(mapClinicalTrial).filter(Boolean));
    }

    console.log(`[ClinicalTrials] Total: ${results.length}`);
    return results;

  } catch (error) {
    console.error(`[ClinicalTrials] Error: ${error.message}`);
    return [];
  }
};

module.exports = { fetchClinicalTrialsData };