import React, { useState, useEffect, useCallback } from 'react';
import { simulateDFA, simulateNFA } from '../utils/automaton';
import './Simulator.css';

export default function Simulator({ states, transitions, automataType, onActiveStates, onActiveTransition, onActiveSymbol, onAccepted }) {
  const [input, setInput] = useState('');
  const [steps, setSteps] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);

  const reset = useCallback(() => {
    setSteps(null);
    setStepIndex(0);
    setError(null);
    onActiveStates(null);
    onActiveTransition?.(null);
    onActiveSymbol?.(null);
    onAccepted(null);
  }, [onActiveStates, onActiveTransition, onActiveSymbol, onAccepted]);

  const simulate = useCallback(() => {
    reset();
    const result =
      automataType === 'NFA'
        ? simulateNFA(states, transitions, input)
        : simulateDFA(states, transitions, input);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSteps(result.steps);
    setStepIndex(0);
    // Show initial state immediately
    applyStep(result.steps, 0);
  }, [states, transitions, input, automataType, reset]);

  const applyStep = (stps, idx) => {
    const step = stps[idx];
    if (!step) return;
    if (step.currentStates) {
      onActiveStates(new Set(step.currentStates));
    } else if (step.toState) {
      onActiveStates(new Set([step.toState]));
    } else {
      onActiveStates(new Set());
    }
    onActiveTransition?.(step.transitionId ?? null);
    onActiveSymbol?.(step.symbol ?? null);
    if (step.accepted !== null) onAccepted(step.accepted);
  };

  const handleStep = () => {
    if (!steps) { simulate(); return; }
    const nextIdx = stepIndex + 1;
    if (nextIdx >= steps.length) return;
    setStepIndex(nextIdx);
    applyStep(steps, nextIdx);
  };

  const handleRunAll = useCallback(() => {
    reset();
    const result =
      automataType === 'NFA'
        ? simulateNFA(states, transitions, input)
        : simulateDFA(states, transitions, input);

    if (result.error) { setError(result.error); return; }

    setSteps(result.steps);
    const last = result.steps.length - 1;
    setStepIndex(last);
    applyStep(result.steps, last);
  }, [states, transitions, input, automataType, reset]);

  useEffect(() => { reset(); }, [states, transitions]);

  const currentStep = steps ? steps[stepIndex] : null;
  const isFinished = steps && stepIndex === steps.length - 1;

  const accepted = currentStep?.accepted;

  const traceItems = steps ? steps.slice(1, stepIndex + 1) : [];

  return (
    <div className="simulator">
      <div className="sim-input-row">
        <span className="sim-label">w =</span>
        <input
          className="sim-input mono"
          placeholder="Digite a string de entrada..."
          value={input}
          onChange={(e) => { setInput(e.target.value); reset(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleRunAll(); }}
        />
        <button className="sim-btn step" onClick={handleStep} disabled={isFinished && steps !== null}>
          {steps ? 'Próximo →' : 'Iniciar'}
        </button>
        <button className="sim-btn run" onClick={handleRunAll}>
          ▶ Executar
        </button>
        <button className="sim-btn reset" onClick={reset} disabled={!steps}>
          ↺ Reset
        </button>
      </div>

      {error && <div className="sim-error">{error}</div>}

      {/* Tape */}
      {input.length > 0 && (
        <div className="tape-row">
          {input.split('').map((ch, i) => {
            const isCurrent = currentStep && i === currentStep.charIndex;
            const isPast = steps && i < stepIndex;
            return (
              <div
                key={i}
                className={`tape-cell mono ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`}
              >
                {ch}
              </div>
            );
          })}
          {steps && <div className="tape-cell mono end">⊣</div>}
        </div>
      )}

      {/* Trace */}
      {traceItems.length > 0 && (
        <div className="trace-row">
          {traceItems.map((step, i) => {
            const stateLabel = (id) => states.find((s) => s.id === id)?.label ?? id;
            const isLast = i === traceItems.length - 1;
            return (
              <div key={i} className={`trace-item ${isLast ? 'current' : ''}`}>
                {step.symbol !== null && (
                  <>
                    <span className="trace-sym mono">'{step.symbol}'</span>
                    <span className="trace-arrow">→</span>
                  </>
                )}
                <span className="trace-state">
                  {step.currentStates
                    ? `{${step.currentStates.map(stateLabel).join(',')}}`
                    : (step.toState ? stateLabel(step.toState) : '∅')}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Result banner */}
      {isFinished && accepted !== null && (
        <div className={`result-banner ${accepted ? 'accept' : 'reject'}`}>
          {accepted ? '✓ ACEITA' : '✗ REJEITADA'}
          <span className="result-sub">
            {accepted
              ? `A string "${input}" é aceita pelo autômato.`
              : `A string "${input}" é rejeitada.`}
          </span>
        </div>
      )}
    </div>
  );
}
