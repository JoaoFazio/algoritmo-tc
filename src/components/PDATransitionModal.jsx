import React, { useState } from 'react';
import { EPSILON, BOTTOM } from '../utils/pushdown';
import './PDATransitionModal.css';

export default function PDATransitionModal({ from, to, onConfirm, onCancel }) {
  const [symbol, setSymbol] = useState(EPSILON);
  const [pop,    setPop]    = useState(EPSILON);
  const [push,   setPush]   = useState(EPSILON);

  const quickSymbols = [EPSILON, 'a', 'b', '0', '1'];
  const quickStack   = [EPSILON, BOTTOM, 'A', 'B', 'X', 'Y', 'Z'];

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box pda-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Nova Transição (AP)</h2>
        <p className="modal-desc">
          <span className="modal-state">{from?.label}</span> → <span className="modal-state">{to?.label}</span>
        </p>

        <div className="pda-fields">
          {/* Input symbol */}
          <div className="pda-field">
            <label className="pda-field-label">Símbolo lido (input)</label>
            <div className="quick-btns">
              {quickSymbols.map((s) => (
                <button key={s} className={`quick-btn ${symbol === s ? 'sel' : ''}`}
                  onClick={() => setSymbol(s)}>{s === EPSILON ? 'ε' : s}</button>
              ))}
              <input className="quick-custom mono" maxLength={3} placeholder="outro"
                value={quickSymbols.includes(symbol) ? '' : symbol}
                onChange={(e) => setSymbol(e.target.value)} />
            </div>
          </div>

          {/* Pop */}
          <div className="pda-field">
            <label className="pda-field-label">Desempilhar (pop)</label>
            <div className="quick-btns">
              {quickStack.map((s) => (
                <button key={s} className={`quick-btn ${pop === s ? 'sel' : ''}`}
                  onClick={() => setPop(s)}>{s}</button>
              ))}
              <input className="quick-custom mono" maxLength={3} placeholder="outro"
                value={quickStack.includes(pop) ? '' : pop}
                onChange={(e) => setPop(e.target.value)} />
            </div>
          </div>

          {/* Push */}
          <div className="pda-field">
            <label className="pda-field-label">Empilhar (push)  <span style={{color:'var(--text-muted)',fontSize:'11px'}}>— "AB" empilha A sobre B</span></label>
            <div className="quick-btns">
              {quickStack.map((s) => (
                <button key={s} className={`quick-btn ${push === s ? 'sel' : ''}`}
                  onClick={() => setPush(s)}>{s}</button>
              ))}
              <input className="quick-custom mono" maxLength={4} placeholder="outro"
                value={quickStack.includes(push) ? '' : push}
                onChange={(e) => setPush(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="pda-preview mono">
          δ({from?.label}, {symbol === EPSILON ? 'ε' : symbol}, {pop === EPSILON ? 'ε' : pop}) = ({to?.label}, {push === EPSILON ? 'ε' : push})
        </div>

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onCancel}>Cancelar</button>
          <button className="modal-confirm" onClick={() => onConfirm(symbol, pop, push)}>
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
