import { useState } from 'react';
import { useApp, formatMoney } from '../../store/AppContext';
import { Plus, X, CreditCard, PiggyBank, TrendingUp } from 'lucide-react';
import * as api from '../../api/api';
import type { FinanceTab } from '../../types';
import './FinancesPage.css';

const INVESTMENT_TYPES = [
  { value: 'stocks', label: 'Акции' },
  { value: 'bonds', label: 'Облигации' },
  { value: 'crypto', label: 'Крипто' },
  { value: 'fund', label: 'Фонд' },
  { value: 'metals', label: 'Металлы' },
  { value: 'other', label: 'Другое' },
];

export default function FinancesPage() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<FinanceTab>('loans');
  const sym = state.settings.currencySymbol;

  // ─── Modal state ───
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showSavingModal, setShowSavingModal] = useState(false);
  const [showInvestModal, setShowInvestModal] = useState(false);

  // ─── Forms ───
  const [loanForm, setLoanForm] = useState({ name: '', total_amount: '', monthly_payment: '', interest_rate: '', start_date: '', end_date: '' });
  const [savingForm, setSavingForm] = useState({ name: '', target: '' });
  const [investForm, setInvestForm] = useState({ name: '', type: 'stocks', value: '', purchase_price: '', quantity: '' });

  const tabs: { key: FinanceTab; label: string; icon: typeof CreditCard }[] = [
    { key: 'loans', label: 'Кредиты', icon: CreditCard },
    { key: 'savings', label: 'Накопления', icon: PiggyBank },
    { key: 'investments', label: 'Инвестиции', icon: TrendingUp },
  ];

  // ─── Loan actions ───
  async function handleCreateLoan() {
    if (!loanForm.name || !loanForm.total_amount) return;
    try {
      await api.createLoan({
        name: loanForm.name,
        total_amount: parseFloat(loanForm.total_amount),
        monthly_payment: parseFloat(loanForm.monthly_payment) || 0,
        interest_rate: parseFloat(loanForm.interest_rate) || 0,
        start_date: loanForm.start_date || undefined,
        end_date: loanForm.end_date || undefined,
      });
      const updated = await api.getLoans();
      dispatch({ type: 'SET_LOANS', payload: updated });
      setShowLoanModal(false);
      setLoanForm({ name: '', total_amount: '', monthly_payment: '', interest_rate: '', start_date: '', end_date: '' });
    } catch (e) { console.error(e); }
  }

  async function handleDeleteLoan(id: number) {
    try {
      await api.deleteLoan(id);
      const updated = await api.getLoans();
      dispatch({ type: 'SET_LOANS', payload: updated });
    } catch (e) { console.error(e); }
  }

  async function handlePayLoan(id: number) {
    const loan = state.loans.find(l => l.id === id);
    if (!loan) return;
    const newPaid = Math.min(loan.paid_amount + loan.monthly_payment, loan.total_amount);
    try {
      await api.updateLoan(id, { paid_amount: newPaid });
      const updated = await api.getLoans();
      dispatch({ type: 'SET_LOANS', payload: updated });
    } catch (e) { console.error(e); }
  }

  // ─── Saving actions ───
  async function handleCreateSaving() {
    if (!savingForm.name || !savingForm.target) return;
    try {
      await api.createSaving({
        name: savingForm.name,
        target: parseFloat(savingForm.target),
      });
      const updated = await api.getSavings();
      dispatch({ type: 'SET_SAVINGS', payload: updated });
      setShowSavingModal(false);
      setSavingForm({ name: '', target: '' });
    } catch (e) { console.error(e); }
  }

  async function handleDeleteSaving(id: number) {
    try {
      await api.deleteSaving(id);
      const updated = await api.getSavings();
      dispatch({ type: 'SET_SAVINGS', payload: updated });
    } catch (e) { console.error(e); }
  }

  async function handleTopUpSaving(id: number) {
    const saving = state.savings.find(s => s.id === id);
    if (!saving) return;
    const amount = prompt('Сумма пополнения:');
    if (!amount) return;
    const newCurrent = saving.current + parseFloat(amount);
    try {
      await api.updateSaving(id, { current: newCurrent });
      const updated = await api.getSavings();
      dispatch({ type: 'SET_SAVINGS', payload: updated });
    } catch (e) { console.error(e); }
  }

  // ─── Investment actions ───
  async function handleCreateInvestment() {
    if (!investForm.name || !investForm.value) return;
    const typeInfo = INVESTMENT_TYPES.find(t => t.value === investForm.type) ?? INVESTMENT_TYPES[5];
    try {
      await api.createInvestment({
        name: investForm.name,
        type: investForm.type,
        type_label: typeInfo.label,
        value: parseFloat(investForm.value),
        purchase_price: parseFloat(investForm.purchase_price) || parseFloat(investForm.value),
        quantity: investForm.quantity ? parseFloat(investForm.quantity) : undefined,
      });
      const updated = await api.getInvestments();
      dispatch({ type: 'SET_INVESTMENTS', payload: updated });
      setShowInvestModal(false);
      setInvestForm({ name: '', type: 'stocks', value: '', purchase_price: '', quantity: '' });
    } catch (e) { console.error(e); }
  }

  async function handleDeleteInvestment(id: number) {
    try {
      await api.deleteInvestment(id);
      const updated = await api.getInvestments();
      dispatch({ type: 'SET_INVESTMENTS', payload: updated });
    } catch (e) { console.error(e); }
  }

  return (
    <div className="finances-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Финансы</h1>
          <p className="page-subtitle">Кредиты, накопления и инвестиции</p>
        </div>
      </div>

      <div className="fin-tabs">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} className={`fin-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'loans' && (
        <div className="fin-content">
          <div className="loans-list">
            {state.loans.map(loan => {
              const remaining = loan.total_amount - loan.paid_amount;
              const pct = Math.round((loan.paid_amount / loan.total_amount) * 100);
              const statusColor = pct < 30 ? 'var(--danger)' : pct < 60 ? 'var(--warning)' : 'var(--success)';
              return (
                <div key={loan.id} className="loan-card">
                  <div className="loan-card-header">
                    <div className="loan-info">
                      <span className="loan-name">{loan.name}</span>
                      <span className="loan-rate">Ставка {loan.interest_rate}%</span>
                    </div>
                    <div className="loan-circle" style={{ '--pct': `${pct * 3.6}deg`, '--color': statusColor } as React.CSSProperties}>
                      <span className="loan-circle-text">{pct}%</span>
                    </div>
                    <span className="loan-remaining">{formatMoney(remaining, sym)}</span>
                  </div>
                  <div className="loan-progress">
                    <div className="loan-progress-bar" style={{ width: `${pct}%`, background: statusColor }} />
                  </div>
                  <div className="loan-details">
                    <span>Погашено {formatMoney(loan.paid_amount, sym)} ({pct}%)</span>
                    <span>Всего {formatMoney(loan.total_amount, sym)}</span>
                  </div>
                  <div className="loan-meta">Погашение {formatMoney(loan.monthly_payment, sym)}/мес</div>
                  <div className="loan-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => handlePayLoan(loan.id)}>Оплатить</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteLoan(loan.id)}>Удалить</button>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="btn btn-primary" onClick={() => setShowLoanModal(true)}>
            <Plus size={16} /> Добавить кредит
          </button>
        </div>
      )}

      {tab === 'savings' && (
        <div className="fin-content">
          <div className="savings-list">
            {state.savings.map(goal => {
              const pct = Math.round((goal.current / goal.target) * 100);
              return (
                <div key={goal.id} className="saving-card">
                  <div className="saving-header">
                    <span className="saving-name">{goal.name}</span>
                    <span className="saving-pct" style={{ color: pct >= 100 ? 'var(--success)' : 'var(--accent)' }}>{pct}%</span>
                  </div>
                  <div className="saving-amounts">
                    <span>{formatMoney(goal.current, sym)} из {formatMoney(goal.target, sym)}</span>
                    <span>{formatMoney(goal.target - goal.current, sym)} осталось</span>
                  </div>
                  <div className="saving-progress">
                    <div className="saving-progress-bar" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="saving-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => handleTopUpSaving(goal.id)}>Пополнить</button>
                    <button className="ops-delete" onClick={() => handleDeleteSaving(goal.id)}><X size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="btn btn-primary" onClick={() => setShowSavingModal(true)}>
            <Plus size={16} /> Добавить цель
          </button>
        </div>
      )}

      {tab === 'investments' && (
        <div className="fin-content">
          <div className="invest-grid">
            {state.investments.map(inv => (
              <div key={inv.id} className="invest-card">
                <div className="invest-header">
                  <div>
                    <span className="invest-name">{inv.name}</span>
                    <span className="invest-type">{inv.type_label}</span>
                  </div>
                </div>
                <span className="invest-value">{formatMoney(inv.value, sym)}</span>
                <span className={`invest-growth ${inv.growth >= 0 ? 'positive' : 'negative'}`}>
                  {inv.growth >= 0 ? '+' : ''}{inv.growth}%
                </span>
                <div className="invest-actions">
                  <button className="ops-delete" onClick={() => handleDeleteInvestment(inv.id)}><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setShowInvestModal(true)}>
            <Plus size={16} /> Добавить актив
          </button>
        </div>
      )}

      {/* ─── Loan Modal ─── */}
      {showLoanModal && (
        <div className="modal-overlay" onClick={() => setShowLoanModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Добавить кредит</h2>
              <button className="modal-close" onClick={() => setShowLoanModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Название</label><input value={loanForm.name} onChange={e => setLoanForm({...loanForm, name: e.target.value})} placeholder="Ипотека" /></div>
              <div className="form-group"><label>Сумма кредита</label><input type="number" value={loanForm.total_amount} onChange={e => setLoanForm({...loanForm, total_amount: e.target.value})} placeholder="1000000" /></div>
              <div className="form-group"><label>Ежемесячный платёж</label><input type="number" value={loanForm.monthly_payment} onChange={e => setLoanForm({...loanForm, monthly_payment: e.target.value})} placeholder="25000" /></div>
              <div className="form-group"><label>Ставка, %</label><input type="number" value={loanForm.interest_rate} onChange={e => setLoanForm({...loanForm, interest_rate: e.target.value})} placeholder="12" /></div>
              <div className="form-group"><label>Начало</label><input type="date" value={loanForm.start_date} onChange={e => setLoanForm({...loanForm, start_date: e.target.value})} /></div>
              <div className="form-group"><label>Окончание</label><input type="date" value={loanForm.end_date} onChange={e => setLoanForm({...loanForm, end_date: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowLoanModal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={handleCreateLoan}>Добавить</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Saving Modal ─── */}
      {showSavingModal && (
        <div className="modal-overlay" onClick={() => setShowSavingModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Добавить цель</h2>
              <button className="modal-close" onClick={() => setShowSavingModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Название</label><input value={savingForm.name} onChange={e => setSavingForm({...savingForm, name: e.target.value})} placeholder="Отпуск" /></div>
              <div className="form-group"><label>Целевая сумма</label><input type="number" value={savingForm.target} onChange={e => setSavingForm({...savingForm, target: e.target.value})} placeholder="100000" /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowSavingModal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={handleCreateSaving}>Добавить</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Investment Modal ─── */}
      {showInvestModal && (
        <div className="modal-overlay" onClick={() => setShowInvestModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Добавить актив</h2>
              <button className="modal-close" onClick={() => setShowInvestModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Название</label><input value={investForm.name} onChange={e => setInvestForm({...investForm, name: e.target.value})} placeholder="Сбербанк" /></div>
              <div className="form-group">
                <label>Тип</label>
                <select value={investForm.type} onChange={e => setInvestForm({...investForm, type: e.target.value})}>
                  {INVESTMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Текущая стоимость</label><input type="number" value={investForm.value} onChange={e => setInvestForm({...investForm, value: e.target.value})} placeholder="50000" /></div>
              <div className="form-group"><label>Цена покупки</label><input type="number" value={investForm.purchase_price} onChange={e => setInvestForm({...investForm, purchase_price: e.target.value})} placeholder="45000" /></div>
              <div className="form-group"><label>Количество</label><input type="number" value={investForm.quantity} onChange={e => setInvestForm({...investForm, quantity: e.target.value})} placeholder="10" /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowInvestModal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={handleCreateInvestment}>Добавить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
