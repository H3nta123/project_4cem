import { useApp } from '../../store/AppContext';
import * as api from '../../api/api';
import './SettingsPage.css';

export default function SettingsPage() {
  const { state, dispatch } = useApp();
  const { settings } = state;

  async function toggleTheme() {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    try {
      const updated = await api.updateSettings({ theme: newTheme });
      dispatch({ type: 'SET_SETTINGS', payload: updated });
    } catch (e) {
      console.error(e);
      dispatch({ type: 'UPDATE_SETTINGS', payload: { theme: newTheme } });
    }
  }

  async function toggleNotifyPayments() {
    try {
      const updated = await api.updateSettings({ notifyPayments: !settings.notifyPayments });
      dispatch({ type: 'SET_SETTINGS', payload: updated });
    } catch (e) {
      console.error(e);
      dispatch({ type: 'UPDATE_SETTINGS', payload: { notifyPayments: !settings.notifyPayments } });
    }
  }

  async function toggleNotifyBudget() {
    try {
      const updated = await api.updateSettings({ notifyBudgetExceed: !settings.notifyBudgetExceed });
      dispatch({ type: 'SET_SETTINGS', payload: updated });
    } catch (e) {
      console.error(e);
      dispatch({ type: 'UPDATE_SETTINGS', payload: { notifyBudgetExceed: !settings.notifyBudgetExceed } });
    }
  }

  function handleExport() {
    window.open(api.getExportCsvUrl(), '_blank');
  }

  async function handleReset() {
    if (!confirm('Вы уверены? Все данные будут удалены!')) return;
    try {
      await api.resetData();
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Настройки</h1>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-label">ВНЕШНИЙ ВИД</h3>
        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Тёмная тема</span>
            <span className="settings-row-desc">Переключить оформление</span>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={settings.theme === 'dark'} onChange={toggleTheme} />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-label">ВАЛЮТА</h3>
        <div className="settings-row">
          <span className="settings-row-title">Основная валюта</span>
          <span className="settings-currency-badge">₽Рубль</span>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-label">УВЕДОМЛЕНИЯ</h3>
        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Очередной платёж</span>
            <span className="settings-row-desc">За 3 дня до платежа</span>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={settings.notifyPayments} onChange={toggleNotifyPayments} />
            <span className="toggle-slider" />
          </label>
        </div>
        <div className="settings-row">
          <span className="settings-row-title">Привышение бюджета</span>
          <label className="toggle">
            <input type="checkbox" checked={settings.notifyBudgetExceed} onChange={toggleNotifyBudget} />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-label">ДАННЫЕ</h3>
        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Экспорт</span>
            <span className="settings-row-desc">Выгрузить данные в CSV</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleExport}>Скачать</button>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Сброс</span>
            <span className="settings-row-desc">Удалить все данные</span>
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleReset}>Сбросить</button>
        </div>
      </div>
    </div>
  );
}
