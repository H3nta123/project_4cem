import { useState, useCallback, useRef, useEffect } from 'react';
import { useApp, formatMoney } from '../../store/AppContext';
import { TrendingUp, TrendingDown, DollarSign, ChevronDown, Plus, Download, Lightbulb, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as api from '../../api/api';
import type { BudgetTableResponse, ScenarioResponse } from '../../api/api';
import './BudgetPage.css';

const TOTAL_WEEKS = 52;
const VISIBLE_WEEKS = 12; // how many columns are visible at once
const PERIODS = Array.from({ length: TOTAL_WEEKS }, (_, i) => `Н${i + 1}`);

/* ─── Editable cell ─────────────────────────────────── */

function EditableCell({
  value,
  onSave,
  sym,
}: {
  value: number;
  onSave: (v: number) => void;
  sym: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = () => {
    setText(String(value));
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const num = parseFloat(text) || 0;
    if (num !== value) onSave(num);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="cell-input"
        type="number"
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
      />
    );
  }

  return (
    <span className="cell-value" onClick={startEdit} title="Нажмите чтобы изменить">
      {value ? formatMoney(value, sym) : '—'}
    </span>
  );
}

/* ─── Add Category Modal ────────────────────────────── */

function AddCategoryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.createCategory({ name: name.trim(), type });
      onCreated();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Новая категория</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Название</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Например: Подписки"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Тип</label>
            <div className="type-toggle">
              <button
                className={`type-btn ${type === 'income' ? 'active income' : ''}`}
                onClick={() => setType('income')}
              >Доход</button>
              <button
                className={`type-btn ${type === 'expense' ? 'active expense' : ''}`}
                onClick={() => setType('expense')}
              >Расход</button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Scenario Modal ────────────────────────────────── */

function ScenarioModal({
  scenarios,
  activeId,
  onSelect,
  onClose,
}: {
  scenarios: ScenarioResponse[];
  activeId: number | null;
  onSelect: (id: number | null) => void;
  onClose: () => void;
}) {
  const [customName, setCustomName] = useState('');
  const [customInc, setCustomInc] = useState('0');
  const [customExp, setCustomExp] = useState('0');
  const [saving, setSaving] = useState(false);

  const handleCreateCustom = async () => {
    if (!customName.trim()) return;
    setSaving(true);
    try {
      const s = await api.createScenario({
        name: customName.trim(),
        income_modifier: 1 + (parseFloat(customInc) || 0) / 100,
        expense_modifier: 1 + (parseFloat(customExp) || 0) / 100,
        description: `Доход ${customInc}%, Расходы ${customExp}%`,
      });
      onSelect(s.id);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content scenario-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Сценарии</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {/* Reset to base */}
          <button
            className={`scenario-option ${activeId === null ? 'active' : ''}`}
            onClick={() => { onSelect(null); onClose(); }}
          >
            <span className="scenario-name">Без сценария</span>
            <span className="scenario-desc">Оригинальные значения</span>
          </button>

          {scenarios.map(s => (
            <button
              key={s.id}
              className={`scenario-option ${activeId === s.id ? 'active' : ''}`}
              onClick={() => { onSelect(s.id); onClose(); }}
            >
              <span className="scenario-name">{s.name}</span>
              <span className="scenario-desc">{s.description}</span>
            </button>
          ))}

          <div className="scenario-custom-section">
            <h4>СВОЙ СЦЕНАРИЙ</h4>
            <div className="form-group">
              <label>Название</label>
              <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Название" />
            </div>
            <div className="scenario-custom-row">
              <div className="form-group">
                <label>Доход, %</label>
                <input type="number" value={customInc} onChange={e => setCustomInc(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Расходы, %</label>
                <input type="number" value={customExp} onChange={e => setCustomExp(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCreateCustom} disabled={saving}>
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────── */

export default function BudgetPage() {
  const { state, dispatch } = useApp();
  const sym = state.settings.currencySymbol;

  const [budgetData, setBudgetData] = useState<BudgetTableResponse | null>(state.budgetTable);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<number | null>(null);

  // Week range slider state
  const [weekStart, setWeekStart] = useState(0);
  const visiblePeriods = PERIODS.slice(weekStart, weekStart + VISIBLE_WEEKS);

  // Sync with context
  useEffect(() => {
    setBudgetData(state.budgetTable);
  }, [state.budgetTable]);

  const reload = useCallback(async () => {
    try {
      const data = activeScenarioId
        ? await api.getBudgetWithScenario(activeScenarioId)
        : await api.getBudgetTable();
      setBudgetData(data);
      if (!activeScenarioId) {
        dispatch({ type: 'SET_BUDGET_TABLE', payload: data });
      }
    } catch (e) {
      console.error('Failed to reload budget:', e);
    }
  }, [activeScenarioId, dispatch]);

  const handleCellSave = useCallback(async (categoryId: number, weekIndex: number, value: number) => {
    try {
      const data = await api.updateBudgetCell(categoryId, weekIndex, value);
      setBudgetData(data);
      dispatch({ type: 'SET_BUDGET_TABLE', payload: data });
    } catch (e) {
      console.error('Failed to update cell:', e);
    }
  }, [dispatch]);

  const handleScenarioSelect = useCallback(async (scenarioId: number | null) => {
    setActiveScenarioId(scenarioId);
    try {
      const data = scenarioId
        ? await api.getBudgetWithScenario(scenarioId)
        : await api.getBudgetTable();
      setBudgetData(data);
    } catch (e) {
      console.error('Failed to apply scenario:', e);
    }
  }, []);

  const handleExport = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  if (state.loading || !budgetData) {
    return <div className="budget-page"><div className="loading">Загрузка...</div></div>;
  }

  if (state.error) {
    return (
      <div className="budget-page">
        <div className="error-state">
          <p>⚠️ {state.error}</p>
          <p>Убедитесь, что бэкенд запущен: <code>python main.py</code></p>
        </div>
      </div>
    );
  }

  const { categories, monthly_income, monthly_expense, monthly_balance } = budgetData;
  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const totalIncomeWeek = monthly_income[weekStart] || 0;
  const totalExpenseWeek = monthly_expense[weekStart] || 0;
  const balance = monthly_balance[weekStart] || 0;

  // Chart data — only visible weeks
  const chartData = visiblePeriods.map((m, i) => ({
    name: m,
    Доходы: monthly_income[weekStart + i] || 0,
    Расходы: monthly_expense[weekStart + i] || 0,
  }));

  const isScenarioActive = activeScenarioId !== null;

  return (
    <div className="budget-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Бюджет</h1>
        </div>
      </div>

      {/* Summary cards */}
      <div className="summary-cards">
        <div className="summary-card summary-card--income">
          <div className="summary-card-icon"><TrendingUp size={20} /></div>
          <div className="summary-card-content">
            <span className="summary-card-label">ДОХОД / НЕДЕЛЯ</span>
            <span className="summary-card-value">{formatMoney(totalIncomeWeek, sym)}</span>
          </div>
        </div>
        <div className="summary-card summary-card--expense">
          <div className="summary-card-icon"><TrendingDown size={20} /></div>
          <div className="summary-card-content">
            <span className="summary-card-label">РАСХОД / НЕДЕЛЯ</span>
            <span className="summary-card-value">{formatMoney(totalExpenseWeek, sym)}</span>
          </div>
        </div>
        <div className="summary-card summary-card--balance">
          <div className="summary-card-icon"><DollarSign size={20} /></div>
          <div className="summary-card-content">
            <span className="summary-card-label">БАЛАНС СЕЙЧАС</span>
            <span className="summary-card-value">{formatMoney(balance, sym)}</span>
          </div>
        </div>
      </div>

      {/* Budget table section */}
      <div className="budget-section">
        <div className="budget-section-header">
          <div>
            <h2 className="budget-section-title">Бюджет на год</h2>
            <span className="budget-section-sub">52 недели • Неделя {weekStart + 1} — {weekStart + VISIBLE_WEEKS}</span>
          </div>
          <div className="budget-tabs">
            <button className="budget-tab active">План</button>
            <button className="budget-tab">Факт</button>
            <button className="budget-tab">Оба</button>
            <button className={`budget-tab accent ${isScenarioActive ? 'active-scenario' : ''}`} onClick={() => setShowScenarioModal(true)}>
              <Lightbulb size={14} /> Сценарий
            </button>
          </div>
        </div>

        {/* Week range slider */}
        <div className="week-slider-container">
          <span className="week-slider-label">Н{weekStart + 1}</span>
          <input
            type="range"
            className="week-slider"
            min={0}
            max={TOTAL_WEEKS - VISIBLE_WEEKS}
            value={weekStart}
            onChange={e => setWeekStart(Number(e.target.value))}
          />
          <span className="week-slider-label">Н{weekStart + VISIBLE_WEEKS}</span>
        </div>

        {isScenarioActive && (
          <div className="scenario-banner">
            🎯 Применён сценарий: <strong>{state.scenarios.find(s => s.id === activeScenarioId)?.name}</strong>
            <button className="btn btn-ghost btn-sm" onClick={() => handleScenarioSelect(null)}>Сбросить</button>
          </div>
        )}

        <div className="budget-table-wrapper">
          <table className="budget-table">
            <thead>
              <tr>
                <th className="budget-th-cat">Категория</th>
                {visiblePeriods.map(m => <th key={m}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {/* Income group */}
              <tr className="budget-row-group">
                <td><ChevronDown size={14} /> Доходы</td>
                {visiblePeriods.map((_, i) => (
                  <td key={i} className="total-cell income-total">
                    {monthly_income[weekStart + i] ? formatMoney(monthly_income[weekStart + i], sym) : '—'}
                  </td>
                ))}
              </tr>
              {incomeCategories.map(cat => (
                <tr key={cat.id} className="budget-row-item">
                  <td className="budget-cat-indent">{cat.name}</td>
                  {visiblePeriods.map((_, i) => {
                    const idx = weekStart + i;
                    const v = cat.monthly[idx] || 0;
                    return (
                      <td key={i}>
                        {isScenarioActive
                          ? <span className="cell-value scenario-value">{v ? formatMoney(v, sym) : '—'}</span>
                          : <EditableCell value={v} sym={sym} onSave={val => handleCellSave(cat.id, idx, val)} />
                        }
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Expense group */}
              <tr className="budget-row-group">
                <td><ChevronDown size={14} /> Расходы</td>
                {visiblePeriods.map((_, i) => (
                  <td key={i} className="total-cell expense-total">
                    {monthly_expense[weekStart + i] ? formatMoney(monthly_expense[weekStart + i], sym) : '—'}
                  </td>
                ))}
              </tr>
              {expenseCategories.map(cat => (
                <tr key={cat.id} className="budget-row-item">
                  <td className="budget-cat-indent">{cat.name}</td>
                  {visiblePeriods.map((_, i) => {
                    const idx = weekStart + i;
                    const v = cat.monthly[idx] || 0;
                    return (
                      <td key={i}>
                        {isScenarioActive
                          ? <span className="cell-value scenario-value">{v ? formatMoney(v, sym) : '—'}</span>
                          : <EditableCell value={v} sym={sym} onSave={val => handleCellSave(cat.id, idx, val)} />
                        }
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="budget-table-actions">
          <button className="btn btn-ghost" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Категория
          </button>
          <button className="btn btn-ghost" onClick={handleExport}>
            <Download size={14} /> Экспорт
          </button>
        </div>
      </div>

      {/* Chart + Credits */}
      <div className="budget-bottom">
        <div className="budget-chart-section">
          <h3 className="budget-chart-title">ДОХОДЫ И РАСХОДЫ</h3>
          <div className="budget-chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barGap={2} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={50} tickFormatter={v => (v/1000)+'k'} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Доходы" fill="var(--success)" radius={[4,4,0,0]} />
                <Bar dataKey="Расходы" fill="var(--danger)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddCategoryModal onClose={() => setShowAddModal(false)} onCreated={reload} />
      )}
      {showScenarioModal && (
        <ScenarioModal
          scenarios={state.scenarios}
          activeId={activeScenarioId}
          onSelect={handleScenarioSelect}
          onClose={() => setShowScenarioModal(false)}
        />
      )}
    </div>
  );
}
