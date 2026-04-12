// ── erValidator.js ────────────────────────────────────────────────
// Validates a designed DFA/NFA against a user-provided regex pattern
// by batch-testing generated strings and comparing results.

import { simulateDFA, simulateNFA } from './automaton';

/**
 * Generate all strings over `alphabet` with length 0..maxLen.
 * Includes empty string "".
 */
export function generateTestStrings(alphabet, maxLen = 5) {
  const symbols = alphabet
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) return [''];

  const results = [''];
  const queue = [''];

  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.length >= maxLen) continue;
    for (const sym of symbols) {
      const next = cur + sym;
      results.push(next);
      queue.push(next);
    }
  }

  return results;
}

/**
 * Test if `str` fully matches the ER pattern using JS regex.
 * Wraps pattern in ^(?:...)$ to enforce full-string match.
 * The pattern uses formal ER notation: '+' means 'or' (|), so we
 * replace unescaped '+' that are outside [] with '|'.
 * Also converts formal 'a*' and other standard notations.
 */
export function matchesER(str, erPattern) {
  try {
    // Convert formal ER notation to JS regex:
    // In exercise notation, (a+b) means (a|b), not "one or more"
    // BUT (a+c)* — the * binds to the group, not the +.
    // Strategy: replace '+' used as OR (inside groups not preceded by a quantifier target)
    // with '|'. We detect this by checking if '+' directly follows a ')' or a char class.
    // Simple heuristic: any '+' that is NOT preceded by a quantifiable token
    // (i.e., not after *, +, ?, \w, \d, ], a-z, A-Z, 0-9) becomes '|'.

    // Convert formal + (OR) → |
    // Rule: '+' is OR if preceded by one of: letter, digit, ), ]
    // '+' is quantifier if preceded by same tokens but used as repetition.
    // Since formal ERs use + as OR inside parens, we do a pass to detect context.
    
    // Simpler and safer: replace all '+' with '|', since formal ER exercises
    // use only (a+b) notation for OR, never for "one-or-more".
    // If user writes actual JS regex (+, *, ?, etc.) they should use JS syntax.
    // We detect if it looks like a formal ER (contains letter+letter patterns).
    
    // Detect formal ER notation: '+' used as OR (e.g. a+b, 0+1, )+a, 0+()
    // Extended to handle digit-based patterns like (0+1)* in addition to letter-based ones.
    const isFormalNotation = /[a-zA-Z0-9]\+[a-zA-Z0-9]|\)\+[a-zA-Z0-9]|[a-zA-Z0-9]\+\(/.test(erPattern);
    let jsPattern = erPattern;
    if (isFormalNotation) {
      // Replace formal + (OR) with |
      jsPattern = erPattern.replace(/\+/g, '|');
    }

    const re = new RegExp(`^(?:${jsPattern})$`);
    return re.test(str);
  } catch {
    return null; // invalid pattern
  }
}

/**
 * Analisa se o DFA tem trap state (estado morto) e se está correto.
 *
 * Retorna:
 *  status: 'complete'        — todo estado tem transição pra todo símbolo
 *          'no-trap'         — faltam transições e não há trap state
 *          'trap-correct'    — trap state existe e recebe todas as transições faltantes
 *          'trap-incorrect'  — trap state existe mas faltam setas de outros estados até ele
 *
 * @param {Array} states
 * @param {Array} transitions  — cada item: { id, from, to, symbol }
 * @param {string} alphabet    — ex: "a, b, c"
 */
export function analyzeTrapState(states, transitions, alphabet) {
  const symbols = alphabet.split(',').map((s) => s.trim()).filter(Boolean);
  if (symbols.length === 0 || states.length === 0) {
    return { status: 'complete', trapStateId: null, missingByState: {} };
  }

  // Monta mapa: stateId → Set de símbolos que têm transição de saída
  const outgoing = {};
  for (const s of states) outgoing[s.id] = new Set();
  for (const t of transitions) {
    if (outgoing[t.from]) outgoing[t.from].add(t.symbol);
  }

  // Descobre quais símbolos faltam por estado
  const missingByState = {};
  for (const s of states) {
    const missing = symbols.filter((sym) => !outgoing[s.id].has(sym));
    if (missing.length > 0) missingByState[s.id] = missing;
  }

  const isComplete = Object.keys(missingByState).length === 0;
  if (isComplete) return { status: 'complete', trapStateId: null, missingByState: {} };

  // Detecta trap state: estado não-aceitação com self-loop para ≥ 1 símbolo do alfabeto
  // (não exigimos que seja perfeito aqui, só que seja candidato)
  const trapCandidates = states.filter((s) => {
    if (s.isAccept) return false;
    // tem pelo menos uma self-loop
    return transitions.some((t) => t.from === s.id && t.to === s.id);
  });

  if (trapCandidates.length === 0) {
    return { status: 'no-trap', trapStateId: null, missingByState };
  }

  // Escolhe o melhor candidato: o que mais recebe transições de fora
  // (heurística: estado morto real recebe os "erros" dos outros estados)
  const trapState = trapCandidates.reduce((best, s) => {
    const incomingFromOthers = transitions.filter(
      (t) => t.to === s.id && t.from !== s.id
    ).length;
    const bestIn = transitions.filter(
      (t) => t.to === best.id && t.from !== best.id
    ).length;
    return incomingFromOthers >= bestIn ? s : best;
  }, trapCandidates[0]);

  // Verifica se TODAS as transições faltantes (de estados não-trap) vão para o trap state
  const nonTrapMissing = Object.entries(missingByState).filter(
    ([stateId]) => stateId !== trapState.id
  );

  const allWiredToTrap = nonTrapMissing.every(([stateId, syms]) =>
    syms.every((sym) =>
      transitions.some((t) => t.from === stateId && t.symbol === sym && t.to === trapState.id)
    )
  );

  // Verifica se o próprio trap state tem self-loops para todos os símbolos
  const trapSelfLoopSymbols = transitions
    .filter((t) => t.from === trapState.id && t.to === trapState.id)
    .map((t) => t.symbol);
  const trapHasAllSelfLoops = symbols.every((sym) => trapSelfLoopSymbols.includes(sym));

  const status = allWiredToTrap && trapHasAllSelfLoops ? 'trap-correct' : 'trap-incorrect';

  // Monta mensagem de diagnóstico para trap-incorrect
  let missingDetails = [];
  if (status === 'trap-incorrect') {
    for (const [stateId, syms] of nonTrapMissing) {
      const stateLabel = states.find((s) => s.id === stateId)?.label ?? stateId;
      const unwiredSyms = syms.filter(
        (sym) => !transitions.some((t) => t.from === stateId && t.symbol === sym && t.to === trapState.id)
      );
      if (unwiredSyms.length > 0) {
        missingDetails.push(`${stateLabel} --[${unwiredSyms.join(',')}]--> ${trapState.label}`);
      }
    }
    const trapMissingLoops = symbols.filter((sym) => !trapSelfLoopSymbols.includes(sym));
    if (trapMissingLoops.length > 0) {
      missingDetails.push(`${trapState.label} --[${trapMissingLoops.join(',')}]--> ${trapState.label} (self-loop)`);
    }
  }

  return { status, trapStateId: trapState.id, missingByState, missingDetails };
}

/**
 * Validate a designed automaton against an ER pattern.
 *
 * @returns {object} {
 *   ok: boolean,
 *   tested: number,
 *   counterexamples: Array<{ str, expectedByER, gotFromAF }>,
 *   erError: string|null,
 *   trapAnalysis: object,
 * }
 */
export function validateAFvsER(states, transitions, automataType, erPattern, alphabet) {
  // Validate ER first
  try {
    const isFormal = /[a-zA-Z0-9]\+[a-zA-Z0-9]|\)\+[a-zA-Z0-9]|[a-zA-Z0-9]\+\(/.test(erPattern);
    const jsPattern = isFormal ? erPattern.replace(/\+/g, '|') : erPattern;
    new RegExp(`^(?:${jsPattern})$`); // throws if invalid
  } catch (e) {
    return { ok: false, tested: 0, counterexamples: [], erError: `ER inválida: ${e.message}` };
  }

  const strings = generateTestStrings(alphabet, 5);
  const counterexamples = [];

  for (const str of strings) {
    const expectedByER = matchesER(str, erPattern);

    // Run the automaton
    let gotFromAF;
    if (automataType === 'NFA') {
      const result = simulateNFA(states, transitions, str);
      if (result.error) continue;
      const lastStep = result.steps[result.steps.length - 1];
      gotFromAF = lastStep.accepted;
    } else {
      const result = simulateDFA(states, transitions, str);
      if (result.error) continue;
      const lastStep = result.steps[result.steps.length - 1];
      gotFromAF = lastStep.accepted;
    }

    if (expectedByER !== gotFromAF) {
      counterexamples.push({ str, expectedByER, gotFromAF });
    }

    // Cap counterexamples to avoid overwhelming UI
    if (counterexamples.length >= 10) break;
  }

  const trapAnalysis = analyzeTrapState(states, transitions, alphabet);

  return {
    ok: counterexamples.length === 0,
    tested: strings.length,
    counterexamples,
    erError: null,
    trapAnalysis,
  };
}
