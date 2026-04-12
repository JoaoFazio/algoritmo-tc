import React, { useState } from 'react';
import { EXAMPLES } from '../utils/automaton';
import './ControlPanel.css';

export default function ControlPanel({
  tool, onToolChange,
  states, transitions,
  selectedStateId,
  onRenameState,
  onToggleAccept,
  onToggleStart,
  onClearAll,
  onLoadExample,
  automataType, onAutomataTypeChange,
  alphabet, onAlphabetChange,
  erPattern, onErPatternChange,
  onValidate,
  validationResult,
  onConvertNfaToDfa,
  onMinimizeDfa,
}) {
  const [newTransitionSymbol, setNewTransitionSymbol] = useState('');
  const selectedState = states.find((s) => s.id === selectedStateId);

  const tools = [
    { id: 'select',        icon: '↖',  label: 'Selecionar / Mover' },
    { id: 'addState',      icon: '⊕',  label: 'Adicionar Estado' },
    { id: 'addTransition', icon: '→',  label: 'Adicionar Transição' },
    { id: 'delete',        icon: '✕',  label: 'Deletar' },
  ];

  return (
    <aside className="control-panel">
      {/* ── Automata type ── */}
      <section className="panel-section">
        <h3 className="panel-title">Tipo</h3>
        <div className="type-toggle">
          {['DFA', 'NFA'].map((t) => (
            <button
              key={t}
              className={`type-btn ${automataType === t ? 'active' : ''}`}
              onClick={() => onAutomataTypeChange(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* ── Toolbar ── */}
      <section className="panel-section">
        <h3 className="panel-title">Ferramentas</h3>
        <div className="toolbar">
          {tools.map((t) => (
            <button
              key={t.id}
              title={t.label}
              className={`tool-btn ${tool === t.id ? 'active' : ''}`}
              onClick={() => onToolChange(t.id)}
            >
              <span className="tool-icon">{t.icon}</span>
              <span className="tool-label">{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Alphabet ── */}
      <section className="panel-section">
        <h3 className="panel-title">Alfabeto (Σ)</h3>
        <input
          className="panel-input"
          placeholder="ex: a, b"
          value={alphabet}
          onChange={(e) => onAlphabetChange(e.target.value)}
        />
        <p className="panel-hint">Símbolos separados por vírgula</p>
      </section>

      {/* ── Transformations ── */}
      <section className="panel-section">
        <h3 className="panel-title">Transformações</h3>
        <div className="transform-btns">
          {automataType === 'NFA' && (
            <button
              className="transform-btn nfa-btn"
              onClick={onConvertNfaToDfa}
              disabled={states.length === 0}
              title="Construção de subconjuntos: converte o AFND em um AFD equivalente"
            >
              ⚙ AFND → AFD
            </button>
          )}
          {automataType === 'DFA' && (
            <button
              className="transform-btn min-btn"
              onClick={onMinimizeDfa}
              disabled={states.length === 0}
              title="Algoritmo de Hopcroft: minimiza o AFD removendo estados equivalentes"
            >
              ✦ Minimizar AFD
            </button>
          )}
        </div>
        <p className="panel-hint">
          {automataType === 'NFA'
            ? 'Converte o AFND atual em um AFD equivalente (subconjuntos).'
            : 'Remove estados redundantes do AFD (partições de Hopcroft).'}
        </p>
      </section>

      {/* ── State inspector ── */}
      {selectedState && (
        <section className="panel-section">
          <h3 className="panel-title">Estado Selecionado</h3>
          <div className="state-inspector">
            <label className="inspector-label">Nome</label>
            <input
              className="panel-input"
              value={selectedState.label}
              onChange={(e) => onRenameState(selectedState.id, e.target.value)}
            />
            <div className="toggle-row">
              <button
                className={`toggle-btn ${selectedState.isStart ? 'on' : ''}`}
                onClick={() => onToggleStart(selectedState.id)}
              >
                {selectedState.isStart ? '▶ Inicial' : '▶ Tornar Inicial'}
              </button>
              <button
                className={`toggle-btn ${selectedState.isAccept ? 'on accept' : ''}`}
                onClick={() => onToggleAccept(selectedState.id)}
              >
                {selectedState.isAccept ? '◎ Aceitação' : '◎ Tornar Aceitação'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── ER Validation ── */}
      <section className="panel-section">
        <h3 className="panel-title">Validar contra ER</h3>
        <div className="er-input-row">
          <input
            className="panel-input er-input"
            placeholder="ex: (a+c)*bb(a+c)*"
            value={erPattern}
            onChange={(e) => onErPatternChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onValidate(); }}
            spellCheck={false}
          />
          <button
            className="validate-btn"
            onClick={onValidate}
            disabled={!erPattern.trim()}
          >
            ▶ Validar
          </button>
        </div>
        <p className="panel-hint">Use notação formal: <code>(a+b)*</code>, <code>a*b+</code></p>

        {validationResult && (
          <div className={`validation-result ${validationResult.ok ? 'ok' : 'fail'}`}>
            {validationResult.erError ? (
              <div className="val-error">⚠ {validationResult.erError}</div>
            ) : validationResult.ok ? (
              <>
                <div className="val-ok">
                  ✅ AF correto! {validationResult.tested} strings testadas sem discrepâncias.
                </div>
                {validationResult.trapAnalysis && (() => {
                  const { status, missingDetails } = validationResult.trapAnalysis;
                  if (status === 'complete') return (
                    <div className="val-trap val-trap-ok">
                      🟢 DFA completo — todas as transições estão definidas.
                    </div>
                  );
                  if (status === 'no-trap') return (
                    <div className="val-trap val-trap-warn">
                      🟡 Faltam transições — adicione um <strong>trap state</strong> (estado morto) para tornar o DFA completo.
                    </div>
                  );
                  if (status === 'trap-correct') return (
                    <div className="val-trap val-trap-ok">
                      🟢 Trap state correto e completo!
                    </div>
                  );
                  if (status === 'trap-incorrect') return (
                    <div className="val-trap val-trap-warn">
                      <div>🟠 Trap state incompleto — faltam setas:</div>
                      <ul className="val-trap-list">
                        {missingDetails.map((d, i) => <li key={i}><code>{d}</code></li>)}
                      </ul>
                    </div>
                  );
                  return null;
                })()}
              </>
            ) : (
              <div className="val-fail">
                <div className="val-fail-header">
                  ❌ {validationResult.counterexamples.length} discrepância(s) encontrada(s):
                </div>
                <table className="val-table">
                  <thead>
                    <tr>
                      <th>String</th>
                      <th>ER</th>
                      <th>AF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResult.counterexamples.map(({ str, expectedByER, gotFromAF }, i) => (
                      <tr key={i}>
                        <td className="val-str"><code>{str === '' ? 'ε' : str}</code></td>
                        <td className={expectedByER ? 'val-accept' : 'val-reject'}>
                          {expectedByER ? '✓' : '✗'}
                        </td>
                        <td className={gotFromAF ? 'val-accept' : 'val-reject'}>
                          {gotFromAF ? '✓' : '✗'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Examples ── */}
      <section className="panel-section">
        <h3 className="panel-title">Exemplos Prontos</h3>
        <div className="examples-list">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              className="example-btn"
              title={ex.description}
              onClick={() => onLoadExample(ex)}
            >
              <span className="example-name">{ex.name}</span>
              <span className="example-desc">{ex.description}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Clear ── */}
      <section className="panel-section">
        <button className="clear-btn" onClick={onClearAll}>
          🗑 Limpar tudo
        </button>
      </section>
    </aside>
  );
}
