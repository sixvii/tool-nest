import { categoriesData } from '../data/toolsData';

export const allSearchableTools = categoriesData.flatMap((cat) =>
  cat.tools.map((tool) => {
    const isObject = typeof tool === 'object' && tool !== null;
    return {
      name: isObject ? tool.name : tool,
      category: cat.title,
      categoryId: cat.id,
      search: isObject ? tool.search : undefined,
    };
  })
);

// ---------------------------------------------------------------------
// Synonym groups: words in the same group are treated as equivalent.
// Applied to BOTH the query and the indexed tool names/keywords (see
// canonicalize() + INDEXED_TOOLS below) — this is the fix for the
// "photo/converter/remove" bugs: a one-way query rewrite breaks any
// tool whose real name uses the word that got rewritten away. Applying
// the same canonicalization to both sides means the literal word always
// still matches, AND the alias still works.
// ---------------------------------------------------------------------
const SYNONYM_GROUPS = [
  ['image', 'img', 'pic', 'picture', 'photo'],
  ['powerpoint', 'ppt', 'pptx'],
  ['word', 'doc', 'docx'],
  ['excel', 'xls', 'xlsx', 'spreadsheet', 'sheet'],
  ['background', 'bg'],
  ['text', 'txt'],
  ['compress', 'shrink', 'reduce', 'smaller'],
  ['trim', 'cut', 'clip'],
  ['jpg', 'jpeg'],
  ['video', 'vid'],
  ['audio', 'sound'],
  ['resize', 'scale'],
  ['merge', 'combine', 'join'],
  ['unlock', 'decrypt'],
  ['protect', 'encrypt'],
  ['rotate', 'turn'],
  ['esign', 'sign', 'signature'],
  ['delete', 'remove'],
];

const CANONICAL = new Map();
SYNONYM_GROUPS.forEach((group) => {
  const canon = group[0];
  group.forEach((word) => CANONICAL.set(word, canon));
});

function canonicalize(word) {
  return CANONICAL.get(word) ?? word;
}

// Connector / structural words: extremely common in this catalog
// ("X to Y" naming) and carry no distinguishing meaning on their own.
// Excluded from the "how many keywords matched" completeness check,
// but not stripped from the raw query used for exact/substring matching.
const CONNECTORS = new Set([
  'to',
  'and',
  '&',
  'of',
  'for',
  'the',
  'a',
  'an',
  'into',
  'as',
  'from',
  'with',
  'in',
  'on',
]);

function tokenize(str) {
  return str
    .toLowerCase()
    .split(/[\s\-_/&()]+/)
    .filter(Boolean);
}

function canonicalTokens(str) {
  return tokenize(str).map(canonicalize);
}

// ---------------------------------------------------------------------
// Precompute per-tool searchable data ONCE at module load — not on
// every keystroke, unlike the original per-search token splitting.
// ---------------------------------------------------------------------
const INDEXED_TOOLS = allSearchableTools.map((tool) => {
  const nameTokens = canonicalTokens(tool.name);
  const ownKeywords = (tool.search?.keywords ?? []).map((k) => canonicalize(k.toLowerCase()));
  const ownActions = (tool.search?.actions ?? []).map((k) => canonicalize(k.toLowerCase()));
  const keywordTokens = [...new Set([...ownKeywords, ...ownActions])];

  return {
    tool,
    lowerName: tool.name.toLowerCase(),
    lowerCategory: tool.category.toLowerCase(),
    nameTokens,
    allTokens: [...new Set([...nameTokens, ...keywordTokens])],
  };
});

// Vocabulary used only to split squished tokens like "pdftoword".
const VOCAB = new Set();
INDEXED_TOOLS.forEach((entry) => {
  entry.allTokens.forEach((t) => VOCAB.add(t));
  tokenize(entry.lowerCategory).forEach((t) => VOCAB.add(canonicalize(t)));
});

function findLongestVocabMatch(token, start) {
  const maxLen = Math.min(12, token.length - start);
  for (let len = maxLen; len >= 2; len--) {
    const candidate = token.slice(start, start + len);
    if (VOCAB.has(candidate)) return candidate;
  }
  return null;
}

function splitSquished(token) {
  if (token.length < 4) return [token];
  const words = [];
  let i = 0;
  let guard = 0;
  while (i < token.length && guard < 20) {
    guard++;
    const matched = findLongestVocabMatch(token, i);
    if (!matched) return [token];
    words.push(matched);
    i += matched.length;
  }
  return i === token.length ? words : [token];
}

// ---------------------------------------------------------------------
// Edit distance (OSA / restricted Damerau-Levenshtein) — last-resort
// fallback only, never the primary matcher (see searchTools()).
// ---------------------------------------------------------------------
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      const isTransposition = i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1];
      if (isTransposition) dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
    }
  }
  return dp[a.length][b.length];
}

function fuzzyMaxDist(needle) {
  return needle.length <= 4 ? 1 : 2;
}

function bestTokenDistance(haystackTokens, needle) {
  let best = Infinity;
  for (const t of haystackTokens) {
    if (tokensEquivalent(t, needle)) return 0;
    const d = levenshtein(t, needle);
    if (d < best) best = d;
  }
  return best;
}

// ---------------------------------------------------------------------
// Scoring. Phase A (exact / prefix / substring / keyword) always runs
// and is cheap. Phase B (fuzzy) only runs catalog-wide if Phase A found
// no confident match anywhere — fuzzy is a fallback, not the primary
// mechanism (this also prevents unrelated-but-similar-looking words,
// e.g. "recover" vs "remove", from cross-matching when a real match
// exists elsewhere).
// ---------------------------------------------------------------------
const SCORE = {
  EXACT: 10,
  PREFIX: 8,
  SUBSTRING: 6,
  ALL_KEYWORDS: 5,
  MOST_KEYWORDS: 3,
  CATEGORY: 1,
  FUZZY_MAX: 2.5,
};

const MIN_REQUIRED_FOR_PARTIAL = 3;

function scoreExactPrefixSubstring(entry, q) {
  if (entry.lowerName === q) return SCORE.EXACT;
  if (entry.lowerName.startsWith(q)) return SCORE.PREFIX;
  if (entry.lowerName.includes(q)) return SCORE.SUBSTRING;
  return null;
}

// Prefix-based equivalence (not arbitrary substring): handles simple
// plurals/typing-prefixes ("image" <-> "images") without false
// positives like "password".includes("word").
function tokensEquivalent(a, b) {
  return a === b || a.startsWith(b) || b.startsWith(a);
}

function scoreKeywordMatch(entry, requiredTokens) {
  if (requiredTokens.length === 0) return null;
  const haystack = entry.allTokens;
  const matched = requiredTokens.filter((t) => haystack.some((h) => tokensEquivalent(h, t)));
  if (matched.length === requiredTokens.length) return SCORE.ALL_KEYWORDS;
  if (
    requiredTokens.length >= MIN_REQUIRED_FOR_PARTIAL &&
    matched.length >= requiredTokens.length - 1
  ) {
    return SCORE.MOST_KEYWORDS;
  }
  return null;
}

function scoreCategoryFallback(entry, q, requiredTokens) {
  if (entry.lowerCategory.includes(q)) return SCORE.CATEGORY;
  if (requiredTokens.length > 0 && requiredTokens.every((t) => entry.lowerCategory.includes(t))) {
    return SCORE.CATEGORY;
  }
  return null;
}

function scoreFuzzy(entry, requiredTokens) {
  if (requiredTokens.length === 0) return null;
  const distances = requiredTokens.map((t) => bestTokenDistance(entry.allTokens, t));
  const allWithinTolerance = distances.every((d, i) => d <= fuzzyMaxDist(requiredTokens[i]));
  if (!allWithinTolerance) return null;
  const worst = Math.max(...distances);
  return Math.max(1, SCORE.FUZZY_MAX - worst * 0.5);
}

function compareMatches(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (a.entry.tool.name.length !== b.entry.tool.name.length) {
    return a.entry.tool.name.length - b.entry.tool.name.length;
  }
  return a.entry.tool.name.localeCompare(b.entry.tool.name);
}

export function searchTools(query, { limit = 8 } = {}) {
  if (!query?.trim()) return [];

  const q = query.trim().toLowerCase().slice(0, 60);
  const q2to = q.replace(/\b(\w+)\s2\s(\w+)\b/g, '$1 to $2');

  const rawTokens = q2to.split(/\s+/).filter(Boolean);
  const expandedTokens = rawTokens.flatMap((t) => splitSquished(t));
  const canonTokens = expandedTokens.map(canonicalize);
  const requiredTokens = canonTokens.filter((t) => !CONNECTORS.has(t));
  const effectiveRequired = requiredTokens.length > 0 ? requiredTokens : canonTokens;

  // Phase A: exact / prefix / substring / keyword.
  const phaseA = INDEXED_TOOLS.map((entry) => {
    const direct = scoreExactPrefixSubstring(entry, q2to);
    if (direct !== null) return { entry, score: direct };

    const kw = scoreKeywordMatch(entry, effectiveRequired);
    if (kw !== null) return { entry, score: kw };

    return { entry, score: scoreCategoryFallback(entry, q2to, effectiveRequired) };
  });

  const confidentA = phaseA.filter((m) => m.score !== null && m.score >= SCORE.ALL_KEYWORDS);

  let results;
  if (confidentA.length > 0) {
    results = phaseA.filter((m) => m.score !== null);
  } else {
    // Nothing confident anywhere in the catalog — fall back to fuzzy.
    results = INDEXED_TOOLS.map((entry) => {
      const existing = phaseA.find((m) => m.entry === entry)?.score;
      if (existing !== null && existing !== undefined) return { entry, score: existing };
      return { entry, score: scoreFuzzy(entry, effectiveRequired) };
    }).filter((m) => m.score !== null);
  }

  const hasStrongerMatch = results.some(({ score }) => score >= 2);
  const filtered = hasStrongerMatch ? results.filter(({ score }) => score > 1) : results;

  return filtered
    .sort(compareMatches)
    .slice(0, limit)
    .map(({ entry }) => entry.tool);
}

// ---------------------------------------------------------------------
// Optional per-tool metadata shape (add incrementally in toolsData.js):
//
// tools: [
//   { name: "Remove Image Background", search: { keywords: ["png"], actions: ["erase"] } },
//   "Merge PDF", // plain strings still work fine, nothing required
// ]
// ---------------------------------------------------------------------
