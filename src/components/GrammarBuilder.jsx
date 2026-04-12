import React, { useState, useCallback } from 'react';
import { parseGrammar, deriveString, detectGrammarType, formatForm, GRAMMAR_EXAMPLES, EPSILON } from '../utils/grammar';
import './GrammarBuilder.css';

const DEFAULT_GRAMMAR = `S -> a S b | eps`;

export default function GrammarBuilder() {
  const [grammarText, setGrammarText] = useState(DEFAULT_GRAMMAR);
  const [testString, setTestString]   = useState('aabb');
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);

  const grammar = parseGrammar(grammarText);
  const grammarType = grammar.startSymbol ? detectGrammarType(grammar) : null;

  const nts = Object.keys(grammar.rules || {});
  const isNT = (sym) => nts.includes(sym);

  const handleDerive = useCallback(() => {
    setResult(null);
    setError(null);
    const parsed = parseGrammar(grammarText);
    if (!parsed.startSymbol) { setError('Gramática inválida.'); return; }
    const res = deriveString(parsed, testString);
    if (res.error)  { setError(res.error); return; }
    setResult(res);
  }, [grammarText, testString]);

  const handleLoadExample = (ex) => {
    setGrammarText(ex.text);
    setTestString(ex.testStrings[0] ?? '');
    setResult(null);
    setError(null);
  };

  return (
    <div className="grammar-layout">
      {/* ── Left: editor + results ── */}
      <div className="grammar-main">
        <div className="grammar-editor-area">
          <div className="editor-header">
            <span className="editor-title">Regras de Produção</span>
            {grammarType && (
              <span className={`type-badge ${grammarType.includes('Regular') ? 'regular' : 'cfg'}`}>
                {grammarType}
              </span>
            )}
          </div>
          <textarea
            className="grammar-textarea mono"
            rows={8}
            value={grammarText}
            onChange={(e) => { setGrammarText(e.target.value); setResult(null); }}
            placeholder={"S -> a S b | eps\nA -> aA | a"}
            spellCheck={false}
          />
          <div className="editor-hint">
            Use <code>|</code> para alternativas. <code>eps</code> ou <code>ε</code> = string vazia.
            O primeiro não-terminal é o símbolo inicial.
          </div>
        </div>

        {/* Production rules parsed display */}
        {grammar.startSymbol && (
          <div className="rules-display">
            <div className="rules-title">Gramática Parseada</div>
            {Object.entries(grammar.rules).map(([nt, prods]) => (
              <div key={nt} className="rule-row">
                <span className="rule-nt">{nt}</span>
                <span className="rule-arrow"> → </span>
                <span className="rule-prods">
                  {prods.map((p, pi) => (
                    <span key={pi}>
                      {pi > 0 && <span className="rule-pipe"> | </span>}
                      {p.map((sym, si) => (
                        <span key={si} className={`rule-sym ${isNT(sym) ? 'nt' : sym === EPSILON ? 'eps' : 'term'}`}>
                          {sym}
                        </span>
                      ))}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Test input */}
        <div className="derive-area">
          <div className="derive-input-row">
            <span className="derive-label">Derivar:</span>
            <input
              className="derive-input mono"
              value={testString}
              onChange={(e) => { setTestString(e.target.value); setResult(null); }}
              placeholder="string (vazio = ε)"
              onKeyDown={(e) => { if (e.key === 'Enter') handleDerive(); }}
            />
            <button className="derive-btn" onClick={handleDerive}>▶ Derivar</button>
          </div>

          {error && <div className="derive-error">{error}</div>}

          {result && (
            <div className={`derive-result ${result.found ? 'found' : 'notfound'}`}>
              <div className="derive-result-header">
                {result.found
                  ? `✓ "${testString || 'ε'}" pertence à linguagem`
                  : `✗ "${testString || 'ε'}" não pertence à linguagem`}
              </div>

              {result.found && result.steps && (
                <div className="derivation-steps">
                  <div className="steps-title">Derivação (mais à esquerda):</div>
                  {result.steps.map((form, i) => (
                    <div key={i} className="step-row">
                      <span className="step-index">{i === 0 ? '⇒' : '⇒'}</span>
                      <span className="step-form mono">
                        {form.map((sym, si) => (
                          <span
                            key={si}
                            className={`step-sym ${isNT(sym) ? 'nt' : sym === EPSILON ? 'eps' : 'term'}`}
                          >
                            {sym}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: examples + reference ── */}
      <div className="grammar-sidebar">
        <div className="sidebar-section">
          <h3 className="sidebar-title">Exemplos</h3>
          {GRAMMAR_EXAMPLES.map((ex, i) => (
            <button key={i} className="grammar-example-btn" onClick={() => handleLoadExample(ex)}>
              <span className="ex-name">{ex.name}</span>
              <span className="ex-desc">{ex.description}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-title">Referência — Notação</h3>
          <table className="ref-table">
            <tbody>
              {[
                ['S -> a S b', 'Regra de produção'],
                ['|',          'Alternativa (ou)'],
                ['eps / ε',    'String vazia'],
                ['MAIÚSCULO',  'Não-terminal (NT)'],
                ['minúsculo',  'Terminal'],
              ].map(([sym, desc]) => (
                <tr key={sym}>
                  <td className="ref-sym mono">{sym}</td>
                  <td className="ref-desc">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-title">Hierarquia de Chomsky</h3>
          {[
            { tipo: 'Tipo 3', nome: 'Gramática Regular', cor: '#39d0c8' },
            { tipo: 'Tipo 2', nome: 'GLC (livre contexto)', cor: '#58a6ff' },
            { tipo: 'Tipo 1', nome: 'Sensível ao contexto', cor: '#b370fb' },
            { tipo: 'Tipo 0', nome: 'Irrestrita (MT)', cor: '#f0883e' },
          ].map((h) => (
            <div key={h.tipo} className="hierarchy-item">
              <span className="h-tipo" style={{ color: h.cor }}>{h.tipo}</span>
              <span className="h-nome">{h.nome}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
