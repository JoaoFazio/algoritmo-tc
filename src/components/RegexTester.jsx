import React, { useState } from 'react';
import './RegexTester.css';

export default function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [testStr, setTestStr] = useState('');

  // Compute segments and error as plain local variables — never call setState during render
  let segments = null;
  let error = null;

  if (pattern && testStr) {
    try {
      // Ensure the 'g' flag is always present for matchAll
      const safeFlags = flags.includes('g') ? flags : flags + 'g';
      const segs = [];
      let last = 0;
      for (const match of testStr.matchAll(new RegExp(pattern, safeFlags))) {
        if (match.index > last) segs.push({ text: testStr.slice(last, match.index), match: false });
        segs.push({ text: match[0], match: true });
        last = match.index + match[0].length;
      }
      if (last < testStr.length) segs.push({ text: testStr.slice(last), match: false });
      segments = segs;
    } catch (e) {
      error = e.message;
    }
  }

  const matchCount = segments ? segments.filter((s) => s.match).length : 0;
  const hasMatch = matchCount > 0;

  const cheatsheet = [
    { sym: '.', desc: 'Qualquer caractere' },
    { sym: '*', desc: '0 ou mais' },
    { sym: '+', desc: '1 ou mais' },
    { sym: '?', desc: '0 ou 1' },
    { sym: '^', desc: 'Início da string' },
    { sym: '$', desc: 'Fim da string' },
    { sym: '[abc]', desc: 'Classe de caracteres' },
    { sym: '[^abc]', desc: 'Negação de classe' },
    { sym: 'a|b', desc: 'a ou b' },
    { sym: '(ab)', desc: 'Grupo de captura' },
    { sym: '\\d', desc: 'Dígito [0-9]' },
    { sym: '\\w', desc: 'Palavra [a-zA-Z0-9_]' },
    { sym: '\\s', desc: 'Espaço em branco' },
    { sym: '{n,m}', desc: 'n a m repetições' },
  ];

  return (
    <div className="regex-tester">
      <div className="regex-layout">
        {/* ── Left: tester ── */}
        <div className="regex-main">
          <div className="regex-input-group">
            <div className="regex-input-row">
              <span className="regex-slash">/</span>
              <input
                className="regex-input mono"
                placeholder="padrão regex..."
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                spellCheck={false}
              />
              <span className="regex-slash">/</span>
              <input
                className="regex-flags mono"
                value={flags}
                onChange={(e) => setFlags(e.target.value)}
                maxLength={5}
              />
            </div>
            {error && <div className="regex-error">{error}</div>}
          </div>

          <div className="regex-test-area">
            <label className="regex-label">String de teste</label>
            <textarea
              className="regex-textarea mono"
              rows={5}
              placeholder="Digite o texto para testar..."
              value={testStr}
              onChange={(e) => setTestStr(e.target.value)}
            />
          </div>

          {/* Result preview */}
          {segments && testStr && (
            <div className="regex-result-area">
              <div className="regex-result-header">
                <span className={`match-badge ${hasMatch ? 'has-match' : 'no-match'}`}>
                  {hasMatch ? `${matchCount} match${matchCount > 1 ? 'es' : ''}` : 'Sem match'}
                </span>
              </div>
              <div className="regex-preview mono">
                {segments.map((seg, i) =>
                  seg.match
                    ? <mark key={i} className="regex-match">{seg.text}</mark>
                    : <span key={i}>{seg.text}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: cheat sheet ── */}
        <div className="regex-cheatsheet">
          <h3 className="cheat-title">Referência Rápida</h3>
          <table className="cheat-table">
            <tbody>
              {cheatsheet.map((row) => (
                <tr key={row.sym}>
                  <td className="cheat-sym mono">{row.sym}</td>
                  <td className="cheat-desc">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="cheat-title" style={{ marginTop: '16px' }}>Exemplos</h3>
          {[
            { pat: 'a+b+', desc: 'Um ou mais a seguido de um ou mais b' },
            { pat: '^[0-9]+$', desc: 'Somente dígitos' },
            { pat: '(ab)*', desc: 'Repetições de "ab"' },
            { pat: '[aeiou]', desc: 'Qualquer vogal' },
          ].map((ex) => (
            <button
              key={ex.pat}
              className="cheat-example-btn"
              onClick={() => setPattern(ex.pat)}
            >
              <span className="mono" style={{ color: 'var(--accent-orange)' }}>{ex.pat}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{ex.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
