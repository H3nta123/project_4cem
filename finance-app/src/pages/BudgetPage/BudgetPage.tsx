import { useState, useCallback, useRef, useEffect } from 'react';
import { useApp, formatMoney } from '../../store/AppContext';
import { TrendingUp, TrendingDown, DollarSign, ChevronDown, Plus, Download, Lightbulb, X, Zap, Save, Award, Pencil, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as api from '../../api/api';
import type { CategoryResponse, BudgetTableResponse } from '../../api/api';
import './BudgetPage.css';

const TOTAL_WEEKS = 52;
const VISIBLE_WEEKS = 11; // how many columns are visible at once

const TRACKER_STORAGE_KEY = 'finance_daily_tracker';
const TRACKER_CHECKS_KEY = 'finance_daily_checks';

const TRACKER_EMOJIS = ['🛒', '⛽', '☕', '🍔', '🚌', '💊', '🏋️', '🎬', '📱', '🧹', '🐕', '🅿️', '💈', '🍺'];

/* ─── Types for Daily Tracker ────────────────────────── */

interface TrackerTemplate {
  id: string;
  name: string;
  emoji: string;
  amount: number;
  categoryId: number;      // linked budget category (expense)
  categoryName: string;
}

// key: `${templateId}-${weekIndex}-${dayIndex}` → boolean
type TrackerChecks = Record<string, boolean>;

/* ─── Helper: format week date range ──────────────────── */

function formatWeekRange(dateStr: string): { label: string; range: string } {
  const start = new Date(dateStr);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmtDay = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  return {
    label: fmtDay(start),
    range: `${fmtDay(start)} - ${fmtDay(end)}`,
  };
}

/* ─── Helper: get day of week names ──────────────────── */

const DAY_NAMES_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function getDaysOfWeek(weekDateStr: string): Date[] {
  const start = new Date(weekDateStr);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/* ─── Editable cell ─────────────────────────────────── */

function EditableCell({
  value,
  onSave,
  sym,
  dimmed,
  locked,
}: {
  value: number;
  onSave: (v: number) => void;
  sym: string;
  dimmed?: boolean;
  locked?: boolean;
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
    if (locked) return;
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
    <span
      className={`cell-value ${dimmed ? 'cell-dimmed' : ''} ${locked ? 'cell-locked' : ''}`}
      onClick={startEdit}
      title={locked ? 'Заблокировано. Нажмите «Редактировать» для изменения' : 'Нажмите чтобы изменить'}
    >
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

/* ─── Autofill Modal ────────────────────────────────── */

function AutofillModal({
  category,
  weekStart,
  sym,
  tableMode,
  onClose,
  onDone,
}: {
  category: CategoryResponse;
  weekStart: number;
  sym: string;
  tableMode: 'plan' | 'fact';
  onClose: () => void;
  onDone: () => void;
}) {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [amount, setAmount] = useState('');
  const [count, setCount] = useState('4');
  const [saving, setSaving] = useState(false);

  const countNum = parseInt(count) || 0;
  const amountNum = parseFloat(amount) || 0;
  const step = period === 'weekly' ? 1 : 4;
  const totalWeeks = countNum * step;
  const totalSum = amountNum * countNum;

  const handleSubmit = async () => {
    if (!amount || !count) return;
    setSaving(true);
    try {
      await api.autofillBudget({
        category_id: category.id,
        start_week: weekStart,
        amount: amountNum,
        period,
        count: countNum,
        target: tableMode,
      });
      onDone();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content autofill-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Автозаполнение: {category.name}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Период</label>
            <div className="type-toggle">
              <button
                className={`type-btn ${period === 'weekly' ? 'active income' : ''}`}
                onClick={() => setPeriod('weekly')}
              >На недели</button>
              <button
                className={`type-btn ${period === 'monthly' ? 'active income' : ''}`}
                onClick={() => setPeriod('monthly')}
              >На месяцы</button>
            </div>
          </div>

          <div className="form-group">
            <label>Начальная неделя</label>
            <input type="text" value={`Неделя ${weekStart + 1}`} disabled />
          </div>

          <div className="form-group">
            <label>Количество {period === 'weekly' ? 'недель' : 'месяцев (по 4 недели)'}</label>
            <input
              type="number"
              value={count}
              onChange={e => setCount(e.target.value)}
              placeholder="4"
              min="1"
              max="52"
            />
          </div>

          <div className="form-group">
            <label>Сумма ({tableMode === 'plan' ? 'План' : 'Факт'})</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="30000"
              autoFocus
            />
          </div>

          {amountNum > 0 && countNum > 0 && (
            <div className="autofill-preview">
              Будет проставлено <strong>{formatMoney(amountNum, sym)}</strong>{' '}
              {period === 'weekly'
                ? `каждую неделю ${countNum} раз`
                : `каждый месяц (4 нед.) ${countNum} раз`}
              <br />
              С недели {weekStart + 1} по {Math.min(weekStart + totalWeeks, 52)}
              <br />
              Итого: <strong>{formatMoney(totalSum, sym)}</strong>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving || !amount || !count}
          >
            {saving ? 'Заполнение...' : 'Заполнить'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Add Tracker Template Modal ────────────────────── */

function AddTrackerTemplateModal({
  expenseCategories,
  sym,
  onClose,
  onAdd,
}: {
  expenseCategories: CategoryResponse[];
  sym: string;
  onClose: () => void;
  onAdd: (tpl: TrackerTemplate) => void;
}) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🛒');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id ?? 0);

  const handleSubmit = () => {
    if (!name.trim() || !amount) return;
    const cat = expenseCategories.find(c => c.id === categoryId);
    onAdd({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim(),
      emoji,
      amount: parseFloat(amount) || 0,
      categoryId,
      categoryName: cat?.name ?? '',
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Новый шаблон расхода</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body tracker-modal-body">
          <div className="form-group">
            <label>Иконка</label>
            <div className="emoji-picker">
              {TRACKER_EMOJIS.map(e => (
                <button
                  key={e}
                  className={`emoji-option ${emoji === e ? 'selected' : ''}`}
                  onClick={() => setEmoji(e)}
                >{e}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Название</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Например: Продукты"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Примерная сумма ({sym})</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="2000"
            />
          </div>
          <div className="form-group">
            <label>Категория бюджета</label>
            <select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))}>
              {expenseCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!name.trim() || !amount}>
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Daily Tracker Component ───────────────────────── */

function DailyTracker({
  currentWeekIndex,
  weeklyDates,
  expenseCategories,
  sym,
  onFactUpdate,
}: {
  currentWeekIndex: number;
  weeklyDates: string[];
  expenseCategories: CategoryResponse[];
  sym: string;
  onFactUpdate: (categoryId: number, weekIndex: number, delta: number) => void;
}) {
  const [templates, setTemplates] = useState<TrackerTemplate[]>(() => {
    try {
      const stored = localStorage.getItem(TRACKER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [checks, setChecks] = useState<TrackerChecks>(() => {
    try {
      const stored = localStorage.getItem(TRACKER_CHECKS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const [showAddModal, setShowAddModal] = useState(false);

  // Persist templates
  useEffect(() => {
    localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(templates));
  }, [templates]);

  // Persist checks
  useEffect(() => {
    localStorage.setItem(TRACKER_CHECKS_KEY, JSON.stringify(checks));
  }, [checks]);

  const weekDateStr = weeklyDates[currentWeekIndex];
  const weekDays = weekDateStr ? getDaysOfWeek(weekDateStr) : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleAddTemplate = (tpl: TrackerTemplate) => {
    setTemplates(prev => [...prev, tpl]);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    // Clean up checks for this template
    setChecks(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (key.startsWith(id + '-')) delete next[key];
      });
      return next;
    });
  };

  const handleToggleCheck = (templateId: string, dayIndex: number) => {
    const key = `${templateId}-${currentWeekIndex}-${dayIndex}`;
    const wasChecked = !!checks[key];
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    setChecks(prev => ({
      ...prev,
      [key]: !wasChecked,
    }));

    // Update fact: +amount if checking, -amount if unchecking
    const delta = wasChecked ? -template.amount : template.amount;
    onFactUpdate(template.categoryId, currentWeekIndex, delta);
  };

  const weekLabel = weekDateStr ? formatWeekRange(weekDateStr) : null;

  // Count totals
  let totalChecked = 0;
  let totalSpent = 0;
  templates.forEach(tpl => {
    for (let d = 0; d < 7; d++) {
      const key = `${tpl.id}-${currentWeekIndex}-${d}`;
      if (checks[key]) {
        totalChecked++;
        totalSpent += tpl.amount;
      }
    }
  });

  return (
    <div className="daily-tracker">
      <div className="daily-tracker-header">
        <div className="daily-tracker-title">
          <span className="tracker-icon">📋</span>
          Ежедневный трекер
          {weekLabel && (
            <span className="daily-tracker-week">
              Неделя {currentWeekIndex + 1} ({weekLabel.range})
            </span>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(true)}>
          <Plus size={14} /> Шаблон
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="tracker-empty">
          <span className="empty-icon">📝</span>
          <span>Добавьте шаблоны повторяющихся расходов</span>
          <span>(продукты, бензин, кофе и т.п.)</span>
        </div>
      ) : (
        <>
          <table className="tracker-table">
            <thead>
              <tr>
                <th>Расход</th>
                {DAY_NAMES_SHORT.map((d, i) => {
                  const dayDate = weekDays[i];
                  const isToday = dayDate && dayDate.getTime() === today.getTime();
                  return (
                    <th key={i} style={isToday ? { color: '#fbbf24', borderBottom: '2px solid #fbbf24' } : {}}>
                      {d}
                      {dayDate && <div style={{ fontSize: '9px', fontWeight: 400 }}>{String(dayDate.getDate()).padStart(2, '0')}.{String(dayDate.getMonth() + 1).padStart(2, '0')}</div>}
                    </th>
                  );
                })}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {templates.map(tpl => (
                <tr key={tpl.id}>
                  <td>
                    <div className="tracker-template-info">
                      <span className="tracker-template-name">
                        <span className="template-emoji">{tpl.emoji}</span>
                        {tpl.name}
                      </span>
                      <span className="tracker-template-meta">
                        ~{formatMoney(tpl.amount, sym)} / <span className="cat-link">{tpl.categoryName}</span>
                      </span>
                    </div>
                  </td>
                  {DAY_NAMES_SHORT.map((_, dayIdx) => {
                    const dayDate = weekDays[dayIdx];
                    const isFuture = dayDate && dayDate > today;
                    const key = `${tpl.id}-${currentWeekIndex}-${dayIdx}`;
                    const isChecked = !!checks[key];
                    return (
                      <td key={dayIdx}>
                        <label className={`tracker-check ${isFuture ? 'future-day' : ''}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => !isFuture && handleToggleCheck(tpl.id, dayIdx)}
                            disabled={!!isFuture}
                          />
                          <span className="check-mark">{isChecked ? '✓' : ''}</span>
                        </label>
                      </td>
                    );
                  })}
                  <td>
                    <button className="tracker-delete-btn" onClick={() => handleDeleteTemplate(tpl.id)} title="Удалить шаблон">
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="tracker-summary">
            <div className="tracker-summary-item">
              ✅ Отмечено: <strong>{totalChecked}</strong> из {templates.length * 7}
            </div>
            <div className="tracker-summary-item total-spent">
              💰 Итого за неделю: <strong>{formatMoney(totalSpent, sym)}</strong>
            </div>
          </div>
        </>
      )}

      {showAddModal && (
        <AddTrackerTemplateModal
          expenseCategories={expenseCategories}
          sym={sym}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddTemplate}
        />
      )}
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
  const [showAutofillModal, setShowAutofillModal] = useState(false);
  const [autofillCat, setAutofillCat] = useState<CategoryResponse | null>(null);
  
  const [draftMode, setDraftMode] = useState(false);
  const [draftData, setDraftData] = useState<BudgetTableResponse | null>(null);
  const [draftUpdates, setDraftUpdates] = useState<Record<string, number>>({});
  
  const [tableMode, setTableMode] = useState<'plan' | 'fact' | 'both'>('plan');

  // Feature 3: edit past periods & reminder
  const [editPastPeriods, setEditPastPeriods] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);

  // Week range slider state
  const [weekStart, setWeekStart] = useState(0);

  // Sync with context
  useEffect(() => {
    setBudgetData(state.budgetTable);
  }, [state.budgetTable]);

  const reload = useCallback(async () => {
    try {
      const data = await api.getBudgetTable();
      setBudgetData(data);
      dispatch({ type: 'SET_BUDGET_TABLE', payload: data });
    } catch (e) {
      console.error('Failed to reload budget:', e);
    }
  }, [dispatch]);

  const handleDraftCellSave = useCallback((categoryId: number, weekIndex: number, value: number) => {
    if (!draftData) return;
    const newDraft = JSON.parse(JSON.stringify(draftData)) as BudgetTableResponse;
    const cat = newDraft.categories.find(c => c.id === categoryId);
    if (!cat) return;
    cat.monthly[weekIndex] = value;
    
    newDraft.monthly_income.fill(0);
    newDraft.monthly_expense.fill(0);
    newDraft.categories.forEach(c => {
        for(let i=0; i<52; i++) {
            if (c.type === 'income') newDraft.monthly_income[i] += c.monthly[i];
            else newDraft.monthly_expense[i] += c.monthly[i];
        }
    });
    for(let i=0; i<52; i++) {
        newDraft.monthly_balance[i] = newDraft.monthly_income[i] - newDraft.monthly_expense[i];
    }
    setDraftData(newDraft);
    setDraftUpdates(prev => ({ ...prev, [`${categoryId}-${weekIndex}`]: value }));
  }, [draftData]);

  const handleSaveDraft = useCallback(async () => {
    const updates = Object.entries(draftUpdates).map(([k, v]) => {
        const [c, w] = k.split('-');
        return { category_id: Number(c), month_index: Number(w), value: v };
    });
    if (updates.length > 0) {
        try {
            const res = await api.bulkUpdateBudget({ updates });
            setBudgetData(res);
            dispatch({ type: 'SET_BUDGET_TABLE', payload: res });
        } catch (e) {
            console.error('Failed to save draft:', e);
        }
    }
    setDraftMode(false);
    setDraftData(null);
    setDraftUpdates({});
  }, [draftUpdates, dispatch]);

  const activeBudgetData = draftMode ? draftData : budgetData;

  const handleCellSave = useCallback(async (categoryId: number, weekIndex: number, value: number) => {
    if (draftMode) {
        handleDraftCellSave(categoryId, weekIndex, value);
        return;
    }
    try {
      const data = await api.updateBudgetCell(categoryId, weekIndex, value);
      setBudgetData(data);
      dispatch({ type: 'SET_BUDGET_TABLE', payload: data });
    } catch (e) {
      console.error('Failed to update cell:', e);
    }
  }, [draftMode, handleDraftCellSave, dispatch]);

  const handleFactCellSave = useCallback(async (categoryId: number, weekIndex: number, value: number) => {
    try {
      const data = await api.updateBudgetFactCell(categoryId, weekIndex, value);
      setBudgetData(data);
      dispatch({ type: 'SET_BUDGET_TABLE', payload: data });
    } catch (e) {
      console.error('Failed to update fact cell:', e);
    }
  }, [dispatch]);

  // Feature 4: Delta-based fact update for tracker
  const handleTrackerFactUpdate = useCallback(async (categoryId: number, weekIndex: number, delta: number) => {
    if (!activeBudgetData) return;
    const cat = activeBudgetData.categories.find(c => c.id === categoryId);
    if (!cat) return;
    const currentVal = cat.monthly_fact[weekIndex] || 0;
    const newVal = Math.max(0, currentVal + delta);
    try {
      const data = await api.updateBudgetFactCell(categoryId, weekIndex, newVal);
      setBudgetData(data);
      dispatch({ type: 'SET_BUDGET_TABLE', payload: data });
    } catch (e) {
      console.error('Failed to update fact from tracker:', e);
    }
  }, [activeBudgetData, dispatch]);

  const handleExport = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  const openAutofill = (cat: CategoryResponse) => {
    setAutofillCat(cat);
    setShowAutofillModal(true);
  };

  if (state.loading || !activeBudgetData) {
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
  
  const profitAdjustment = state.settings.profitAdjustment || 0;

  const { categories, monthly_income, monthly_expense, monthly_balance, weekly_dates } = activeBudgetData;
  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const totalIncomeWeek = tableMode === 'fact' ? activeBudgetData.monthly_fact_income[weekStart] || 0 : monthly_income[weekStart] || 0;
  const totalExpenseWeek = tableMode === 'fact' ? activeBudgetData.monthly_fact_expense[weekStart] || 0 : monthly_expense[weekStart] || 0;
  const balance = tableMode === 'fact' ? activeBudgetData.monthly_fact_balance[weekStart] || 0 : monthly_balance[weekStart] || 0;

  // Cumulative profit from week 1 to the current real-world week
  let currentWeekIndex = 0;
  if (weekly_dates && weekly_dates.length > 0) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = 0; i < weekly_dates.length; i++) {
      const d = new Date(weekly_dates[i]);
      if (now >= d) {
        currentWeekIndex = i;
      } else {
        break;
      }
    }
  }
  const currentAccumulatedWeeks = Math.min(currentWeekIndex + 1, TOTAL_WEEKS);
  const activeBalanceArray = tableMode === 'fact' ? activeBudgetData.monthly_fact_balance : monthly_balance;
  const cumulativeProfit = activeBalanceArray.slice(0, currentAccumulatedWeeks).reduce((sum, v) => sum + v, 0) + profitAdjustment;
  
  const handleProfitAdjust = async (val: number) => {
    try {
      const updated = await api.updateSettings({ profitAdjustment: val });
      dispatch({ type: 'SET_SETTINGS', payload: updated });
    } catch (e) {
      console.error('Failed to update profit adjustment:', e);
    }
  };

  // Feature 3: Check if reminder should be shown
  // Show reminder in Fact mode when the current week has started and all fact values for current week are 0
  const shouldShowReminder = tableMode === 'fact' && !reminderDismissed && (() => {
    if (!weekly_dates || weekly_dates.length === 0) return false;
    const now = new Date();
    const weekStart_date = new Date(weekly_dates[currentWeekIndex]);
    const daysSinceWeekStart = Math.floor((now.getTime() - weekStart_date.getTime()) / (1000 * 60 * 60 * 24));
    // Show if we're in the first 3 days of the week and all fact values are empty
    if (daysSinceWeekStart >= 0 && daysSinceWeekStart <= 3) {
      const allEmpty = categories.every(c => (c.monthly_fact[currentWeekIndex] || 0) === 0);
      return allEmpty;
    }
    return false;
  })();

  const currentWeekRange = weekly_dates?.[currentWeekIndex]
    ? formatWeekRange(weekly_dates[currentWeekIndex])
    : null;

  // Generate visible week labels with dates
  const visibleWeeks = Array.from({ length: VISIBLE_WEEKS }, (_, i) => {
    const idx = weekStart + i;
    const dateStr = weekly_dates?.[idx];
    if (dateStr) {
      const info = formatWeekRange(dateStr);
      return { index: idx, header: `НЕДЕЛЯ ${idx + 1}`, sub: info.range };
    }
    return { index: idx, header: `Н${idx + 1}`, sub: '' };
  });

  // Chart data — all 52 weeks
  const chartData = Array.from({ length: 52 }, (_, i) => ({
    name: `Н${i + 1}`,
    Доходы: monthly_income[i] || 0,
    Расходы: monthly_expense[i] || 0,
  }));

  // CSS class for table mode coloring
  const tableModeClass = `table-mode-${tableMode}`;

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
            <span className="summary-card-label">КАССОВЫЙ РАЗРЫВ</span>
            <span className="summary-card-value">{formatMoney(balance, sym)}</span>
          </div>
        </div>
        <div className={`summary-card summary-card--profit ${cumulativeProfit >= 0 ? 'positive' : 'negative'}`}>
          <div className="summary-card-icon"><Award size={20} /></div>
          <div className="summary-card-content">
            <span className="summary-card-label">ОБЩАЯ ПРИБЫЛЬ (1–{currentAccumulatedWeeks})</span>
            <span className="summary-card-value">{formatMoney(cumulativeProfit, sym)}</span>
            <div style={{ fontSize: '11px', marginTop: '2px', color: 'var(--text-muted)' }}>
              Корректировка: <EditableCell value={profitAdjustment} sym={sym} onSave={handleProfitAdjust} />
            </div>
          </div>
        </div>
      </div>

      {/* Budget table section */}
      <div className="budget-section">
        <div className="budget-section-header">
          <div>
            <h2 className="budget-section-title">
              Бюджет на год
              <span className={`table-mode-badge badge-${tableMode}`}>
                {tableMode === 'plan' ? '📘 План' : tableMode === 'fact' ? '📙 Факт' : '📘📙 Оба'}
              </span>
            </h2>
            <span className="budget-section-sub">52 недели • Неделя {weekStart + 1} — {weekStart + VISIBLE_WEEKS}</span>
          </div>
          <div className="budget-tabs">
            <button
              className={`budget-tab tab-plan ${tableMode === 'plan' ? 'active' : ''}`}
              onClick={() => setTableMode('plan')}
            >План</button>
            <button
              className={`budget-tab tab-fact ${tableMode === 'fact' ? 'active' : ''}`}
              onClick={() => setTableMode('fact')}
            >Факт</button>
            <button
              className={`budget-tab tab-both ${tableMode === 'both' ? 'active' : ''}`}
              onClick={() => setTableMode('both')}
            >Оба</button>
            <button className={`budget-tab accent ${draftMode ? 'active-scenario' : ''}`} onClick={() => setShowScenarioModal(true)}>
              <Lightbulb size={14} /> Сценарии
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

        {/* Feature 3: Fact reminder banner */}
        {shouldShowReminder && currentWeekRange && (
          <div className="fact-reminder-banner">
            <span className="reminder-icon">⏰</span>
            <span className="reminder-text">
              Началась новая <strong>неделя {currentWeekIndex + 1}</strong> ({currentWeekRange.range}). Не забудьте внести фактические данные!
            </span>
            <button className="btn-dismiss" onClick={() => setReminderDismissed(true)}>Скрыть</button>
          </div>
        )}

        {/* Feature 3: Edit past periods button (fact mode only) */}
        {(tableMode === 'fact' || tableMode === 'both') && (
          <div className="edit-past-toolbar">
            <button
              className={`edit-past-btn ${editPastPeriods ? 'active' : ''}`}
              onClick={() => setEditPastPeriods(!editPastPeriods)}
            >
              {editPastPeriods ? <Lock size={13} /> : <Pencil size={13} />}
              {editPastPeriods ? 'Заблокировать прошлые' : 'Редактировать прошлые'}
            </button>
            {editPastPeriods && (
              <span style={{ fontSize: '11px', color: 'var(--warning)' }}>
                ⚠️ Редактирование прошлых периодов включено
              </span>
            )}
          </div>
        )}

        {draftMode && (
          <div className="scenario-banner">
            🎯 Включен режим: <strong>Базовый</strong> (черновик)
            <button className="btn btn-ghost btn-sm" onClick={() => setDraftMode(false)}>Отменить</button>
            <button className="btn btn-primary btn-sm" onClick={handleSaveDraft}>
              <Save size={12} /> Сохранить в План
            </button>
          </div>
        )}

        <div className={`budget-table-wrapper ${tableModeClass}`}>
          <table className="budget-table">
            <thead>
              <tr>
                <th className="budget-th-cat">Категория</th>
                {visibleWeeks.map(w => (
                  <th key={w.index} className={`budget-th-week ${w.index === currentWeekIndex ? 'current-week' : ''}`}>
                    <div className="week-header">
                      <span className="week-header-num">НЕДЕЛЯ {w.index + 1}</span>
                      {w.sub && <span className="week-header-date">{w.sub}</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Income group */}
              <tr className="budget-row-group">
                <td><ChevronDown size={14} /> Доходы</td>
                {visibleWeeks.map(w => (
                  <td key={w.index} className={`total-cell income-total ${w.index === currentWeekIndex ? 'current-week-cell' : ''}`}>
                    {tableMode === 'both' ? (
                      <div className="both-cell">
                        <span className="both-plan">{monthly_income[w.index] ? formatMoney(monthly_income[w.index], sym) : '—'}</span>
                        <span className="both-fact">{activeBudgetData!.monthly_fact_income[w.index] ? formatMoney(activeBudgetData!.monthly_fact_income[w.index], sym) : '—'}</span>
                      </div>
                    ) : tableMode === 'fact' ? (
                      activeBudgetData!.monthly_fact_income[w.index] ? formatMoney(activeBudgetData!.monthly_fact_income[w.index], sym) : '—'
                    ) : (
                      monthly_income[w.index] ? formatMoney(monthly_income[w.index], sym) : '—'
                    )}
                  </td>
                ))}
              </tr>
              {incomeCategories.map(cat => (
                <tr key={cat.id} className="budget-row-item">
                  <td className="budget-cat-indent">
                    <span className="cat-name-text">{cat.name}</span>
                    <button className="cat-autofill-btn" title="Автозаполнение" onClick={() => openAutofill(cat)}>
                      <Zap size={12} />
                    </button>
                  </td>
                  {visibleWeeks.map(w => {
                    const idx = w.index;
                    const planVal = cat.monthly[idx] || 0;
                    const factVal = cat.monthly_fact[idx] || 0;
                    const isPast = idx < currentWeekIndex;
                    const isFactLocked = isPast && !editPastPeriods && (tableMode === 'fact' || tableMode === 'both');
                    return (
                      <td key={idx} className={`${idx === currentWeekIndex ? 'current-week-cell' : ''} ${isPast && tableMode === 'fact' ? `past-week-cell ${editPastPeriods ? 'edit-unlocked' : ''}` : ''}`}>
                        {tableMode === 'both' ? (
                          <div className="both-cell">
                            <EditableCell value={planVal} sym={sym} onSave={val => handleCellSave(cat.id, idx, val)} dimmed />
                            <EditableCell value={factVal} sym={sym} onSave={val => handleFactCellSave(cat.id, idx, val)} locked={isFactLocked} />
                          </div>
                        ) : tableMode === 'fact' ? (
                          <EditableCell value={factVal} sym={sym} onSave={val => handleFactCellSave(cat.id, idx, val)} locked={isFactLocked} />
                        ) : (
                          <EditableCell value={planVal} sym={sym} onSave={val => handleCellSave(cat.id, idx, val)} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Feature 2: Balance row BETWEEN income and expense */}
              <tr className="budget-row-group budget-row-balance">
                <td>💰 Баланс</td>
                {visibleWeeks.map(w => {
                  const bal = monthly_balance[w.index] || 0;
                  const factBal = activeBudgetData!.monthly_fact_balance[w.index] || 0;
                  return (
                    <td key={w.index} className={`total-cell ${bal >= 0 ? 'income-total' : 'expense-total'} ${w.index === currentWeekIndex ? 'current-week-cell' : ''}`}>
                      {tableMode === 'both' ? (
                        <div className="both-cell">
                          <span className="both-plan">{formatMoney(bal, sym)}</span>
                          <span className="both-fact">{formatMoney(factBal, sym)}</span>
                        </div>
                      ) : tableMode === 'fact' ? (
                        formatMoney(factBal, sym)
                      ) : (
                        formatMoney(bal, sym)
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Expense group */}
              <tr className="budget-row-group">
                <td><ChevronDown size={14} /> Расходы</td>
                {visibleWeeks.map(w => (
                  <td key={w.index} className={`total-cell expense-total ${w.index === currentWeekIndex ? 'current-week-cell' : ''}`}>
                    {tableMode === 'both' ? (
                      <div className="both-cell">
                        <span className="both-plan">{monthly_expense[w.index] ? formatMoney(monthly_expense[w.index], sym) : '—'}</span>
                        <span className="both-fact">{activeBudgetData!.monthly_fact_expense[w.index] ? formatMoney(activeBudgetData!.monthly_fact_expense[w.index], sym) : '—'}</span>
                      </div>
                    ) : tableMode === 'fact' ? (
                      activeBudgetData!.monthly_fact_expense[w.index] ? formatMoney(activeBudgetData!.monthly_fact_expense[w.index], sym) : '—'
                    ) : (
                      monthly_expense[w.index] ? formatMoney(monthly_expense[w.index], sym) : '—'
                    )}
                  </td>
                ))}
              </tr>
              {expenseCategories.map(cat => (
                <tr key={cat.id} className="budget-row-item">
                  <td className="budget-cat-indent">
                    <span className="cat-name-text">{cat.name}</span>
                    <button className="cat-autofill-btn" title="Автозаполнение" onClick={() => openAutofill(cat)}>
                      <Zap size={12} />
                    </button>
                  </td>
                  {visibleWeeks.map(w => {
                    const idx = w.index;
                    const planVal = cat.monthly[idx] || 0;
                    const factVal = cat.monthly_fact[idx] || 0;
                    const isPast = idx < currentWeekIndex;
                    const isFactLocked = isPast && !editPastPeriods && (tableMode === 'fact' || tableMode === 'both');
                    return (
                      <td key={idx} className={`${idx === currentWeekIndex ? 'current-week-cell' : ''} ${isPast && tableMode === 'fact' ? `past-week-cell ${editPastPeriods ? 'edit-unlocked' : ''}` : ''}`}>
                        {tableMode === 'both' ? (
                          <div className="both-cell">
                            <EditableCell value={planVal} sym={sym} onSave={val => handleCellSave(cat.id, idx, val)} dimmed />
                            <EditableCell value={factVal} sym={sym} onSave={val => handleFactCellSave(cat.id, idx, val)} locked={isFactLocked} />
                          </div>
                        ) : tableMode === 'fact' ? (
                          <EditableCell value={factVal} sym={sym} onSave={val => handleFactCellSave(cat.id, idx, val)} locked={isFactLocked} />
                        ) : (
                          <EditableCell value={planVal} sym={sym} onSave={val => handleCellSave(cat.id, idx, val)} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tableMode === 'both' && (
          <div className="both-legend">
            <span className="both-legend-plan">● План</span>
            <span className="both-legend-fact">● Факт</span>
          </div>
        )}

        <div className="budget-table-actions">
          <button className="btn btn-ghost" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Категория
          </button>
          <button className="btn btn-ghost" onClick={handleExport}>
            <Download size={14} /> Экспорт
          </button>
        </div>
      </div>

      {/* Feature 4: Daily Tracker */}
      <DailyTracker
        currentWeekIndex={currentWeekIndex}
        weeklyDates={weekly_dates}
        expenseCategories={expenseCategories}
        sym={sym}
        onFactUpdate={handleTrackerFactUpdate}
      />

      {/* Chart + Credits */}
      <div className="budget-bottom">
        <div className="budget-chart-section">
          <h3 className="budget-chart-title">ДОХОДЫ И РАСХОДЫ</h3>
          <div className="budget-chart" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
            <div style={{ width: '2400px', height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={2} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={50} tickFormatter={v => (v / 1000) + 'k'} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Доходы" fill="var(--success)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Расходы" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddCategoryModal onClose={() => setShowAddModal(false)} onCreated={reload} />
      )}
      {showScenarioModal && (
        <div className="modal-overlay" onClick={() => setShowScenarioModal(false)}>
          <div className="modal-content scenario-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Сценарии</h3>
              <button className="modal-close" onClick={() => setShowScenarioModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="scenarios-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  className={`scenario-option ${!draftMode ? 'active' : ''}`} 
                  onClick={() => { setDraftMode(false); setShowScenarioModal(false); }}
                >
                  <span className="scenario-name">Без сценария</span>
                  <span className="scenario-desc">Оригинальные значения плана</span>
                </button>
                
                <button 
                  className={`scenario-option ${draftMode ? 'active' : ''}`} 
                  onClick={() => {
                    setDraftMode(true);
                    setDraftData(JSON.parse(JSON.stringify(budgetData)));
                    setDraftUpdates({});
                    setShowScenarioModal(false);
                  }}
                >
                  <span className="scenario-name">Базовый</span>
                  <span className="scenario-desc">Режим черновика (можно редактировать и сохранить)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAutofillModal && autofillCat && (
        <AutofillModal
          category={autofillCat}
          weekStart={weekStart}
          sym={sym}
          tableMode={tableMode === 'both' ? 'plan' : tableMode}
          onClose={() => { setShowAutofillModal(false); setAutofillCat(null); }}
          onDone={reload}
        />
      )}
    </div>
  );
}
