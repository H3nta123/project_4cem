import { useState, useEffect, useCallback } from 'react';
import { useApp, formatMoney } from '../../store/AppContext';
import * as api from '../../api/api';
import type { ScenarioResponse, BudgetTableResponse } from '../../api/api';
import './WhatIfPage.css';

export default function WhatIfPage() {
  const { state } = useApp();
  const sym = state.settings.currencySymbol;

  const [scenarios, setScenarios] = useState<ScenarioResponse[]>(state.scenarios);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetTableResponse | null>(state.budgetTable);
  const [customName, setCustomName] = useState('');
  const [customInc, setCustomInc] = useState('0');
  const [customExp, setCustomExp] = useState('0');

  useEffect(() => {
    setScenarios(state.scenarios);
  }, [state.scenarios]);

  useEffect(() => {
    setBudgetData(state.budgetTable);
  }, [state.budgetTable]);

  const handleSelect = useCallback(async (scenarioId: number | null) => {
    setActiveId(scenarioId);
    try {
      const data = scenarioId
        ? await api.getBudgetWithScenario(scenarioId)
        : await api.getBudgetTable();
      setBudgetData(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleCreateCustom = async () => {
    if (!customName.trim()) return;
    try {
      const s = await api.createScenario({
        name: customName.trim(),
        income_modifier: 1 + (parseFloat(customInc) || 0) / 100,
        expense_modifier: 1 + (parseFloat(customExp) || 0) / 100,
        description: `Доход ${customInc}%, Расходы ${customExp}%`,
      });
      const updated = await api.getScenarios();
      setScenarios(updated);
      handleSelect(s.id);
      setCustomName('');
      setCustomInc('0');
      setCustomExp('0');
    } catch (e) {
      console.error(e);
    }
  };

  // If scenario is active, show scenario data; otherwise base
  const projIncome = budgetData?.monthly_income[0] ?? 0;
  const projExpense = budgetData?.monthly_expense[0] ?? 0;
  const projBalance = projIncome - projExpense;

  const activeScenario = scenarios.find(s => s.id === activeId);
  const incPct = activeScenario ? Math.round((activeScenario.income_modifier - 1) * 100) : 0;
  const expPct = activeScenario ? Math.round((activeScenario.expense_modifier - 1) * 100) : 0;

  return (
    <div className="whatif-page">
      <div className="whatif-main">
        <div className="page-header">
          <div>
            <h1 className="page-title">Что если?</h1>
            <p className="page-subtitle">Моделирование финансовых сценариев</p>
          </div>
        </div>

        <div className="whatif-results">
          <div className="whatif-card">
            <span className="whatif-card-label">ДОХОД / НЕД</span>
            <span className="whatif-card-value income">{formatMoney(projIncome, sym)}</span>
            {activeId && <span className="whatif-card-diff">{incPct >= 0 ? '+' : ''}{incPct}% к базе</span>}
          </div>
          <div className="whatif-card">
            <span className="whatif-card-label">РАСХОД / НЕД</span>
            <span className="whatif-card-value expense">{formatMoney(projExpense, sym)}</span>
            {activeId && <span className="whatif-card-diff">{expPct >= 0 ? '+' : ''}{expPct}% к базе</span>}
          </div>
          <div className="whatif-card">
            <span className="whatif-card-label">БАЛАНС / НЕД</span>
            <span className={`whatif-card-value ${projBalance >= 0 ? 'income' : 'expense'}`}>
              {formatMoney(projBalance, sym)}
            </span>
          </div>
        </div>

        {budgetData && (
          <div className="whatif-comparison">
            <h3 className="whatif-section-title">Сравнение по категориям</h3>
            <div className="whatif-cat-list">
              {budgetData.categories.map(cat => (
                <div key={cat.id} className={`whatif-cat-item ${cat.type}`}>
                  <span className="whatif-cat-name">{cat.name}</span>
                  <span className="whatif-cat-type">{cat.type === 'income' ? 'Доход' : 'Расход'}</span>
                  <span className="whatif-cat-value">{formatMoney(cat.monthly[0], sym)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="whatif-sidebar">
        <h3 className="whatif-sidebar-title">Сценарии</h3>

        {/* No scenario / base */}
        <button
          className={`whatif-scenario-btn ${activeId === null ? 'active' : ''}`}
          onClick={() => handleSelect(null)}
        >
          <span className="whatif-scenario-name">Без сценария</span>
          <span className="whatif-scenario-desc">Оригинальные значения</span>
        </button>

        {scenarios.map(s => (
          <button
            key={s.id}
            className={`whatif-scenario-btn ${activeId === s.id ? 'active' : ''}`}
            onClick={() => handleSelect(s.id)}
          >
            <span className="whatif-scenario-name">{s.name}</span>
            <span className="whatif-scenario-desc">{s.description}</span>
          </button>
        ))}

        <div className="whatif-custom-section">
          <h4>СВОЙ СЦЕНАРИЙ</h4>
          <div className="form-group">
            <label>Название</label>
            <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Название" />
          </div>
          <div className="whatif-custom-form">
            <div className="form-group">
              <label>Доход, %</label>
              <input type="number" value={customInc} onChange={e => setCustomInc(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Расходы, %</label>
              <input type="number" value={customExp} onChange={e => setCustomExp(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary whatif-apply-btn" onClick={handleCreateCustom} disabled={!customName.trim()}>
            Применить
          </button>
        </div>
      </aside>
    </div>
  );
}
