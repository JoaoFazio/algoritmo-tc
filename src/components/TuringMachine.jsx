import React, { useState, useCallback } from 'react';
import { simulateTM, TM_EXAMPLES, BLANK } from '../utils/turing';
import { uniqueId } from '../utils/automaton';
import './TuringMachine.css';

const DIRECTIONS = ['R', 'L', 'S'];

export default function TuringMachine() {
  const [states, setStates]           = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [inputStr, setInputStr]       = useState('aabb');
  const [simResult, setSimResult]     = useState(null);
  const [stepIdx, setStepIdx]         = useState(0);
  const [newStateName, setNewStateName] = useState('');

  // Transition editor row state
  const [editRow, setEditRow] = useState({
    fromState: '', readSymbol: '', toState: '', writeSymbol: '', direction: 'R',
  });

  const snapshot = simResult?.steps?.[stepIdx] ?? null;

  // ── State management ──
  const addState = () => {
    const name = newStateName.trim() || `q${states.length}`;
    if (states.find((s) => s.label === name)) return;
    const isStart = states.length === 0;
    setStates((p) => [...p, { id: uniqueId(), label: name, isStart, isAccept: false }]);
    setNewStateName('');
  };
  const removeState = (id) => {
    setStates((p) => p.filter((s) => s.id !== id));
    setTransitions((p) => p.filter((t) => t.fromState !== id && t.toState !== id));
  };
  const toggleStart  = (id) => setStates((p) => p.map((s) => ({ ...s, isStart:  s.id === id })));
  const toggleAccept = (id) => setStates((p) => p.map((s) => s.id === id ? { ...s, isAccept: !s.isAccept } : s));

  // ── Add transition ──
  const addTransition = () => {
    const { fromState, readSymbol, toState, writeSymbol, direction } = editRow;
    if (!fromState || !readSymbol || !toState || !writeSymbol || !direction) return;
    // Find state IDs by label
    const from = states.find((s) => s.label === fromState);
    const to   = states.find((s) => s.label === toState);
    if (!from || !to) return;
    setTransitions((p) => [...p, {
      id: uniqueId(), fromState: from.id, readSymbol, toState: to.id, writeSymbol, direction,
    }]);
    setEditRow({ ...editRow, readSymbol: '', writeSymbol: '' });
  };

  // ── Simulation ──
  const runSim = useCallback(() => {
    setSimResult(null);
    const res = simulateTM(states, transitions, inputStr);
    setSimResult(res);
    setStepIdx(0);
  }, [states, transitions, inputStr]);

  const gotoStep = (i) => {
    if (!simResult?.steps) return;
    setStepIdx(Math.max(0, Math.min(i, simResult.steps.length - 1)));
  };

  const loadExample = (ex) => {
    setStates(ex.states.map((s) => ({ ...s })));
    setTransitions(ex.transitions.map((t) => ({ ...t })));
    setSimResult(null);
    setStepIdx(0);
    setInputStr('aabb');
  };

  // ── Helpers ──
  const stateLabel = (id) => states.find((s) => s.id === id)?.label ?? id;
  const visibleTape = snapshot?.tape ?? (inputStr ? inputStr.split('') : [BLANK]);
  const headPos     = snapshot?.head ?? 0;
  const curState    = snapshot?.state ? stateLabel(snapshot.state) : (states.find((s) => s.isStart)?.label ?? '—');
  const totalSteps  = simResult?.steps?.length ?? 0;
  const accepted    = simResult?.accepted;

  // Tape window: show 15 cells centered on head
  const WINDOW = 15;
  const tapeWithPad = [...visibleTape];
  while (tapeWithPad.length <= headPos + 5) tapeWithPad.push(BLANK);
  const windowStart = Math.max(0, headPos - Math.floor(WINDOW / 2));
  const windowCells = Array.from({ length: WINDOW }, (_, i) => ({
    idx: windowStart + i,
    sym: tapeWithPad[windowStart + i] ?? BLANK,
  }));

  return (
    <div className="tm-layout">
      {/* ── Main area ── */}
      <div className="tm-main">
        {/* Tape */}
        <div className="tm-tape-area">
          <div className="tm-tape-label">FITA</div>
          <div className="tm-tape">
            {windowCells.map(({ idx, sym }) => (
              <div key={idx} className={`tm-cell mono ${idx === headPos ? 'active' : ''}`}>
                {sym}
                {idx === headPos && <div className="tm-head-arrow">▲</div>}
              </div>
            ))}
          </div>
          <div className="tm-state-display">
            Estado: <span className="tm-cur-state mono">{curState}</span>
            {snapshot?.note && (
              <span className={`tm-note ${snapshot.note === 'aceita' ? 'accept' : snapshot.note === 'rejeita' ? 'reject' : ''}`}>
                {snapshot.note === 'aceita' ? '  ✓ ACEITA' : snapshot.note === 'rejeita' ? '  ✗ REJEITA' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Sim controls */}
        <div className="tm-controls">
          <label className="sim-label">w =</label>
          <input className="tm-input mono" value={inputStr}
            onChange={(e) => { setInputStr(e.target.value); setSimResult(null); }} />
          <button className="tm-btn run" onClick={runSim}>▶ Executar</button>
          <button className="tm-btn" onClick={() => gotoStep(stepIdx - 1)} disabled={!simResult || stepIdx === 0}>◀ Anterior</button>
          <button className="tm-btn" onClick={() => gotoStep(stepIdx + 1)} disabled={!simResult || stepIdx >= totalSteps - 1}>Próximo ▶</button>
          <span className="tm-step-counter">{simResult ? `Passo ${stepIdx + 1} / ${totalSteps}` : ''}</span>
          {simResult?.error && <span className="tm-error">{simResult.error}</span>}
        </div>

        {/* Step timeline */}
        {simResult && (
          <div className="tm-timeline">
            {simResult.steps.map((step, i) => (
              <button
                key={i}
                className={`timeline-dot ${i === stepIdx ? 'cur' : ''} ${step.note === 'aceita' ? 'acc' : step.note === 'rejeita' ? 'rej' : ''}`}
                onClick={() => gotoStep(i)}
                title={`Passo ${i + 1}: ${stateLabel(step.state)}`}
              />
            ))}
          </div>
        )}

        {/* Transition table */}
        <div className="tm-table-area">
          <div className="tm-table-title">Função de Transição δ</div>
          <table className="tm-table">
            <thead>
              <tr>
                <th>Estado</th><th>Lê</th><th>Novo Estado</th><th>Escreve</th><th>Direção</th><th></th>
              </tr>
            </thead>
            <tbody>
              {transitions.map((t) => {
                const isCurrent = snapshot && snapshot.state === t.fromState;
                return (
                  <tr key={t.id} className={isCurrent ? 'row-current' : ''}>
                    <td className="mono">{stateLabel(t.fromState)}</td>
                    <td className="mono">{t.readSymbol}</td>
                    <td className="mono">{stateLabel(t.toState)}</td>
                    <td className="mono">{t.writeSymbol}</td>
                    <td className="mono dir">{t.direction}</td>
                    <td>
                      <button className="del-trans" onClick={() => setTransitions((p) => p.filter((x) => x.id !== t.id))}>✕</button>
                    </td>
                  </tr>
                );
              })}

              {/* Add row */}
              <tr className="add-row">
                <td>
                  <select className="tm-select" value={editRow.fromState}
                    onChange={(e) => setEditRow({ ...editRow, fromState: e.target.value })}>
                    <option value="">—</option>
                    {states.map((s) => <option key={s.id} value={s.label}>{s.label}</option>)}
                  </select>
                </td>
                <td>
                  <input className="tm-cell-input mono" maxLength={1} placeholder="a"
                    value={editRow.readSymbol}
                    onChange={(e) => setEditRow({ ...editRow, readSymbol: e.target.value })} />
                </td>
                <td>
                  <select className="tm-select" value={editRow.toState}
                    onChange={(e) => setEditRow({ ...editRow, toState: e.target.value })}>
                    <option value="">—</option>
                    {states.map((s) => <option key={s.id} value={s.label}>{s.label}</option>)}
                  </select>
                </td>
                <td>
                  <input className="tm-cell-input mono" maxLength={1} placeholder="b"
                    value={editRow.writeSymbol}
                    onChange={(e) => setEditRow({ ...editRow, writeSymbol: e.target.value })} />
                </td>
                <td>
                  <select className="tm-select" value={editRow.direction}
                    onChange={(e) => setEditRow({ ...editRow, direction: e.target.value })}>
                    {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </td>
                <td>
                  <button className="add-trans-btn" onClick={addTransition}>+</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <aside className="tm-sidebar">
        <section className="tm-section">
          <h3 className="tm-section-title">Estados</h3>
          <div className="state-add-row">
            <input className="tm-input" placeholder="nome do estado..."
              value={newStateName} onChange={(e) => setNewStateName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addState(); }} />
            <button className="tm-btn add" onClick={addState}>+</button>
          </div>
          <div className="state-list">
            {states.map((s) => (
              <div key={s.id} className="state-row">
                <span className={`state-chip mono ${s.isStart ? 'start' : ''} ${s.isAccept ? 'accept' : ''}`}>
                  {s.isStart && '▶ '}{s.label}{s.isAccept && ' ◎'}
                </span>
                <div className="state-actions">
                  <button className="sa-btn" title="Tornar inicial" onClick={() => toggleStart(s.id)}>▶</button>
                  <button className="sa-btn" title="Toggle aceitação" onClick={() => toggleAccept(s.id)}>◎</button>
                  <button className="sa-btn del" onClick={() => removeState(s.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="tm-section">
          <h3 className="tm-section-title">Referência</h3>
          <table className="tm-ref">
            <tbody>
              {[['R', 'Move para direita'],['L', 'Move para esquerda'],['S', 'Fica no lugar'],['_', 'Símbolo branco (blank)']].map(([s,d]) => (
                <tr key={s}><td className="mono ref-s">{s}</td><td className="ref-d">{d}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="tm-section">
          <h3 className="tm-section-title">Exemplos</h3>
          {TM_EXAMPLES.map((ex, i) => (
            <button key={i} className="tm-example-btn" onClick={() => loadExample(ex)}>
              <span className="ex-name">{ex.name}</span>
              <span className="ex-desc">{ex.description}</span>
            </button>
          ))}
        </section>

        <section className="tm-section">
          <button className="tm-clear-btn" onClick={() => { setStates([]); setTransitions([]); setSimResult(null); }}>
            🗑 Limpar tudo
          </button>
        </section>
      </aside>
    </div>
  );
}
