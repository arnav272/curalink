// Scores each result and returns top N
const rankResults = (results, query, disease, topN = 8) => {
  const keywords = buildKeywords(query, disease);

  const scored = results
    .filter(Boolean)
    .map(item => ({
      ...item,
      score: scoreItem(item, keywords),
    }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
};

const buildKeywords = (query, disease) => {
  const combined = `${query} ${disease}`.toLowerCase();
  return combined
    .split(/\s+/)
    .filter(w => w.length > 3); // ignore short words
};

const scoreItem = (item, keywords) => {
  let score = 0;

  const text = `${item.title} ${item.snippet}`.toLowerCase();

  // Keyword match density
  keywords.forEach(kw => {
    const matches = (text.match(new RegExp(kw, 'g')) || []).length;
    score += matches * 2;
  });

  // Recency bonus
  const year = parseInt(item.year);
  if (!isNaN(year)) {
    if (year >= 2023) score += 10;
    else if (year >= 2020) score += 6;
    else if (year >= 2017) score += 3;
  }

  // Platform credibility bonus
  if (item.platform === 'PubMed') score += 4;
  if (item.platform === 'ClinicalTrials.gov') score += 3;
  if (item.platform === 'OpenAlex') score += 2;

  // Penalize missing data
  if (item.snippet === 'No abstract available') score -= 5;
  if (!item.url) score -= 3;

  return score;
};

module.exports = { rankResults };