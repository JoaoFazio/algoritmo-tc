import React, { useState, useCallback } from 'react';
import AutomatonCanvas from './AutomatonCanvas';
import ControlPanel from './ControlPanel';
import Simulator from './Simulator';
import TransitionModal from './TransitionModal';
import { uniqueId, validateAutomaton, nfaToDfa, minimizeDfa } from '../utils/automaton';
import { validateAFvsER } from '../utils/erValidator';
import './AutomatonBuilder.css';

export default function AutomatonBuilder() {
  const [states, setStates]           = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [tool, setTool]               = useState('select');
  const [selectedStateId, setSelectedStateId] = useState(null);
  const [transitionSrc, setTransitionSrc]     = useState(null);
  const [automataType, setAutomataType]       = useState('DFA');
  const [alphabet, setAlphabet]               = useState('a, b');
  const [activeStateIds, setActiveStateIds]   = useState(null);
  const [activeTransitionId, setActiveTransitionId] = useState(null);
  const [activeSymbol, setActiveSymbol]       = useState(null);
  const [accepted, setAccepted]               = useState(null);
  // ER Validation
  const [erPattern, setErPattern]             = useState('');
  const [validationResult, setValidationResult] = useState(null);
  // Transition modal
  const [pendingTransition, setPendingTransition] = useState(null); // { from, to }

  // ── State operations ──
  const handleAddState = useCallback((x, y) => {
    const id = uniqueId();
    const label = `q${states.length}`;
    const isStart = states.length === 0;
    setStates((prev) => [...prev, { id, label, isStart, isAccept: false, x, y }]);
  }, [states]);

  const handleMoveState = useCallback((id, x, y) => {
    setStates((prev) => prev.map((s) => s.id === id ? { ...s, x, y } : s));
  }, []);

  const handleDeleteState = useCallback((id) => {
    setStates((prev) => prev.filter((s) => s.id !== id));
    setTransitions((prev) => prev.filter((t) => t.from !== id && t.to !== id));
    if (selectedStateId === id) setSelectedStateId(null);
  }, [selectedStateId]);

  const handleRenameState = useCallback((id, label) => {
    setStates((prev) => prev.map((s) => s.id === id ? { ...s, label } : s));
  }, []);

  const handleToggleAccept = useCallback((id) => {
    setStates((prev) => prev.map((s) => s.id === id ? { ...s, isAccept: !s.isAccept } : s));
  }, []);

  const handleToggleStart = useCallback((id) => {
    setStates((prev) =>
      prev.map((s) => ({ ...s, isStart: s.id === id }))
    );
  }, []);

  // ── Transition operations ──
  const handleTransitionSrc = useCallback((stateId) => {
    setTransitionSrc(stateId);
  }, []);

  const handleTransitionDst = useCallback((stateId) => {
    if (!transitionSrc) return;
    setPendingTransition({ from: transitionSrc, to: stateId });
    setTransitionSrc(null);
  }, [transitionSrc]);

  const handleAddTransition = useCallback((symbol) => {
    if (!pendingTransition) return;
    const { from, to } = pendingTransition;
    // In DFA mode, warn if duplicate (same from + symbol)
    const id = uniqueId();
    setTransitions((prev) => [...prev, { id, from, to, symbol }]);
    setPendingTransition(null);
  }, [pendingTransition]);

  const handleDeleteTransition = useCallback((id) => {
    setTransitions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Clear / Load example ──
  const handleClearAll = useCallback(() => {
    setStates([]); setTransitions([]);
    setSelectedStateId(null); setTransitionSrc(null);
    setActiveStateIds(null); setActiveTransitionId(null); setActiveSymbol(null); setAccepted(null);
    setValidationResult(null);
  }, []);

  const handleValidate = useCallback(() => {
    if (!erPattern.trim()) return;
    const result = validateAFvsER(states, transitions, automataType, erPattern, alphabet);
    setValidationResult(result);
  }, [states, transitions, automataType, erPattern, alphabet]);

  const handleLoadExample = useCallback((example) => {
    setStates(example.states.map((s) => ({ ...s })));
    setTransitions(example.transitions.map((t) => ({ ...t })));
    if (example.alphabet) setAlphabet(example.alphabet);
    if (example.type) setAutomataType(example.type);
    setSelectedStateId(null); setTransitionSrc(null);
    setActiveStateIds(null); setActiveTransitionId(null); setActiveSymbol(null); setAccepted(null);
    setValidationResult(null);
  }, []);

  // ── Transformations ──
  const handleConvertNfaToDfa = useCallback(() => {
    const result = nfaToDfa(states, transitions, alphabet);
    setStates(result.states);
    setTransitions(result.transitions);
    setAutomataType('DFA');
    setSelectedStateId(null); setTransitionSrc(null);
    setActiveStateIds(null); setActiveTransitionId(null); setActiveSymbol(null); setAccepted(null);
    setValidationResult(null);
  }, [states, transitions, alphabet]);

  const handleMinimizeDfa = useCallback(() => {
    const result = minimizeDfa(states, transitions, alphabet);
    setStates(result.states);
    setTransitions(result.transitions);
    setSelectedStateId(null); setTransitionSrc(null);
    setActiveStateIds(null); setActiveTransitionId(null); setActiveSymbol(null); setAccepted(null);
    setValidationResult(null);
  }, [states, transitions, alphabet]);

  const warnings = validateAutomaton(states, transitions);

  return (
    <div className="builder-layout">
      {/* Canvas + Simulator area */}
      <div className="builder-center">
        {warnings.length > 0 && (
          <div className="warnings-bar">
            {warnings.map((w, i) => (
              <span key={i} className="warning-item">⚠ {w}</span>
            ))}
          </div>
        )}

        <div className="canvas-wrapper">
          <AutomatonCanvas
            states={states} transitions={transitions}
            activeStateIds={activeStateIds} activeTransitionId={activeTransitionId}
            activeSymbol={activeSymbol}
            accepted={accepted} tool={tool}
            selectedStateId={selectedStateId} transitionSrc={transitionSrc}
            onAddState={handleAddState} onMoveState={handleMoveState}
            onSelectState={setSelectedStateId}
            onTransitionSrc={handleTransitionSrc} onTransitionDst={handleTransitionDst}
            onDeleteState={handleDeleteState} onDeleteTransition={handleDeleteTransition}
          />
        </div>

        <Simulator
          states={states} transitions={transitions}
          automataType={automataType}
          onActiveStates={setActiveStateIds}
          onActiveTransition={setActiveTransitionId}
          onActiveSymbol={setActiveSymbol}
          onAccepted={setAccepted}
        />
      </div>

      <ControlPanel
        tool={tool}
        onToolChange={(t) => { setTool(t); setTransitionSrc(null); }}
        states={states}
        transitions={transitions}
        selectedStateId={selectedStateId}
        onRenameState={handleRenameState}
        onToggleAccept={handleToggleAccept}
        onToggleStart={handleToggleStart}
        onClearAll={handleClearAll}
        onLoadExample={handleLoadExample}
        automataType={automataType}
        onAutomataTypeChange={setAutomataType}
        alphabet={alphabet}
        onAlphabetChange={setAlphabet}
        erPattern={erPattern}
        onErPatternChange={(v) => { setErPattern(v); setValidationResult(null); }}
        onValidate={handleValidate}
        validationResult={validationResult}
        onConvertNfaToDfa={handleConvertNfaToDfa}
        onMinimizeDfa={handleMinimizeDfa}
      />

      {pendingTransition && (
        <TransitionModal
          from={states.find((s) => s.id === pendingTransition.from)}
          to={states.find((s) => s.id === pendingTransition.to)}
          alphabet={alphabet}
          automataType={automataType}
          onConfirm={handleAddTransition}
          onCancel={() => setPendingTransition(null)}
        />
      )}
    </div>
  );
}
