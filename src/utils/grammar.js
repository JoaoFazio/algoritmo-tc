// ── grammar.js ────────────────────────────────────────────────────
// Pure functions for parsing and simulating Context-Free Grammars (CFG/GLC)
// and Regular Grammars (GR).
//
// Grammar format (text):
//   S -> aSb | eps
//   A -> aA | a
// Each line is one non-terminal. Symbols separated by spaces on the right side.
// 'eps' (or 'ε') means empty string (ε).

export const EPSILON = 'ε';

// ── Parsing ───────────────────────────────────────────────────────

/**
 * Tokenize a production string into an array of symbol tokens.
 * Handles:
 *  - space-separated tokens ("a S b")
 *  - compact tokens without spaces ("0B", "1A", "aS")
 *  - 'eps' / 'ε' → EPSILON
 *  - multi-character NTs (uppercase sequences like "NT", "ABC")
 *
 * Algorithm: first split by whitespace, then for each word split further
 * by alternating runs of uppercase (NT) vs non-uppercase (terminal).
 */
function tokenizeProduction(raw, knownNTs) {
  const words = raw.trim().split(/\s+/);
  const tokens = [];
  for (const word of words) {
    if (word === 'eps' || word === 'ε' || word === 'λ' || word === 'lambda') { tokens.push(EPSILON); continue; }
    if (word === '') continue;
    // If the word is entirely known or entirely simple, keep as-is
    if (knownNTs.has(word) || word.length === 1) { tokens.push(word); continue; }
    // Try to split into runs: uppercase sequences (NT candidates) vs rest (terminals)
    // Pattern: match maximal runs of uppercase or maximal runs of non-uppercase
    const runs = word.match(/[A-Z]+|[^A-Z]+/g) || [word];
    for (const run of runs) {
      tokens.push(run);
    }
  }
  return tokens;
}

/**
 * Parse a grammar text into a structured object.
 * Returns { startSymbol, rules: { NT: [[...symbols]] } }
 */
export function parseGrammar(text) {
  const rules = {};
  let startSymbol = null;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // First pass: collect all non-terminal names (left-hand sides)
  const knownNTs = new Set();
  for (const line of lines) {
    const arrow = line.indexOf('->');
    if (arrow === -1) continue;
    const lhs = line.slice(0, arrow).trim();
    if (lhs) knownNTs.add(lhs);
  }

  // Second pass: parse productions with smart tokenization
  for (const line of lines) {
    const arrow = line.indexOf('->');
    if (arrow === -1) continue;
    const lhs = line.slice(0, arrow).trim();
    const rhs = line.slice(arrow + 2).trim();
    if (!startSymbol) startSymbol = lhs;
    if (!rules[lhs]) rules[lhs] = [];
    const productions = rhs.split('|').map((p) => tokenizeProduction(p, knownNTs));
    rules[lhs].push(...productions);
  }

  return { startSymbol, rules };
}

/**
 * Detect grammar type:
 *  - 'regular'     — all productions are: A → a | A → aB | A → ε
 *  - 'contextfree' — productions from a single NT on the left
 *  - 'unrestricted'
 */
export function detectGrammarType({ rules }) {
  const nts = new Set(Object.keys(rules));
  let isRegular = true;

  for (const [nt, prods] of Object.entries(rules)) {
    for (const prod of prods) {
      // Allow: ε, single terminal, terminal followed by NT
      const [a, b, ...rest] = prod;
      if (rest.length > 0) { isRegular = false; break; }
      if (prod.length === 1) {
        // must be ε or terminal (not NT)
        if (a !== EPSILON && nts.has(a)) { isRegular = false; break; }
      } else if (prod.length === 2) {
        // must be terminal + NT
        if (nts.has(a) || !nts.has(b)) { isRegular = false; break; }
      }
    }
    if (!isRegular) break;
  }

  return isRegular ? 'Gramática Regular (GR)' : 'Gramática Livre de Contexto (GLC)';
}

// ── BFS Derivation ────────────────────────────────────────────────
// We perform a bounded BFS from the start symbol to derive `target`.
// Returns an array of derivation steps (each step is a sentential form as string[]).

export function deriveString(grammar, target, maxSteps = 80) {
  const { startSymbol, rules } = grammar;
  if (!startSymbol) return { error: 'Gramática vazia ou inválida.' };

  const targetSymbols = target === '' ? [EPSILON] : target.split('');

  // State: array of symbols (sentential form)
  const initial = [startSymbol];
  const queue = [{ form: initial, path: [initial] }];
  const visited = new Set();
  visited.add(JSON.stringify(initial));

  let steps = 0;

  while (queue.length > 0 && steps < maxSteps) {
    steps++;
    const { form, path } = queue.shift();

    // Find the leftmost non-terminal
    const ntIndex = form.findIndex((s) => rules[s]);
    if (ntIndex === -1) {
      // No NT left — it's a terminal string
      const normalized = form.filter((s) => s !== EPSILON);
      const targetNorm = targetSymbols.filter((s) => s !== EPSILON);
      if (JSON.stringify(normalized) === JSON.stringify(targetNorm)) {
        return { found: true, steps: path };
      }
      continue;
    }

    const nt = form[ntIndex];
    for (const prod of (rules[nt] || [])) {
      const newForm = [
        ...form.slice(0, ntIndex),
        ...prod,
        ...form.slice(ntIndex + 1),
      ];
      const key = JSON.stringify(newForm);
      if (!visited.has(key)) {
        visited.add(key);
        const newPath = [...path, newForm];
        queue.push({ form: newForm, path: newPath });
      }
    }
  }

  return { found: false, steps: null };
}

/**
 * Format a sentential form for display.
 * Non-terminals are returned as-is; terminals too.
 */
export function formatForm(form) {
  return form.map((s) => (s === EPSILON ? 'ε' : s)).join(' ');
}

// ── Example Grammars ──────────────────────────────────────────────

export const GRAMMAR_EXAMPLES = [
  {
    name: 'aⁿbⁿ (GLC clássica)',
    description: 'Gera strings do tipo aⁿbⁿ — n≥0. Ex: ε, ab, aabb, aaabbb.',
    text: `S -> a S b | eps`,
    testStrings: ['aabb', 'ab', 'aaabbb', '', 'aab'],
  },
  {
    name: 'Palíndromos (GLC)',
    description: 'Gera palíndromos sobre {a,b}. Ex: aba, aa, abba.',
    text: `S -> a S a | b S b | a | b | eps`,
    testStrings: ['aba', 'abba', 'aabaa', 'a', 'ab'],
  },
  {
    name: 'Gramática Regular — termina com b',
    description: 'G.R. que gera strings de {a,b} terminadas em b.',
    text: `S -> a S | b S | b`,
    testStrings: ['b', 'ab', 'aab', 'ba', 'a'],
  },
  {
    name: 'Expressões aritméticas simples',
    description: 'Gera expressões com + e * (simplificada).',
    text: `E -> E + T | T\nT -> T * F | F\nF -> a | b`,
    testStrings: ['a', 'a + b', 'a * b + b'],
  },
];
