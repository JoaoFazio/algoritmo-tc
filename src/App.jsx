import React, { useState } from 'react';
import AutomatonBuilder from './components/AutomatonBuilder';
import GrammarBuilder   from './components/GrammarBuilder';
import PushdownBuilder  from './components/PushdownBuilder';
import TuringMachine    from './components/TuringMachine';
import RegexTester      from './components/RegexTester';
import './App.css';

const TABS = [
  { id: 'automaton', icon: '⬡', label: 'DFA / NFA',        desc: 'Autômatos Finitos' },
  { id: 'grammar',   icon: '𝐺', label: 'Gramáticas',        desc: 'GR e GLC' },
  { id: 'pushdown',  icon: '▦', label: 'Pilha (AP)',         desc: 'Pushdown Automaton' },
  { id: 'turing',    icon: '⊞', label: 'Turing (MT)',        desc: 'Máquina de Turing' },
  { id: 'regex',     icon: '✲', label: 'Regex',             desc: 'Expressões Regulares' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('automaton');
  const active = TABS.find((t) => t.id === activeTab);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">∑</span>
          <div>
            <h1 className="brand-title">AutomataLab</h1>
            <p className="brand-sub">Teoria da Computação — Estudo Visual</p>
          </div>
        </div>

        <nav className="tab-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.desc}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="header-hint">
          <span className="hint-badge">Beta</span>
          <span className="hint-text">{active?.desc}</span>
        </div>
      </header>

      <main className="app-content">
        {activeTab === 'automaton' && <AutomatonBuilder />}
        {activeTab === 'grammar'   && <GrammarBuilder />}
        {activeTab === 'pushdown'  && <PushdownBuilder />}
        {activeTab === 'turing'    && <TuringMachine />}
        {activeTab === 'regex'     && <RegexTester />}
      </main>
    </div>
  );
}
