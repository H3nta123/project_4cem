import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import * as api from '../../api/api';
import './OnboardingModal.css';

/**
 * Onboarding modal shown on first launch when budgetStartDate is not set.
 * Allows user to pick a budget planning start date.
 */
export default function OnboardingModal() {
  const { dispatch } = useApp();
  const [date, setDate] = useState(() => {
    // Default to Monday of current week
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);
    try {
      const updated = await api.updateSettings({ budgetStartDate: date });
      dispatch({ type: 'SET_SETTINGS', payload: updated });
      // Reload budget table to get new weekly dates
      const budget = await api.getBudgetTable();
      dispatch({ type: 'SET_BUDGET_TABLE', payload: budget });
    } catch (e) {
      console.error('Failed to save start date:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-hero">
          <span className="onboarding-emoji">📊</span>
          <h2>Добро пожаловать в ФинансПро</h2>
          <p>Для начала выберите дату старта планирования бюджета</p>
        </div>
        <div className="onboarding-body">
          <div className="onboarding-field">
            <label>Начальная дата планирования</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="onboarding-hint">
            💡 Бюджет будет разбит на 52 недели начиная с выбранной даты. Каждая неделя будет привязана к конкретным числам.
          </div>
        </div>
        <div className="onboarding-footer">
          <button
            className="onboarding-btn"
            onClick={handleSave}
            disabled={!date || saving}
          >
            {saving ? 'Сохранение...' : 'Начать планирование'}
          </button>
        </div>
      </div>
    </div>
  );
}
