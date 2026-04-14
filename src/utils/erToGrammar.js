// ── erToGrammar.js ────────────────────────────────────────────────
// Converts a formal Regular Expression into a Right-Linear Grammar (GR).
//
// Pipeline:  ER text → AST → Thompson ε-NFA → DFA (subset construction) → GR text
//
// ER notation (same as the rest of the project):
//   +   → union / OR        e.g.  a + b
//   *   → Kleene star       e.g.  a*
//   ()  → grouping          e.g.  (a + b)*
//   eps → empty string ε

// ── Tokenizer ─────────────────────────────────────────────────────

function tokenize(pattern) {
  const tokens = [];
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === ' ' || c === '\t') { i++; continue; }

    if (c === '(' || c === ')' || c === '+' || c === '*') {
      tokens.push(c);
      i++;
      continue;
    }

    // 'eps', 'epsilon', 'ε', 'λ', 'lambda'  →  eps token
    if (c === 'ε' || c === 'λ') { tokens.push('eps'); i++; continue; }
    const remaining = pattern.slice(i);
    if (/^epsilon\b/.test(remaining)) { tokens.push('eps'); i += 7; continue; }
    if (/^lambda\b/.test(remaining))  { tokens.push('eps'); i += 6; continue; }
    if (/^eps\b/.test(remaining))     { tokens.push('eps'); i += 3; continue; }

    // Single-character terminal
    tokens.push(c);
    i++;
  }
  return tokens;
}

// ── Recursive-Descent Parser ──────────────────────────────────────
//
//  expr   := term ('+' term)*          — union, lowest precedence
//  term   := factor+                   — concatenation
//  factor := atom '*'*                 — Kleene star, highest precedence
//  atom   := '(' expr ')' | 'eps' | char

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }
  peek()  { return this.tokens[this.pos]; }
  consume() { return this.tokens[this.pos++]; }
  expect(t) {
    if (this.peek() !== t)
      throw new Error(`Esperado '${t}', encontrado '${this.peek() ?? 'fim de entrada'}'`);
    return this.consume();
  }

  parseExpr() {
    let node = this.parseTerm();
    while (this.peek() === '+') {
      this.consume();
      const right = this.parseTerm();
      node = { type: 'union', left: node, right };
    }
    return node;
  }

  parseTerm() {
    let node = this.parseFactor();
    // Continue while the next token can start a new factor
    while (this.peek() != null && this.peek() !== ')' && this.peek() !== '+') {
      const right = this.parseFactor();
      node = { type: 'concat', left: node, right };
    }
    return node;
  }

  parseFactor() {
    let node = this.parseAtom();
    while (this.peek() === '*') {
      this.consume();
      node = { type: 'star', child: node };
    }
    return node;
  }

  parseAtom() {
    const t = this.peek();
    if (t === '(') {
      this.consume();
      const node = this.parseExpr();
      this.expect(')');
      return node;
    }
    if (t === 'eps') {
      this.consume();
      return { type: 'eps' };
    }
    if (t != null && t !== ')' && t !== '+' && t !== '*') {
      this.consume();
      return { type: 'char', value: t };
    }
    throw new Error(`Token inesperado: '${t ?? 'fim de entrada'}'`);
  }
}

// ── Thompson's NFA Construction ───────────────────────────────────
// Each call returns { start, end, transitions[] }
// transitions: { from, to, symbol }  (symbol '' = ε)

let _stateId = 0;
const newState = () => `_n${_stateId++}`;

function buildNFA(node) {
  if (node.type === 'char') {
    const s = newState(), e = newState();
    return { start: s, end: e, transitions: [{ from: s, to: e, symbol: node.value }] };
  }

  if (node.type === 'eps') {
    const s = newState(), e = newState();
    return { start: s, end: e, transitions: [{ from: s, to: e, symbol: '' }] };
  }

  if (node.type === 'union') {
    const l = buildNFA(node.left), r = buildNFA(node.right);
    const s = newState(), e = newState();
    return {
      start: s, end: e,
      transitions: [
        { from: s, to: l.start, symbol: '' },
        { from: s, to: r.start, symbol: '' },
        { from: l.end, to: e, symbol: '' },
        { from: r.end, to: e, symbol: '' },
        ...l.transitions, ...r.transitions,
      ],
    };
  }

  if (node.type === 'concat') {
    const l = buildNFA(node.left), r = buildNFA(node.right);
    return {
      start: l.start, end: r.end,
      transitions: [
        { from: l.end, to: r.start, symbol: '' },
        ...l.transitions, ...r.transitions,
      ],
    };
  }

  if (node.type === 'star') {
    const inner = buildNFA(node.child);
    const s = newState(), e = newState();
    return {
      start: s, end: e,
      transitions: [
        { from: s, to: inner.start, symbol: '' }, // enter
        { from: inner.end, to: inner.start, symbol: '' }, // loop
        { from: inner.end, to: e, symbol: '' },   // exit
        { from: s, to: e, symbol: '' },            // skip (zero repetitions)
        ...inner.transitions,
      ],
    };
  }

  throw new Error(`Tipo de nó AST desconhecido: ${node.type}`);
}

// ── Alphabet collection ───────────────────────────────────────────

function collectAlphabet(node) {
  const syms = new Set();
  function visit(n) {
    if (n.type === 'char')   syms.add(n.value);
    if (n.type === 'union')  { visit(n.left); visit(n.right); }
    if (n.type === 'concat') { visit(n.left); visit(n.right); }
    if (n.type === 'star')   visit(n.child);
  }
  visit(node);
  return [...syms].sort();
}

// ── Subset Construction (ε-NFA → DFA) ────────────────────────────

function subsetConstruct(nfaStart, nfaEnd, nfaTransitions, alphabet) {
  const closure = (ids) => {
    const result = new Set(ids);
    const stack = [...ids];
    while (stack.length) {
      const cur = stack.pop();
      nfaTransitions
        .filter(t => t.from === cur && t.symbol === '')
        .forEach(t => { if (!result.has(t.to)) { result.add(t.to); stack.push(t.to); } });
    }
    return [...result].sort();
  };

  const moveSet = (ids, sym) => {
    const reached = new Set();
    ids.forEach(sid =>
      nfaTransitions.filter(t => t.from === sid && t.symbol === sym)
        .forEach(t => reached.add(t.to))
    );
    return [...reached];
  };

  const key = ids => [...ids].sort().join('\x00');
  const startSet = closure([nfaStart]);

  let stateIdx = 0;
  const stateMap = new Map(); // key → { id, nfaIds, isStart, isAccept }

  const getOrCreate = (ids) => {
    const k = key(ids);
    if (!stateMap.has(k)) {
      stateMap.set(k, {
        id: `d${stateIdx++}`,
        nfaIds: ids,
        isStart: false,
        isAccept: ids.includes(nfaEnd),
      });
    }
    return stateMap.get(k);
  };

  const startState = getOrCreate(startSet);
  startState.isStart = true;

  const queue = [startSet];
  const visited = new Set([key(startSet)]);
  const transitions = [];

  while (queue.length) {
    const current = queue.shift();
    const fromState = getOrCreate(current);

    for (const sym of alphabet) {
      const reached = closure(moveSet(current, sym));
      if (reached.length === 0) continue; // no transition on this symbol (implicit dead state)

      const toState = getOrCreate(reached);
      transitions.push({ from: fromState.id, to: toState.id, symbol: sym });

      const rKey = key(reached);
      if (!visited.has(rKey)) {
        visited.add(rKey);
        queue.push(reached);
      }
    }
  }

  return { states: [...stateMap.values()], transitions };
}

// ── DFA → Right-Linear Grammar ────────────────────────────────────
//
// Convention:
//   start state       → S
//   remaining states  → A, B, C, … (skipping S) then Q1, Q2, …
//
// Productions:
//   For each δ(Qi, a) = Qj : Qi → a Qj
//   For each accepting Qi  : Qi → eps

const NT_LETTERS = 'ABCDEFGHIJKLMNOPQRTUVWXYZ'; // 24 letters (no S)

function dfaToGrammar(states, transitions) {
  const start = states.find(s => s.isStart);
  const others = states.filter(s => !s.isStart);

  const ntName = {};
  ntName[start.id] = 'S';
  let letterIdx = 0;
  for (const s of others) {
    ntName[s.id] = letterIdx < NT_LETTERS.length
      ? NT_LETTERS[letterIdx++]
      : `Q${letterIdx++ - NT_LETTERS.length + 1}`;
  }

  // Build productions map: NT → string[]
  const prods = {};
  for (const s of states) prods[ntName[s.id]] = [];

  for (const t of transitions) {
    const from = ntName[t.from];
    const to   = ntName[t.to];
    prods[from].push(`${t.symbol} ${to}`);
  }

  for (const s of states) {
    if (s.isAccept) prods[ntName[s.id]].push('eps');
  }

  // Render lines — start state first, then others in insertion order
  const lines = [];
  const allNTs = [ntName[start.id], ...others.map(s => ntName[s.id])];
  for (const nt of allNTs) {
    if (prods[nt] && prods[nt].length > 0) {
      lines.push(`${nt} -> ${prods[nt].join(' | ')}`);
    }
  }

  return lines.join('\n');
}

// ── Main export ───────────────────────────────────────────────────

/**
 * Convert a formal Regular Expression to a Right-Linear Grammar text.
 *
 * @param {string} erPattern  e.g. "(a+b)*aa(a+b)*"
 * @returns {{ ok: true, grammar: string, alphabet: string[] }
 *         | { ok: false, error: string }}
 */
export function erToGrammar(erPattern) {
  _stateId = 0; // reset global counter for each call

  try {
    const cleaned = erPattern.trim();
    if (!cleaned) throw new Error('Expressão regular vazia.');

    const tokens = tokenize(cleaned);
    if (tokens.length === 0) throw new Error('Nenhum token encontrado na expressão.');

    const parser = new Parser(tokens);
    const ast = parser.parseExpr();

    if (parser.pos < tokens.length) {
      throw new Error(`Token inesperado após fim da expressão: '${tokens[parser.pos]}'`);
    }

    const alphabet = collectAlphabet(ast);

    // Edge case: ER is just eps (empty string language {ε})
    if (alphabet.length === 0) {
      return { ok: true, grammar: 'S -> eps', alphabet: [] };
    }

    const nfa = buildNFA(ast);
    const { states, transitions } = subsetConstruct(nfa.start, nfa.end, nfa.transitions, alphabet);
    const grammar = dfaToGrammar(states, transitions);

    return { ok: true, grammar, alphabet };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
