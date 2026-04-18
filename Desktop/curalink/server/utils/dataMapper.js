// ─── Safe string extractor ───────────────────────────────────────────────────
// OpenAlex sometimes returns titles/abstracts as objects instead of strings.
// This utility handles every known shape and always returns a plain string.
const safeStr = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);

  // Shape: { value: "..." }
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (typeof value.value === 'string') return value.value.trim();
    if (typeof value.text === 'string')  return value.text.trim();
    if (typeof value._ === 'string')     return value._.trim();
    // Last resort: first string-valued key
    for (const v of Object.values(value)) {
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }

  // Shape: ["..."] – take first element
  if (Array.isArray(value)) {
    const first = value[0];
    return safeStr(first, fallback);
  }

  return fallback;
};

// ─── PubMed mapper ────────────────────────────────────────────────────────────
const mapPubMedArticle = (article) => {
  try {
    const medlineCitation = article?.MedlineCitation?.[0];
    const articleData     = medlineCitation?.Article?.[0];

    const title = safeStr(articleData?.ArticleTitle?.[0], 'No title available');

    const abstractRaw = articleData?.Abstract?.[0]?.AbstractText?.[0];
    const snippet =
      typeof abstractRaw === 'string'
        ? abstractRaw
        : safeStr(abstractRaw?._, abstractRaw?.['#text'] ?? 'No abstract available');

    const authorList = articleData?.AuthorList?.[0]?.Author || [];
    const authors = authorList
      .slice(0, 3)
      .map(a =>
        `${safeStr(a.LastName?.[0])} ${safeStr(a.ForeName?.[0])}`.trim()
      )
      .filter(Boolean)
      .join(', ') || 'Unknown authors';

    const pubDate = articleData?.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0];
    const year    = safeStr(pubDate?.Year?.[0])
                 || safeStr(pubDate?.MedlineDate?.[0])?.slice(0, 4)
                 || 'N/A';

    const pmidRaw = medlineCitation?.PMID?.[0];
    const pmid    = safeStr(pmidRaw?._ ?? pmidRaw);
    const url     = pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : '';

    return {
      title:    String(title),
      snippet:  String(snippet).slice(0, 500),
      authors:  String(authors),
      year:     String(year),
      url:      String(url),
      platform: 'PubMed',
    };
  } catch (e) {
    console.error('[dataMapper] PubMed mapping error:', e.message);
    return null;
  }
};

// ─── OpenAlex abstract reconstructor ─────────────────────────────────────────
const reconstructAbstract = (invertedIndex) => {
  if (!invertedIndex || typeof invertedIndex !== 'object') return '';
  try {
    const wordMap = {};
    for (const [word, positions] of Object.entries(invertedIndex)) {
      if (Array.isArray(positions)) {
        positions.forEach(pos => { wordMap[Number(pos)] = String(word); });
      }
    }
    return Object.keys(wordMap)
      .sort((a, b) => a - b)
      .map(k => wordMap[k])
      .join(' ')
      .slice(0, 400);
  } catch {
    return '';
  }
};

// ─── OpenAlex mapper ──────────────────────────────────────────────────────────
const mapOpenAlexWork = (work) => {
  try {
    if (!work || typeof work !== 'object') return null;

    // Title – OpenAlex sometimes wraps it in an object
    const title = safeStr(work.title, 'No title available');

    // Abstract
    let snippet = 'No abstract available';
    if (work.abstract_inverted_index) {
      const reconstructed = reconstructAbstract(work.abstract_inverted_index);
      if (reconstructed) snippet = reconstructed;
    } else if (work.abstract) {
      snippet = safeStr(work.abstract, 'No abstract available');
    }

    // Authors
    const authorships = Array.isArray(work.authorships) ? work.authorships : [];
    const authors = authorships
      .slice(0, 3)
      .map(a => safeStr(a?.author?.display_name))
      .filter(Boolean)
      .join(', ') || 'Unknown authors';

    // Year
    const year = String(work.publication_year || 'N/A');

    // URL – try multiple fields
    const url = safeStr(
      work.primary_location?.landing_page_url
      || work.primary_location?.pdf_url
      || work.doi
      || ''
    );

    // Final safety pass – every field must be a plain string
    return {
      title:    String(title),
      snippet:  String(snippet).slice(0, 500),
      authors:  String(authors),
      year:     String(year),
      url:      String(url),
      platform: 'OpenAlex',
    };
  } catch (e) {
    console.error('[dataMapper] OpenAlex mapping error:', e.message);
    return null;
  }
};

// ─── ClinicalTrials mapper ────────────────────────────────────────────────────
const mapClinicalTrial = (study) => {
  try {
    if (!study || typeof study !== 'object') return null;

    const proto       = study?.protocolSection;
    const id          = proto?.identificationModule;
    const status      = proto?.statusModule;
    const eligibility = proto?.eligibilityModule;
    const contacts    = proto?.contactsLocationsModule;
    const description = proto?.descriptionModule;

    const title = safeStr(
      id?.officialTitle || id?.briefTitle,
      'No title available'
    );

    const recruitingStatus = safeStr(status?.overallStatus, 'Unknown');

    const snippet = safeStr(
      description?.briefSummary,
      'No summary available'
    ).slice(0, 400);

    const eligibilityCriteria = safeStr(
      eligibility?.eligibilityCriteria,
      'Not specified'
    ).slice(0, 300);

    const locationList = Array.isArray(contacts?.locations)
      ? contacts.locations
      : [];
    const loc      = locationList[0];
    const location = loc
      ? [safeStr(loc.city), safeStr(loc.country)].filter(Boolean).join(', ')
      : 'Location not specified';

    const centralContacts = Array.isArray(contacts?.centralContacts)
      ? contacts.centralContacts
      : [];
    const contactInfo = safeStr(centralContacts[0]?.name, 'Contact not listed');

    const nctId = safeStr(id?.nctId);
    const url   = nctId ? `https://clinicaltrials.gov/study/${nctId}` : '';

    const startYear = safeStr(status?.startDateStruct?.date, '').slice(0, 4);

    return {
      title:                String(title),
      snippet:              String(snippet),
      recruitingStatus:     String(recruitingStatus),
      eligibilityCriteria:  String(eligibilityCriteria),
      location:             String(location),
      contactInfo:          String(contactInfo),
      url:                  String(url),
      platform:             'ClinicalTrials.gov',
      authors:              'N/A',
      year:                 String(startYear || 'N/A'),
    };
  } catch (e) {
    console.error('[dataMapper] ClinicalTrials mapping error:', e.message);
    return null;
  }
};

module.exports = { mapPubMedArticle, mapOpenAlexWork, mapClinicalTrial };