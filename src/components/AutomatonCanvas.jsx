import React, { useRef, useState, useCallback, useEffect } from 'react';

const STATE_RADIUS = 30;
const CANVAS_W = 800;
const CANVAS_H = 460;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 4;

// Compute a curved path between two states (or a loop for self-transitions)
function getTransitionPath(from, to, allTransitions) {
  if (from.id === to.id) {
    // Self-loop
    const cx = from.x;
    const cy = from.y - STATE_RADIUS - 36;
    return `M ${from.x - STATE_RADIUS * 0.7} ${from.y - STATE_RADIUS * 0.7}
            C ${cx - 40} ${cy - 20}, ${cx + 40} ${cy - 20}, ${from.x + STATE_RADIUS * 0.7} ${from.y - STATE_RADIUS * 0.7}`;
  }

  // Check if there's a reverse transition â€” offset the curve
  const hasReverse = allTransitions.some(
    (t) => t.from === to.id && t.to === from.id
  );

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;

  const startX = from.x + ux * STATE_RADIUS;
  const startY = from.y + uy * STATE_RADIUS;
  const endX = to.x - ux * STATE_RADIUS;
  const endY = to.y - uy * STATE_RADIUS;

  if (!hasReverse) {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  // Curve away from the straight line
  const perpX = -uy * 40;
  const perpY = ux * 40;
  const midX = (startX + endX) / 2 + perpX;
  const midY = (startY + endY) / 2 + perpY;
  return `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
}

function getLabelPos(from, to, allTransitions) {
  if (from.id === to.id) {
    return { x: from.x, y: from.y - STATE_RADIUS - 66 };
  }
  const hasReverse = allTransitions.some(
    (t) => t.from === to.id && t.to === from.id
  );
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const offset = hasReverse ? 50 : 18;
  return { x: mid.x - uy * offset, y: mid.y + ux * offset };
}

// Arrow marker IDs
const ARROW_ID = 'arrowhead';
const ARROW_ACTIVE_ID = 'arrowhead-active';
const ARROW_ACCEPT_ID = 'arrowhead-accept';

export default function AutomatonCanvas({
  states,
  transitions,
  activeStateIds,      // set of highlighted state IDs during simulation
  activeTransitionId,  // ID of the specific transition being taken this step
  activeSymbol,        // the symbol currently being consumed (to highlight in labels)
  accepted,            // null | true | false
  tool,                // 'select' | 'addState' | 'addTransition' | 'delete'
  selectedStateId,
  transitionSrc,
  onAddState,
  onMoveState,
  onSelectState,
  onTransitionSrc,
  onTransitionDst,
  onDeleteState,
  onDeleteTransition,
}) {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null); // { stateId, offsetX, offsetY }

  // â”€â”€ Zoom / Pan state â”€â”€
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(null); // { startSVGX, startSVGY, startPanX, startPanY }

  // Dynamic viewBox based on zoom and pan
  const vbW = CANVAS_W / zoom;
  const vbH = CANVAS_H / zoom;
  const vbX = pan.x;
  const vbY = pan.y;

  // Convert screen coords â†’ SVG content coords (accounting for zoom/pan)
  const getSVGPos = useCallback((e) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scaleX = vbW / rect.width;
    const scaleY = vbH / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX + vbX,
      y: (e.clientY - rect.top)  * scaleY + vbY,
    };
  }, [vbW, vbH, vbX, vbY]);

  // â”€â”€ Wheel â†’ zoom centred on cursor â”€â”€
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();

    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));

    // Keep the point under the cursor fixed in SVG space
    const mouseX = (e.clientX - rect.left) / rect.width;
    const mouseY = (e.clientY - rect.top)  / rect.height;
    const newVbW = CANVAS_W / newZoom;
    const newVbH = CANVAS_H / newZoom;

    setPan({
      x: vbX + mouseX * (vbW - newVbW),
      y: vbY + mouseY * (vbH - newVbH),
    });
    setZoom(newZoom);
  }, [zoom, vbX, vbY, vbW, vbH]);

  // Attach wheel with { passive: false } so we can preventDefault
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // â”€â”€ SVG background click / mousedown â”€â”€
  const handleSVGClick = useCallback(
    (e) => {
      if (tool !== 'addState') return;
      const pos = getSVGPos(e);
      onAddState(pos.x, pos.y);
    },
    [tool, getSVGPos, onAddState]
  );

  // Pan: middle-mouse or background drag in select/addTransition mode
  const handleBgMouseDown = useCallback((e) => {
    const isMiddle = e.button === 1;
    const isBgDrag = e.button === 0 && (tool === 'select' || tool === 'addTransition' || tool === 'delete');
    if (!isMiddle && !isBgDrag) return;
    e.preventDefault();
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    setPanning({
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: vbX,
      startPanY: vbY,
      rectW: rect.width,
      rectH: rect.height,
    });
  }, [tool, vbX, vbY]);

  useEffect(() => {
    if (!panning) return;
    const onMove = (e) => {
      const dx = (e.clientX - panning.startClientX) / panning.rectW * vbW;
      const dy = (e.clientY - panning.startClientY) / panning.rectH * vbH;
      setPan({ x: panning.startPanX - dx, y: panning.startPanY - dy });
    };
    const onUp = () => setPanning(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [panning, vbW, vbH]);

  // â”€â”€ State drag â”€â”€
  const handleStateMouseDown = useCallback(
    (e, stateId) => {
      e.stopPropagation();
      if (tool === 'delete') {
        onDeleteState(stateId);
        return;
      }
      if (tool === 'addTransition') {
        if (!transitionSrc) {
          onTransitionSrc(stateId);
        } else {
          onTransitionDst(stateId);
        }
        return;
      }
      if (tool === 'select') {
        onSelectState(stateId);
        const state = states.find((s) => s.id === stateId);
        const pos = getSVGPos(e);
        setDragging({ stateId, offsetX: pos.x - state.x, offsetY: pos.y - state.y });
      }
    },
    [tool, transitionSrc, onTransitionSrc, onTransitionDst, onDeleteState, onSelectState, states, getSVGPos]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const pos = getSVGPos(e);
      const nx = pos.x - dragging.offsetX;
      const ny = pos.y - dragging.offsetY;
      onMoveState(dragging.stateId, nx, ny);
    };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, getSVGPos, onMoveState]);

  // â”€â”€ Zoom controls â”€â”€
  const zoomIn  = () => setZoom((z) => Math.min(MAX_ZOOM, +(z * 1.25).toFixed(3)));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, +(z / 1.25).toFixed(3)));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Group transitions by fromâ†’to pair so we can render combined labels
  const transitionGroups = {};
  transitions.forEach((t) => {
    const key = `${t.from}-${t.to}`;
    if (!transitionGroups[key]) transitionGroups[key] = { from: t.from, to: t.to, symbols: [], rawSymbols: [], ids: [] };
    const display = t.symbol === '' ? 'Îµ' : t.symbol;
    transitionGroups[key].symbols.push(display);
    transitionGroups[key].rawSymbols.push(t.symbol);
    transitionGroups[key].ids.push(t.id);
  });

  const stateMap = Object.fromEntries(states.map((s) => [s.id, s]));

  const isPanning = !!panning;
  const canvasCursor = isPanning
    ? 'grabbing'
    : tool === 'addState'
    ? 'crosshair'
    : tool === 'select'
    ? 'grab'
    : 'default';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        className="automaton-canvas"
        onClick={handleSVGClick}
        onMouseDown={handleBgMouseDown}
        style={{ cursor: canvasCursor, display: 'block', width: '100%', height: '100%' }}
      >
        <defs>
          <marker id={ARROW_ID} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#8b949e" />
          </marker>
          <marker id={ARROW_ACTIVE_ID} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#39d0c8" />
          </marker>
          <marker id={ARROW_ACCEPT_ID} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#3fb950" />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background grid â€” always covers full visible area */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e2530" strokeWidth="1" />
        </pattern>
        <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#grid)" />

        {/* Transitions */}
        {Object.values(transitionGroups).map((grp) => {
          const fromState = stateMap[grp.from];
          const toState = stateMap[grp.to];
          if (!fromState || !toState) return null;

          const isActive = activeTransitionId
            ? grp.ids.includes(activeTransitionId)
            : activeStateIds &&
              (activeStateIds.has(grp.from) || activeStateIds.has(grp.to));
          const pathD = getTransitionPath(fromState, toState, transitions);
          const labelPos = getLabelPos(fromState, toState, transitions);
          const color = isActive ? '#39d0c8' : '#8b949e';
          const markerId = isActive ? ARROW_ACTIVE_ID : ARROW_ID;

          return (
            <g key={`${grp.from}-${grp.to}`}
              onClick={(e) => {
                e.stopPropagation();
                if (tool === 'delete') {
                  transitions
                    .filter((t) => t.from === grp.from && t.to === grp.to)
                    .forEach((t) => onDeleteTransition(t.id));
                }
              }}
              style={{ cursor: tool === 'delete' ? 'pointer' : 'default' }}
            >
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={isActive ? 2.5 : 1.5}
                markerEnd={`url(#${markerId})`}
                style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="13"
                fontFamily="JetBrains Mono, monospace"
                style={{ userSelect: 'none' }}
              >
                {grp.symbols.map((sym, si) => {
                  const raw = grp.rawSymbols[si];
                  const isActiveSym = isActive && activeSymbol !== undefined && activeSymbol !== null
                    ? (raw === activeSymbol || (raw === '' && activeSymbol === 'Îµ'))
                    : isActive;
                  return (
                    <tspan
                      key={si}
                      fill={isActiveSym ? '#39d0c8' : isActive ? 'rgba(57,208,200,0.3)' : '#8b949e'}
                      fontWeight={isActiveSym ? '700' : '400'}
                      style={{ transition: 'fill 0.15s, font-weight 0.15s' }}
                    >
                      {si > 0 ? ', ' : ''}{sym}
                    </tspan>
                  );
                })}
              </text>
            </g>
          );
        })}

        {/* States */}
        {states.map((state) => {
          const isActiveState = activeStateIds && activeStateIds.has(state.id);
          const isSelected = selectedStateId === state.id;
          const isTransitionSrc = transitionSrc === state.id;

          let fillColor = '#21262d';
          let strokeColor = '#30363d';
          let strokeWidth = 2;
          if (state.isStart && state.isAccept) {
            fillColor = '#1e2d40';
          } else if (state.isStart) {
            fillColor = '#1a2a3a';
          } else if (state.isAccept) {
            fillColor = '#1a2e20';
          }
          if (isActiveState) {
            fillColor = accepted === false ? '#3a2020' : '#1a3040';
            strokeColor = accepted === false ? '#f85149' : '#39d0c8';
            strokeWidth = 3;
          }
          if (isSelected || isTransitionSrc) {
            strokeColor = '#b370fb';
            strokeWidth = 2.5;
          }

          return (
            <g
              key={state.id}
              transform={`translate(${state.x}, ${state.y})`}
              onMouseDown={(e) => handleStateMouseDown(e, state.id)}
              style={{ cursor: tool === 'delete' ? 'pointer' : tool === 'addTransition' ? 'crosshair' : 'grab' }}
            >
              {state.isStart && (
                <g>
                  <line
                    x1={-STATE_RADIUS - 36} y1={0}
                    x2={-STATE_RADIUS - 2}  y2={0}
                    stroke="#58a6ff" strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                  <text x={-STATE_RADIUS - 46} y={0} fontSize="11" fill="#58a6ff" textAnchor="middle" dominantBaseline="middle">â–¶</text>
                </g>
              )}

              {state.isAccept && (
                <circle
                  r={STATE_RADIUS + 7}
                  fill="none"
                  stroke={isActiveState ? (accepted === false ? '#f85149' : '#3fb950') : '#3fb950'}
                  strokeWidth={isActiveState ? 2.5 : 1.5}
                  opacity={0.7}
                  style={{ transition: 'stroke 0.2s' }}
                />
              )}

              <circle
                r={STATE_RADIUS}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                filter={isActiveState ? 'url(#glow)' : 'none'}
                style={{ transition: 'fill 0.2s, stroke 0.2s, stroke-width 0.2s' }}
              />

              <text
                fontSize="13"
                fontFamily="Inter, sans-serif"
                fontWeight="600"
                fill={isActiveState ? (accepted === false ? '#f85149' : '#39d0c8') : '#e6edf3'}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ userSelect: 'none', transition: 'fill 0.2s' }}
              >
                {state.label}
              </text>
            </g>
          );
        })}

        {/* Empty state hint */}
        {states.length === 0 && (
          <text
            x={vbX + vbW / 2} y={vbY + vbH / 2}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="15" fill="#484f58"
          >
            Selecione "Adicionar Estado" e clique aqui para criar estados
          </text>
        )}
      </svg>

      {/* â”€â”€ Zoom controls overlay â”€â”€ */}
      <div className="canvas-zoom-controls">
        <button className="zoom-btn" onClick={zoomIn} title="Zoom in">ï¼‹</button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="zoom-btn" onClick={zoomOut} title="Zoom out">ï¼</button>
        <button className="zoom-btn zoom-reset" onClick={resetView} title="Resetar view">âŒ–</button>
      </div>
    </div>
  );
}
