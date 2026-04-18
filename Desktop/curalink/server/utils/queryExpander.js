// Expands a simple query into a richer search term
// e.g. "deep brain stimulation" + "Parkinson's" → combined query

const expandQuery = (query, disease) => {
  if (!disease) return query;

  const queryLower = query.toLowerCase();
  const diseaseLower = disease.toLowerCase();

  // Avoid duplication if disease already in query
  if (queryLower.includes(diseaseLower)) {
    return query;
  }

  return `${query} ${disease}`;
};

// Generates multiple search variations for broader retrieval
const generateSearchVariants = (query, disease) => {
  const base = expandQuery(query, disease);

  const variants = [
    base,
    `${disease} treatment`,
    `${disease} clinical trial`,
    `${disease} latest research`,
  ];

  // Deduplicate
  return [...new Set(variants)];
};

module.exports = { expandQuery, generateSearchVariants };