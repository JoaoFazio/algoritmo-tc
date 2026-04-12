// ── automaton.js ─────────────────────────────────────────────────
// Pure functions for DFA / NFA simulation and validation.
// States are plain objects:  { id, label, isStart, isAccept, x, y }
// Transitions:               { id, from, to, symbol }   (symbol '' = epsilon)

// ─── DFA ─────────────────────────────────────────────────────────

/**
 * Run a DFA on `input` and return each step taken.
 * Returns an array of step objects: { charIndex, symbol, fromState, toState, accepted }
 * The last element has accepted=true/false with toState being the final state.
 */
export function simulateDFA(states, transitions, input) {
  const startState = states.find((s) => s.isStart);
  if (!startState) return { error: 'Nenhum estado inicial definido.' };

  const steps = [];
  let current = startState.id;

  // Step 0 — initial state before consuming any symbol
  steps.push({ charIndex: -1, symbol: null, fromState: null, toState: current, transitionId: null, accepted: null });

  for (let i = 0; i < input.length; i++) {
    const sym = input[i];
    const match = transitions.find((t) => t.from === current && t.symbol === sym);
    const next = match ? match.to : null;
    steps.push({ charIndex: i, symbol: sym, fromState: current, toState: next, transitionId: match?.id ?? null, accepted: null });
    current = next;
    if (current === null) break; // dead state — reject early
  }

  // Mark final result on last step
  const lastStep = steps[steps.length - 1];
  const finalState = states.find((s) => s.id === lastStep.toState);
  lastStep.accepted = !!(finalState && finalState.isAccept);

  return { steps };
}

// ─── NFA (with epsilon / ε support) ──────────────────────────────

function epsilonClosure(stateIds, transitions) {
  const closure = new Set(stateIds);
  const stack = [...stateIds];
  while (stack.length > 0) {
    const cur = stack.pop();
    transitions
      .filter((t) => t.from === cur && t.symbol === '')
      .forEach((t) => {
        if (!closure.has(t.to)) {
          closure.add(t.to);
          stack.push(t.to);
        }
      });
  }
  return [...closure];
}

function move(stateIds, symbol, transitions) {
  const result = new Set();
  stateIds.forEach((sid) => {
    transitions
      .filter((t) => t.from === sid && t.symbol === symbol)
      .forEach((t) => result.add(t.to));
  });
  return [...result];
}

/**
 * Run an NFA on `input`.
 * Returns steps, each step has `currentStates: Set<id>`.
 */
export function simulateNFA(states, transitions, input) {
  const startState = states.find((s) => s.isStart);
  if (!startState) return { error: 'Nenhum estado inicial definido.' };

  const steps = [];
  let current = epsilonClosure([startState.id], transitions);

  steps.push({ charIndex: -1, symbol: null, currentStates: [...current], accepted: null });

  for (let i = 0; i < input.length; i++) {
    const sym = input[i];
    const moved = move(current, sym, transitions);
    current = epsilonClosure(moved, transitions);
    steps.push({ charIndex: i, symbol: sym, currentStates: [...current], accepted: null });
    if (current.length === 0) break; // no live paths
  }

  const lastStep = steps[steps.length - 1];
  lastStep.accepted = lastStep.currentStates.some(
    (sid) => states.find((s) => s.id === sid)?.isAccept
  );

  return { steps };
}

// ─── Validation ───────────────────────────────────────────────────

export function validateAutomaton(states, transitions) {
  const warnings = [];
  const starts = states.filter((s) => s.isStart);
  if (starts.length === 0) warnings.push('Nenhum estado inicial definido.');
  if (starts.length > 1) warnings.push('Mais de um estado inicial (inválido para DFA).');
  if (states.filter((s) => s.isAccept).length === 0)
    warnings.push('Nenhum estado de aceitação definido.');
  return warnings;
}

// ─── Helpers ─────────────────────────────────────────────────────

export function uniqueId() {
  return Math.random().toString(36).slice(2, 9);
}

/** Distributes states in a circle on the canvas. */
function circleLayout(stateList, cx = 420, cy = 270, r = 180) {
  const n = stateList.length;
  return stateList.map((s, i) => ({
    ...s,
    x: Math.round(cx + r * Math.cos((2 * Math.PI * i) / n - Math.PI / 2)),
    y: Math.round(cy + r * Math.sin((2 * Math.PI * i) / n - Math.PI / 2)),
  }));
}

// ─── NFA → DFA (Subset Construction) ─────────────────────────────

/**
 * Convert an NFA to an equivalent DFA using subset construction.
 * @param {Array} nfaStates
 * @param {Array} nfaTransitions
 * @param {string} alphabetStr  — comma-separated, e.g. "0, 1"
 * @returns {{ states: Array, transitions: Array }}
 */
export function nfaToDfa(nfaStates, nfaTransitions, alphabetStr) {
  const symbols = alphabetStr.split(',').map((s) => s.trim()).filter(Boolean);
  const startNfa = nfaStates.find((s) => s.isStart);

  // ε-closure helper (reuses the private one inline)
  const closure = (ids) => {
    const result = new Set(ids);
    const stack = [...ids];
    while (stack.length) {
      const cur = stack.pop();
      nfaTransitions
        .filter((t) => t.from === cur && t.symbol === '')
        .forEach((t) => { if (!result.has(t.to)) { result.add(t.to); stack.push(t.to); } });
    }
    return [...result].sort();
  };

  const moveSet = (ids, sym) => {
    const result = new Set();
    ids.forEach((sid) =>
      nfaTransitions.filter((t) => t.from === sid && t.symbol === sym)
        .forEach((t) => result.add(t.to))
    );
    return [...result];
  };

  const startSet = closure([startNfa?.id].filter(Boolean));
  const key = (ids) => JSON.stringify(ids);

  const dfaStateMap = new Map();   // key → { id, label, nfaIds, isAccept, isStart }
  const queue = [startSet];
  dfaStateMap.set(key(startSet), {
    id: uniqueId(),
    label: `{${startSet.map((id) => nfaStates.find((s) => s.id === id)?.label ?? id).join(',')}}`,
    nfaIds: startSet,
    isStart: true,
    isAccept: startSet.some((id) => nfaStates.find((s) => s.id === id)?.isAccept),
  });

  const dfaTransitions = [];

  while (queue.length) {
    const current = queue.shift();
    const fromDfa = dfaStateMap.get(key(current));

    for (const sym of symbols) {
      const reached = closure(moveSet(current, sym));
      if (reached.length === 0) continue; // implicit dead state — skip (partial DFA)

      const rKey = key(reached);
      if (!dfaStateMap.has(rKey)) {
        dfaStateMap.set(rKey, {
          id: uniqueId(),
          label: `{${reached.map((id) => nfaStates.find((s) => s.id === id)?.label ?? id).join(',')}}`,
          nfaIds: reached,
          isStart: false,
          isAccept: reached.some((id) => nfaStates.find((s) => s.id === id)?.isAccept),
        });
        queue.push(reached);
      }

      const toDfa = dfaStateMap.get(rKey);
      dfaTransitions.push({ id: uniqueId(), from: fromDfa.id, to: toDfa.id, symbol: sym });
    }
  }

  const rawStates = [...dfaStateMap.values()].map(({ id, label, isStart, isAccept }) =>
    ({ id, label, isStart, isAccept, x: 0, y: 0 })
  );

  return { states: circleLayout(rawStates), transitions: dfaTransitions };
}

// ─── DFA Minimization (Hopcroft partitions) ───────────────────────

/**
 * Minimize a DFA using the table-filling / partition-refinement algorithm.
 * @param {Array} dfaStates
 * @param {Array} dfaTransitions
 * @param {string} alphabetStr  — comma-separated
 * @returns {{ states: Array, transitions: Array }}
 */
export function minimizeDfa(dfaStates, dfaTransitions, alphabetStr) {
  const symbols = alphabetStr.split(',').map((s) => s.trim()).filter(Boolean);

  // Remove unreachable states first
  const reachable = new Set();
  const start = dfaStates.find((s) => s.isStart);
  if (!start) return { states: dfaStates, transitions: dfaTransitions };

  const queue = [start.id];
  reachable.add(start.id);
  while (queue.length) {
    const cur = queue.shift();
    dfaTransitions
      .filter((t) => t.from === cur)
      .forEach((t) => { if (!reachable.has(t.to)) { reachable.add(t.to); queue.push(t.to); } });
  }

  const states = dfaStates.filter((s) => reachable.has(s.id));
  const transitions = dfaTransitions.filter((t) => reachable.has(t.from) && reachable.has(t.to));

  // Transition lookup: stateId × symbol → stateId | null
  const delta = (sid, sym) =>
    transitions.find((t) => t.from === sid && t.symbol === sym)?.to ?? null;

  // Initial partition: accepting vs non-accepting
  const accepting = states.filter((s) => s.isAccept).map((s) => s.id);
  const nonAccepting = states.filter((s) => !s.isAccept).map((s) => s.id);

  let partitions = [];
  if (accepting.length) partitions.push(new Set(accepting));
  if (nonAccepting.length) partitions.push(new Set(nonAccepting));

  // Map stateId → partition index
  const partOf = (sid) => partitions.findIndex((p) => p.has(sid));

  let changed = true;
  while (changed) {
    changed = false;
    const next = [];
    for (const part of partitions) {
      // Split part based on distinguishability
      const groups = new Map();
      for (const sid of part) {
        const sig = symbols.map((sym) => partOf(delta(sid, sym))).join(',');
        if (!groups.has(sig)) groups.set(sig, new Set());
        groups.get(sig).add(sid);
      }
      if (groups.size > 1) changed = true;
      groups.forEach((g) => next.push(g));
    }
    partitions = next;
  }

  // Build minimized DFA — one state per partition, representative = first element
  const repOf = (sid) => {
    const p = partitions.find((part) => part.has(sid));
    return p ? [...p][0] : null;
  };

  // Unique partitions as new states
  const seenReps = new Set();
  const newStates = [];
  let labelIdx = 0;

  for (const part of partitions) {
    const rep = [...part][0];
    if (seenReps.has(rep)) continue;
    seenReps.add(rep);
    const original = states.find((s) => s.id === rep);
    newStates.push({
      id: rep,
      label: `q${labelIdx++}`,
      isStart: part.has(start.id),
      isAccept: !!original?.isAccept,
      x: 0, y: 0,
    });
  }

  // Build new transitions using representatives
  const newTransitions = [];
  const seenTrans = new Set();
  for (const s of newStates) {
    for (const sym of symbols) {
      const target = delta(s.id, sym);
      if (!target) continue;
      const targetRep = repOf(target);
      if (!targetRep) continue;
      const tKey = `${s.id}|${sym}|${targetRep}`;
      if (!seenTrans.has(tKey)) {
        seenTrans.add(tKey);
        newTransitions.push({ id: uniqueId(), from: s.id, to: targetRep, symbol: sym });
      }
    }
  }

  return { states: circleLayout(newStates), transitions: newTransitions };
}

// ─── Example Automata ─────────────────────────────────────────────

export const EXAMPLES = [
  {
    name: 'Aceita "ab" no final (DFA)',
    description: 'Aceita todas as strings do alfabeto {a,b} que terminam com "ab".',
    states: [
      { id: 'q0', label: 'q0', isStart: true,  isAccept: false, x: 120, y: 200 },
      { id: 'q1', label: 'q1', isStart: false, isAccept: false, x: 300, y: 200 },
      { id: 'q2', label: 'q2', isStart: false, isAccept: true,  x: 480, y: 200 },
    ],
    transitions: [
      { id: 't1', from: 'q0', to: 'q0', symbol: 'b' },
      { id: 't2', from: 'q0', to: 'q1', symbol: 'a' },
      { id: 't3', from: 'q1', to: 'q1', symbol: 'a' },
      { id: 't4', from: 'q1', to: 'q2', symbol: 'b' },
      { id: 't5', from: 'q2', to: 'q1', symbol: 'a' },
      { id: 't6', from: 'q2', to: 'q0', symbol: 'b' },
    ],
  },
  {
    name: 'Número par de a\'s (DFA)',
    description: 'Aceita strings de {a,b} com um número par de "a" (0 também é par).',
    states: [
      { id: 'q0', label: 'q0', isStart: true,  isAccept: true,  x: 150, y: 200 },
      { id: 'q1', label: 'q1', isStart: false, isAccept: false, x: 380, y: 200 },
    ],
    transitions: [
      { id: 't1', from: 'q0', to: 'q1', symbol: 'a' },
      { id: 't2', from: 'q0', to: 'q0', symbol: 'b' },
      { id: 't3', from: 'q1', to: 'q0', symbol: 'a' },
      { id: 't4', from: 'q1', to: 'q1', symbol: 'b' },
    ],
  },
  {
    name: 'Começa com "a" e termina com "b" (NFA)',
    description: 'NFA que aceita strings que começam com "a" e terminam com "b".',
    states: [
      { id: 'q0', label: 'q0', isStart: true,  isAccept: false, x: 100, y: 200 },
      { id: 'q1', label: 'q1', isStart: false, isAccept: false, x: 280, y: 200 },
      { id: 'q2', label: 'q2', isStart: false, isAccept: true,  x: 460, y: 200 },
    ],
    transitions: [
      { id: 't1', from: 'q0', to: 'q1', symbol: 'a' },
      { id: 't2', from: 'q1', to: 'q1', symbol: 'a' },
      { id: 't3', from: 'q1', to: 'q1', symbol: 'b' },
      { id: 't4', from: 'q1', to: 'q2', symbol: 'b' },
    ],
  },
  {
    name: 'Aceita "a*b+" (DFA)',
    description: 'Zero ou mais "a" seguidos de um ou mais "b".',
    states: [
      { id: 'q0', label: 'q0', isStart: true,  isAccept: false, x: 100, y: 200 },
      { id: 'q1', label: 'q1', isStart: false, isAccept: true,  x: 300, y: 200 },
      { id: 'q2', label: 'q2', isStart: false, isAccept: false, x: 500, y: 200 },
    ],
    transitions: [
      { id: 't1', from: 'q0', to: 'q0', symbol: 'a' },
      { id: 't2', from: 'q0', to: 'q1', symbol: 'b' },
      { id: 't3', from: 'q1', to: 'q1', symbol: 'b' },
      { id: 't4', from: 'q1', to: 'q2', symbol: 'a' },
      { id: 't5', from: 'q2', to: 'q2', symbol: 'a' },
      { id: 't6', from: 'q2', to: 'q2', symbol: 'b' },
    ],
  },
  {
    name: '(0*1*)000(0+1)* — NFA (Questão 3)',
    description: 'NFA de 5 estados: prefixo 0*1*, depois exatamente "000", depois qualquer coisa. Nota: q0 tem DUAS setas em "0" — uma self-loop (0*) e uma para q2 (início não-det. do "000").',
    alphabet: '0, 1',
    states: [
      { id: 'nq0', label: 'q0', isStart: true,  isAccept: false, x: 80,  y: 260 },
      { id: 'nq1', label: 'q1', isStart: false, isAccept: false, x: 230, y: 130 },
      { id: 'nq2', label: 'q2', isStart: false, isAccept: false, x: 370, y: 260 },
      { id: 'nq3', label: 'q3', isStart: false, isAccept: false, x: 510, y: 260 },
      { id: 'nq4', label: 'q4', isStart: false, isAccept: true,  x: 650, y: 260 },
    ],
    transitions: [
      { id: 'nt1', from: 'nq0', to: 'nq0', symbol: '0' },
      { id: 'nt2', from: 'nq0', to: 'nq1', symbol: '1' },
      { id: 'nt3', from: 'nq0', to: 'nq2', symbol: '0' },
      { id: 'nt4', from: 'nq1', to: 'nq1', symbol: '1' },
      { id: 'nt5', from: 'nq1', to: 'nq2', symbol: '0' },
      { id: 'nt6', from: 'nq2', to: 'nq3', symbol: '0' },
      { id: 'nt7', from: 'nq3', to: 'nq4', symbol: '0' },
      { id: 'nt8', from: 'nq4', to: 'nq4', symbol: '0' },
      { id: 'nt9', from: 'nq4', to: 'nq4', symbol: '1' },
    ],
  },
];
