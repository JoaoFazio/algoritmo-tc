import React, { useState } from 'react';
import './TransitionModal.css';

export default function TransitionModal({ from, to, alphabet, automataType, onConfirm, onCancel }) {
  const [symbol, setSymbol] = useState('');

  const symbols = alphabet
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // For NFA also offer epsilon
  const allOptions = automataType === 'NFA' ? ['ε (epsilon)', ...symbols] : symbols;

  const handleConfirm = () => {
    const sym = symbol === 'ε (epsilon)' ? '' : symbol;
    if (sym === '' && automataType !== 'NFA') return;
    onConfirm(sym);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Nova Transição</h2>
        <p className="modal-desc">
          <span className="modal-state">{from?.label}</span>
          {' → '}
          <span className="modal-state">{to?.label}</span>
        </p>

        <div className="modal-field">
          <label className="modal-label">Símbolo</label>
          <div className="symbol-options">
            {allOptions.map((opt) => (
              <button
                key={opt}
                className={`symbol-opt ${symbol === opt ? 'selected' : ''}`}
                onClick={() => setSymbol(opt)}
              >
                {opt}
              </button>
            ))}
            <input
              className="symbol-custom"
              placeholder="Outro..."
              value={allOptions.includes(symbol) ? '' : symbol}
              onChange={(e) => setSymbol(e.target.value)}
              maxLength={4}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onCancel}>Cancelar</button>
          <button
            className="modal-confirm"
            onClick={handleConfirm}
            disabled={!symbol}
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
