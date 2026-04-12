// ── turing.js ─────────────────────────────────────────────────────
// Turing Machine simulation.
//
// Transition function: { id, fromState, readSymbol, toState, writeSymbol, direction }
//   direction: 'L' (left) | 'R' (right) | 'S' (stay)
//   readSymbol / writeSymbol: single char; '_' = blank

export const BLANK = '_';

/**
 * Simulate a TM on `input`.
 * Returns { steps: [...snapshot], accepted: bool, error? }
 * Each snapshot: { tape: string[], head: number, state: string }
 */
export function simulateTM(states, transitions, input, maxSteps = 200) {
  const startState = states.find((s) => s.isStart);
  if (!startState) return { error: 'Nenhum estado inicial definido.' };

  // Tape as array of characters; pad with blanks
  let tape = input.split('');
  if (tape.length === 0) tape = [BLANK];
  let head = 0;
  let currentState = startState.id;
  const steps = [];

  // Snapshot helper
  const snapshot = (note) => ({
    tape: [...tape],
    head,
    state: currentState,
    note: note || null,
  });

  steps.push(snapshot('início'));

  for (let i = 0; i < maxSteps; i++) {
    const readSym = tape[head] ?? BLANK;
    const trans = transitions.find(
      (t) => t.fromState === currentState && t.readSymbol === readSym
    );

    if (!trans) {
      // No transition — halt
      const finalState = states.find((s) => s.id === currentState && s.isAccept);
      steps.push(snapshot(finalState ? 'aceita' : 'rejeita'));
      return { steps, accepted: !!finalState };
    }

    // Apply transition
    tape[head] = trans.writeSymbol;
    currentState = trans.toState;

    if (trans.direction === 'R') {
      head++;
      if (head >= tape.length) tape.push(BLANK); // extend tape
    } else if (trans.direction === 'L') {
      if (head > 0) head--;
      else tape.unshift(BLANK); // extend left
    }
    // 'S' — stay

    steps.push(snapshot());

    // Check if new state is halting (no outgoing transitions)
    const newReadSym = tape[head] ?? BLANK;
    const hasTrans = transitions.some(
      (t) => t.fromState === currentState && t.readSymbol === newReadSym
    );
    const isFinal = states.find((s) => s.id === currentState && s.isAccept);
    if (!hasTrans) {
      steps.push(snapshot(isFinal ? 'aceita' : 'rejeita'));
      return { steps, accepted: !!isFinal };
    }
  }

  return { steps, accepted: false, error: `Limite de ${maxSteps} passos atingido.` };
}

export const TM_EXAMPLES = [
  {
    name: 'Reconhece aⁿbⁿ',
    description: 'Marca um "a" e um "b" por vez até acabar. Aceita se tiver igual quantidade.',
    states: [
      { id: 'q0', label: 'q0', isStart: true,  isAccept: false },
      { id: 'q1', label: 'q1', isStart: false, isAccept: false },
      { id: 'q2', label: 'q2', isStart: false, isAccept: false },
      { id: 'q3', label: 'q3', isStart: false, isAccept: false },
      { id: 'q4', label: 'q4', isStart: false, isAccept: true  },
    ],
    transitions: [
      // Find leftmost unmarked 'a', mark as 'X'
      { id: 't1',  fromState: 'q0', readSymbol: 'a', toState: 'q1', writeSymbol: 'X', direction: 'R' },
      // Skip marked X's and a's going right
      { id: 't2',  fromState: 'q1', readSymbol: 'a', toState: 'q1', writeSymbol: 'a', direction: 'R' },
      { id: 't3',  fromState: 'q1', readSymbol: 'Y', toState: 'q1', writeSymbol: 'Y', direction: 'R' },
      // Find leftmost unmarked 'b', mark as 'Y'
      { id: 't4',  fromState: 'q1', readSymbol: 'b', toState: 'q2', writeSymbol: 'Y', direction: 'L' },
      // Go back to left
      { id: 't5',  fromState: 'q2', readSymbol: 'a', toState: 'q2', writeSymbol: 'a', direction: 'L' },
      { id: 't6',  fromState: 'q2', readSymbol: 'Y', toState: 'q2', writeSymbol: 'Y', direction: 'L' },
      { id: 't7',  fromState: 'q2', readSymbol: 'X', toState: 'q0', writeSymbol: 'X', direction: 'R' },
      // Check all a's are marked
      { id: 't8',  fromState: 'q0', readSymbol: 'Y', toState: 'q3', writeSymbol: 'Y', direction: 'R' },
      { id: 't9',  fromState: 'q3', readSymbol: 'Y', toState: 'q3', writeSymbol: 'Y', direction: 'R' },
      { id: 't10', fromState: 'q3', readSymbol: '_', toState: 'q4', writeSymbol: '_', direction: 'S' },
    ],
  },
  {
    name: 'Copia string (a\'s)',
    description: 'Transforma "aaa" em "aaa_aaa" — copia a string de a\'s.',
    states: [
      { id: 'q0', label: 'q0', isStart: true,  isAccept: false },
      { id: 'q1', label: 'q1', isStart: false, isAccept: false },
      { id: 'q2', label: 'q2', isStart: false, isAccept: false },
      { id: 'q3', label: 'q3', isStart: false, isAccept: false },
      { id: 'qa', label: 'qa', isStart: false, isAccept: true  },
    ],
    transitions: [
      // Mark 'a' as 'X', go right to find blank, write 'a', come back
      { id: 't1', fromState: 'q0', readSymbol: 'a', toState: 'q1', writeSymbol: 'X', direction: 'R' },
      { id: 't2', fromState: 'q1', readSymbol: 'a', toState: 'q1', writeSymbol: 'a', direction: 'R' },
      { id: 't3', fromState: 'q1', readSymbol: '_', toState: 'q1', writeSymbol: '_', direction: 'R' },
      { id: 't4', fromState: 'q1', readSymbol: 'A', toState: 'q1', writeSymbol: 'A', direction: 'R' },
      { id: 't5', fromState: 'q1', readSymbol: '_', toState: 'q2', writeSymbol: 'A', direction: 'L' },
      // Go back left to find next unmarked 'a'
      { id: 't6', fromState: 'q2', readSymbol: 'A', toState: 'q2', writeSymbol: 'A', direction: 'L' },
      { id: 't7', fromState: 'q2', readSymbol: '_', toState: 'q2', writeSymbol: '_', direction: 'L' },
      { id: 't8', fromState: 'q2', readSymbol: 'a', toState: 'q2', writeSymbol: 'a', direction: 'L' },
      { id: 't9', fromState: 'q2', readSymbol: 'X', toState: 'q0', writeSymbol: 'X', direction: 'R' },
      // No more 'a's — restore X's
      { id: 't10', fromState: 'q0', readSymbol: '_', toState: 'q3', writeSymbol: '_', direction: 'R' },
      { id: 't11', fromState: 'q3', readSymbol: 'A', toState: 'q3', writeSymbol: 'a', direction: 'R' },
      { id: 't12', fromState: 'q3', readSymbol: '_', toState: 'qa', writeSymbol: '_', direction: 'S' },
    ],
  },
];
