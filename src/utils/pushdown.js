// ── pushdown.js ───────────────────────────────────────────────────
// PDA (Pushdown Automaton) simulation.
//
// Transitions: { id, from, to, symbol, pop, push }
//   symbol: input symbol consumed ('ε' = don't consume)
//   pop:    symbol popped from top of stack ('ε' = don't pop)  
//   push:   string pushed onto stack ('ε' = don't push; 'AB' pushes A then B with A on top)
//
// Acceptance: by final state (stack empty acceptance can be added later)

export const EPSILON = 'ε';
export const BOTTOM  = 'Z₀'; // initial stack bottom marker

/**
 * Simulate a PDA on `input` (non-deterministic, BFS over configurations).
 * Returns { steps: [...], accepted }
 * Each step: { config: { stateId, tape, stackSnapshot }, transitions taken }
 */
export function simulatePDA(states, transitions, input, maxConfigs = 500) {
  const startState = states.find((s) => s.isStart);
  if (!startState) return { error: 'Nenhum estado inicial definido.' };

  // Configuration: { stateId, inputPos, stack: string[], history: step[] }
  const initial = {
    stateId: startState.id,
    inputPos: 0,
    stack: [BOTTOM],
    history: [{
      stateId: startState.id,
      inputPos: 0,
      stack: [BOTTOM],
      symbol: null,
      pop: null,
      push: null,
    }],
  };

  const queue = [initial];
  let explored = 0;

  while (queue.length > 0 && explored < maxConfigs) {
    explored++;
    const config = queue.shift();
    const { stateId, inputPos, stack, history } = config;

    const inputConsumed = inputPos >= input.length;
    const finalState = states.find((s) => s.id === stateId && s.isAccept);

    if (inputConsumed && finalState) {
      return { accepted: true, steps: history };
    }

    const stackTop = stack.length > 0 ? stack[stack.length - 1] : EPSILON;
    const currentSymbol = inputPos < input.length ? input[inputPos] : EPSILON;

    // Find applicable transitions
    const applicable = transitions.filter((t) => {
      if (t.from !== stateId) return false;
      // Input match
      const inputOk = t.symbol === EPSILON || t.symbol === currentSymbol;
      // Stack match
      const stackOk = t.pop === EPSILON || t.pop === stackTop;
      return inputOk && stackOk;
    });

    for (const t of applicable) {
      const newInputPos = t.symbol !== EPSILON ? inputPos + 1 : inputPos;
      // Build new stack: pop, then push (push string is reversed onto stack)
      let newStack = [...stack];
      if (t.pop !== EPSILON && newStack.length > 0) {
        newStack.pop();
      }
      if (t.push !== EPSILON) {
        // Push each character of push string onto stack (right-to-left so first char is on top)
        const pushSyms = t.push.split('').reverse();
        newStack.push(...pushSyms);
      }

      const step = {
        stateId: t.to,
        inputPos: newInputPos,
        stack: [...newStack],
        symbol: t.symbol,
        pop: t.pop,
        push: t.push,
        transitionId: t.id,
      };
      queue.push({
        stateId: t.to,
        inputPos: newInputPos,
        stack: newStack,
        history: [...history, step],
      });
    }
  }

  return { accepted: false, steps: null };
}

export const PDA_EXAMPLES = [
  {
    name: 'aⁿbⁿ — Pilha clássica',
    description: 'Aceita strings do tipo aⁿbⁿ (n≥1).',
    states: [
      { id: 'q0', label: 'q0', isStart: true,  isAccept: false, x: 100, y: 200 },
      { id: 'q1', label: 'q1', isStart: false, isAccept: false, x: 280, y: 200 },
      { id: 'q2', label: 'q2', isStart: false, isAccept: true,  x: 460, y: 200 },
    ],
    transitions: [
      { id: 't1', from: 'q0', to: 'q0', symbol: 'a', pop: EPSILON, push: 'A' },
      { id: 't2', from: 'q0', to: 'q1', symbol: 'b', pop: 'A',     push: EPSILON },
      { id: 't3', from: 'q1', to: 'q1', symbol: 'b', pop: 'A',     push: EPSILON },
      { id: 't4', from: 'q1', to: 'q2', symbol: EPSILON, pop: BOTTOM, push: BOTTOM },
    ],
  },
  {
    name: 'Palíndromos sobre {a,b}',
    description: 'Aceita palíndromos de tamanho par ou ímpar.',
    states: [
      { id: 'q0', label: 'q0', isStart: true,  isAccept: false, x: 100, y: 200 },
      { id: 'q1', label: 'q1', isStart: false, isAccept: false, x: 300, y: 200 },
      { id: 'q2', label: 'q2', isStart: false, isAccept: true,  x: 500, y: 200 },
    ],
    transitions: [
      // Push phase
      { id: 't1', from: 'q0', to: 'q0', symbol: 'a', pop: EPSILON, push: 'A' },
      { id: 't2', from: 'q0', to: 'q0', symbol: 'b', pop: EPSILON, push: 'B' },
      // Guess middle — odd length
      { id: 't3', from: 'q0', to: 'q1', symbol: 'a', pop: EPSILON, push: EPSILON },
      { id: 't4', from: 'q0', to: 'q1', symbol: 'b', pop: EPSILON, push: EPSILON },
      // Guess middle — even length
      { id: 't5', from: 'q0', to: 'q1', symbol: EPSILON, pop: EPSILON, push: EPSILON },
      // Pop phase
      { id: 't6', from: 'q1', to: 'q1', symbol: 'a', pop: 'A', push: EPSILON },
      { id: 't7', from: 'q1', to: 'q1', symbol: 'b', pop: 'B', push: EPSILON },
      // Accept
      { id: 't8', from: 'q1', to: 'q2', symbol: EPSILON, pop: BOTTOM, push: BOTTOM },
    ],
  },
];
