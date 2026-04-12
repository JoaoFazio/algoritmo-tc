import React, { useState, useCallback } from 'react';
import AutomatonCanvas from './AutomatonCanvas';
import { simulatePDA, PDA_EXAMPLES, EPSILON, BOTTOM } from '../utils/pushdown';
import { uniqueId } from '../utils/automaton';
import PDATransitionModal from './PDATransitionModal';
import './PushdownBuilder.css';

export default function PushdownBuilder() {
  const [states, setStates]           = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [tool, setTool]               = useState('select');
  const [selectedStateId, setSelectedStateId] = useState(null);
  const [transitionSrc, setTransitionSrc]     = useState(null);
  const [pendingTransition, setPendingTransition] = useState(null);
  const [activeStateIds, setActiveStateIds]   = useState(null);
  const [activeTransitionId, setActiveTransitionId] = useState(null);
  const [accepted, setAccepted]               = useState(null);
  const [inputStr, setInputStr]               = useState('');
  const [simResult, setSimResult]             = useState(null);
  const [simStepIdx, setSimStepIdx]           = useState(0);
  const [stackHistory, setStackHistory]       = useState(null);

  // ── State operations ──
  const handleAddState = (x, y) => {
    const id = uniqueId();
    const isStart = states.length === 0;
    setStates((p) => [...p, { id, label: `q${states.length}`, isStart, isAccept: false, x, y }]);
  };
  const handleMoveState = (id, x, y) => setStates((p) => p.map((s) => s.id === id ? { ...s, x, y } : s));
  const handleDeleteState = (id) => {
    setStates((p) => p.filter((s) => s.id !== id));
    setTransitions((p) => p.filter((t) => t.from !== id && t.to !== id));
    if (selectedStateId === id) setSelectedStateId(null);
  };
  const handleDeleteTransition = (id) => setTransitions((p) => p.filter((t) => t.id !== id));
  const handleToggleAccept = (id) => setStates((p) => p.map((s) => s.id === id ? { ...s, isAccept: !s.isAccept } : s));
  const handleToggleStart  = (id) => setStates((p) => p.map((s) => ({ ...s, isStart: s.id === id })));
  const handleRenameState  = (id, label) => setStates((p) => p.map((s) => s.id === id ? { ...s, label } : s));

  const handleTransitionSrc = (id) => setTransitionSrc(id);
  const handleTransitionDst = (id) => {
    if (!transitionSrc) return;
    setPendingTransition({ from: transitionSrc, to: id });
    setTransitionSrc(null);
  };
  const handleAddTransition = (symbol, pop, push) => {
    if (!pendingTransition) return;
    const { from, to } = pendingTransition;
    setTransitions((p) => [...p, { id: uniqueId(), from, to, symbol, pop, push }]);
    setPendingTransition(null);
  };

  // ── Simulation ──
  const runSim = useCallback(() => {
    setSimResult(null);
    const res = simulatePDA(states, transitions, inputStr);
    setSimResult(res);
    if (res.steps?.length) {
      setSimStepIdx(0);
      const first = res.steps[0];
      setActiveStateIds(new Set([first.stateId]));
      setActiveTransitionId(first.transitionId ?? null);
      setAccepted(null);
      setStackHistory(res.steps.map((s) => s.stack));
    } else {
      setAccepted(res.accepted);
      setActiveStateIds(null);
      setActiveTransitionId(null);
    }
  }, [states, transitions, inputStr]);

  // Navigate to a specific step
  const gotoStep = (idx) => {
    if (!simResult?.steps) return;
    const clamped = Math.max(0, Math.min(idx, simResult.steps.length - 1));
    setSimStepIdx(clamped);
    const step = simResult.steps[clamped];
    setActiveStateIds(new Set([step.stateId]));
    setActiveTransitionId(step.transitionId ?? null);
    setAccepted(clamped === simResult.steps.length - 1 ? simResult.accepted : null);
  };

  const handleReset = () => {
    setSimResult(null);
    setActiveStateIds(null);
    setActiveTransitionId(null);
    setAccepted(null);
    setStackHistory(null);
  };

  const loadExample = (ex) => {
    setStates(ex.states.map((s) => ({ ...s })));
    setTransitions(ex.transitions.map((t) => ({ ...t })));
    setSimResult(null);
    setActiveStateIds(null);
    setAccepted(null);
    setStackHistory(null);
    setInputStr('');
  };

  const currentStack = stackHistory ? (stackHistory[simStepIdx] ?? []) : [];

  const tools = [
    { id: 'select',        icon: '↖', label: 'Selecionar' },
    { id: 'addState',      icon: '⊕', label: 'Add Estado' },
    { id: 'addTransition', icon: '→', label: 'Add Transição' },
    { id: 'delete',        icon: '✕', label: 'Deletar' },
  ];

  return (
    <div className="pda-layout">
      {/* ── Canvas + Simulator ── */}
      <div className="pda-center">
        <div className="pda-canvas-wrap">
          <AutomatonCanvas
            states={states} transitions={transitions}
            activeStateIds={activeStateIds} activeTransitionId={activeTransitionId} accepted={accepted}
            tool={tool} selectedStateId={selectedStateId} transitionSrc={transitionSrc}
            onAddState={handleAddState} onMoveState={handleMoveState}
            onSelectState={setSelectedStateId}
            onTransitionSrc={handleTransitionSrc} onTransitionDst={handleTransitionDst}
            onDeleteState={handleDeleteState} onDeleteTransition={handleDeleteTransition}
          />
        </div>

        {/* Simulator bar */}
        <div className="pda-sim-bar">
          <span className="sim-label">w =</span>
          <input className="pda-input mono" placeholder="string de entrada..."
            value={inputStr} onChange={(e) => { setInputStr(e.target.value); handleReset(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') runSim(); }}
          />
          <button className="pda-run-btn" onClick={runSim}>▶ Iniciar</button>
          <button className="pda-step-btn" onClick={() => gotoStep(simStepIdx - 1)}
            disabled={!simResult?.steps || simStepIdx === 0}>◀ Anterior</button>
          <button className="pda-step-btn" onClick={() => gotoStep(simStepIdx + 1)}
            disabled={!simResult?.steps || simStepIdx >= (simResult.steps.length - 1)}>Próximo ▶</button>
          <button className="pda-reset-btn" onClick={handleReset} disabled={!simResult}>↺ Reset</button>

          {simResult?.steps && (
            <span className="pda-step-counter">
              Passo {simStepIdx + 1} / {simResult.steps.length}
            </span>
          )}
          {accepted !== null && (
            <div className={`pda-result ${accepted ? 'accept' : 'reject'}`}>
              {accepted ? '✓ ACEITA' : '✗ REJEITA'}
            </div>
          )}
          {simResult?.error && <div className="pda-error">{simResult.error}</div>}
        </div>

        {/* Stack visualization */}
        {stackHistory && currentStack.length > 0 && (
          <div className="stack-viz">
            <div className="stack-title">Pilha (topo → base)</div>
            <div className="stack-cells">
              {[...currentStack].reverse().map((sym, i) => (
                <div key={i} className={`stack-cell mono ${sym === BOTTOM ? 'bottom' : ''}`}>
                  {sym}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transition trace */}
        {simResult?.steps && (
          <div className="pda-trace">
            {simResult.steps.map((step, i) => (
              <span key={i} className="trace-chip mono">
                {states.find((s) => s.id === step.stateId)?.label ?? step.stateId}
                {step.symbol && <span className="chip-sym"> ,{step.symbol}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <aside className="pda-panel">
        <section className="pda-section">
          <h3 className="pda-section-title">Ferramentas</h3>
          {tools.map((t) => (
            <button key={t.id} className={`pda-tool-btn ${tool === t.id ? 'active' : ''}`}
              onClick={() => { setTool(t.id); setTransitionSrc(null); }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </section>

        {selectedStateId && (() => {
          const st = states.find((s) => s.id === selectedStateId);
          if (!st) return null;
          return (
            <section className="pda-section">
              <h3 className="pda-section-title">Estado</h3>
              <input className="pda-input" value={st.label}
                onChange={(e) => handleRenameState(st.id, e.target.value)} />
              <button className={`pda-toggle ${st.isStart ? 'on' : ''}`} onClick={() => handleToggleStart(st.id)}>
                ▶ {st.isStart ? 'Inicial' : 'Tornar Inicial'}
              </button>
              <button className={`pda-toggle ${st.isAccept ? 'on accept' : ''}`} onClick={() => handleToggleAccept(st.id)}>
                ◎ {st.isAccept ? 'Aceitação' : 'Tornar Aceitação'}
              </button>
            </section>
          );
        })()}

        <section className="pda-section">
          <h3 className="pda-section-title">Transições</h3>
          <div className="trans-list">
            {transitions.length === 0
              ? <p className="pda-hint">Nenhuma transição ainda.</p>
              : transitions.map((t) => {
                  const fs = states.find((s) => s.id === t.from)?.label ?? t.from;
                  const ts = states.find((s) => s.id === t.to)?.label ?? t.to;
                  return (
                    <div key={t.id} className="trans-row">
                      <span className="mono trans-text">
                        {fs} →<sub style={{fontSize:'10px'}}> {t.symbol},{t.pop}/{t.push}</sub> {ts}
                      </span>
                      <button className="trans-del" onClick={() => handleDeleteTransition(t.id)}>✕</button>
                    </div>
                  );
                })
            }
          </div>
        </section>

        <section className="pda-section">
          <h3 className="pda-section-title">Exemplos</h3>
          {PDA_EXAMPLES.map((ex, i) => (
            <button key={i} className="pda-example-btn" onClick={() => loadExample(ex)}>
              <span className="ex-name">{ex.name}</span>
              <span className="ex-desc">{ex.description}</span>
            </button>
          ))}
        </section>

        <section className="pda-section">
          <button className="pda-clear-btn" onClick={() => { setStates([]); setTransitions([]); handleReset(); }}>
            🗑 Limpar tudo
          </button>
        </section>
      </aside>

      {pendingTransition && (
        <PDATransitionModal
          from={states.find((s) => s.id === pendingTransition.from)}
          to={states.find((s) => s.id === pendingTransition.to)}
          onConfirm={handleAddTransition}
          onCancel={() => setPendingTransition(null)}
        />
      )}
    </div>
  );
}
