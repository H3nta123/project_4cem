import { useState } from 'react';
import { useApp, formatMoney } from '../../store/AppContext';
import { Plus, X, CreditCard, PiggyBank } from 'lucide-react';
import * as api from '../../api/api';
import type { FinanceTab } from '../../types';
import './FinancesPage.css';

export default function FinancesPage() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<FinanceTab>('loans');
  const sym = state.settings.currencySymbol;



  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showSavingModal, setShowSavingModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<number | null>(null);
  const [showTopUpModal, setShowTopUpModal] = useState<number | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState<number | null>(null);

  // ─── Forms ───
  const [loanForm, setLoanForm] = useState({ name: '', total_amount: '', payment_type: 'monthly', monthly_payment: '' });
  const [savingForm, setSavingForm] = useState({ name: '', target: '' });
  const [payForm, setPayForm] = useState({ amount: '' });
  const [topUpForm, setTopUpForm] = useState({ amount: '' });
  const [withdrawForm, setWithdrawForm] = useState({ amount: '' });

  // ─── Calculate Available Profit ───
  let availableProfit = 0;
  let currentWeekIndex = 0;
  if (state.budgetTable && state.budgetTable.weekly_dates?.length > 0) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = 0; i < state.budgetTable.weekly_dates.length; i++) {
      const d = new Date(state.budgetTable.weekly_dates[i]);
      if (now >= d) {
        currentWeekIndex = i;
      } else {
        break;
      }
    }
    const currentAccumulatedWeeks = Math.min(currentWeekIndex + 1, 52);
    const profitAdjustment = state.settings.profitAdjustment || 0;
    availableProfit = state.budgetTable.monthly_fact_balance.slice(0, currentAccumulatedWeeks).reduce((sum, v) => sum + v, 0) + profitAdjustment;
  }

  const tabs: { key: FinanceTab; label: string; icon: typeof CreditCard }[] = [
    { key: 'loans', label: 'Кредиты', icon: CreditCard },
    { key: 'savings', label: 'Накопления', icon: PiggyBank },
  ];

  // ─── Loan actions ───
  async function handleCreateLoan() {
    if (!loanForm.name || !loanForm.total_amount) return;
    try {
      await api.createLoan({
        name: loanForm.name,
        total_amount: parseFloat(loanForm.total_amount),
        monthly_payment: parseFloat(loanForm.monthly_payment) || 0,
        payment_type: loanForm.payment_type as 'weekly' | 'monthly',
      });
      const updated = await api.getLoans();
      dispatch({ type: 'SET_LOANS', payload: updated });
      const budgetUpdated = await api.getBudgetTable();
      dispatch({ type: 'SET_BUDGET_TABLE', payload: budgetUpdated });
      setShowLoanModal(false);
      setLoanForm({ name: '', total_amount: '', payment_type: 'monthly', monthly_payment: '' });
    } catch (e) { console.error(e); }
  }

  async function handleDeleteLoan(id: number) {
    try {
      await api.deleteLoan(id);
      const updated = await api.getLoans();
      dispatch({ type: 'SET_LOANS', payload: updated });
      const budgetUpdated = await api.getBudgetTable();
      dispatch({ type: 'SET_BUDGET_TABLE', payload: budgetUpdated });
    } catch (e) { console.error(e); }
  }

  function openPayModal(loanId: number) {
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan) return;
    setPayForm({ amount: loan.monthly_payment.toString() });
    setShowPayModal(loanId);
  }

  async function submitPayLoan() {
    if (!showPayModal) return;
    const amount = parseFloat(payForm.amount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      await api.payLoan(showPayModal, amount);
      const updated = await api.getLoans();
      dispatch({ type: 'SET_LOANS', payload: updated });
      // We should also refresh the budget table to show the updated Fact!
      const budgetUpdated = await api.getBudgetTable();
      dispatch({ type: 'SET_BUDGET_TABLE', payload: budgetUpdated });
      setShowPayModal(null);
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
      const budgetUpdated = await api.getBudgetTable();
      dispatch({ type: 'SET_BUDGET_TABLE', payload: budgetUpdated });
    } catch (e) { console.error(e); }
  }

  function openTopUpModal(savingId: number) {
    const saving = state.savings.find(s => s.id === savingId);
    if (!saving) return;
    setTopUpForm({ amount: '' });
    setShowTopUpModal(savingId);
  }

  async function submitTopUpSaving() {
    if (!showTopUpModal) return;
    const amount = parseFloat(topUpForm.amount);
    if (isNaN(amount) || amount <= 0) return;
    
    if (amount > availableProfit) {
      alert(`Сумма пополнения (${formatMoney(amount, sym)}) превышает доступную прибыль (${formatMoney(availableProfit, sym)})!`);
      return;
    }

    try {
      await api.topupSaving(showTopUpModal, amount);
      const updated = await api.getSavings();
      dispatch({ type: 'SET_SAVINGS', payload: updated });
      const budgetUpdated = await api.getBudgetTable();
      dispatch({ type: 'SET_BUDGET_TABLE', payload: budgetUpdated });
      setShowTopUpModal(null);
    } catch (e) { console.error(e); }
  }

  function openWithdrawModal(savingId: number) {
    const saving = state.savings.find(s => s.id === savingId);
    if (!saving) return;
    setWithdrawForm({ amount: '' });
    setShowWithdrawModal(savingId);
  }

  async function submitWithdrawSaving() {
    if (!showWithdrawModal) return;
    const amount = parseFloat(withdrawForm.amount);
    if (isNaN(amount) || amount <= 0) return;

    const saving = state.savings.find(s => s.id === showWithdrawModal);
    if (!saving || amount > saving.current) {
      alert(`Сумма изъятия (${formatMoney(amount, sym)}) превышает баланс копилки!`);
      return;
    }

    try {
      await api.withdrawSaving(showWithdrawModal, amount);
      const updated = await api.getSavings();
      dispatch({ type: 'SET_SAVINGS', payload: updated });
      const budgetUpdated = await api.getBudgetTable();
      dispatch({ type: 'SET_BUDGET_TABLE', payload: budgetUpdated });
      setShowWithdrawModal(null);
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
                  <div className="loan-meta">Платёж: {formatMoney(loan.monthly_payment, sym)} ({loan.payment_type === 'weekly' ? 'в неделю' : 'в месяц'})</div>
                  <div className="loan-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => openPayModal(loan.id)}>Оплатить</button>
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
                    <button className="btn btn-primary btn-sm" onClick={() => openTopUpModal(goal.id)}>Пополнить</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openWithdrawModal(goal.id)}>Изъять</button>
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



      {/* ─── Loan Modal ─── */}
      {showLoanModal && (
        <div className="modal-overlay" onClick={() => setShowLoanModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Добавить кредит</h2>
              <button className="modal-close" onClick={() => setShowLoanModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Название</label><input value={loanForm.name} onChange={e => setLoanForm({ ...loanForm, name: e.target.value })} placeholder="Ипотека" /></div>
              <div className="form-group"><label>Сумма кредита</label><input type="number" value={loanForm.total_amount} onChange={e => setLoanForm({ ...loanForm, total_amount: e.target.value })} placeholder="1000000" /></div>
              <div className="form-group">
                <label>Периодичность платежа</label>
                <select value={loanForm.payment_type} onChange={e => setLoanForm({ ...loanForm, payment_type: e.target.value })}>
                  <option value="weekly">Еженедельно</option>
                  <option value="monthly">Ежемесячно</option>
                </select>
              </div>
              <div className="form-group"><label>Сумма платежа ({sym})</label><input type="number" value={loanForm.monthly_payment} onChange={e => setLoanForm({ ...loanForm, monthly_payment: e.target.value })} placeholder="25000" /></div>
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
              <div className="form-group"><label>Название</label><input value={savingForm.name} onChange={e => setSavingForm({ ...savingForm, name: e.target.value })} placeholder="Отпуск" /></div>
              <div className="form-group"><label>Сумма цели ({sym})</label><input type="number" value={savingForm.target} onChange={e => setSavingForm({ ...savingForm, target: e.target.value })} placeholder="100000" /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowSavingModal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={handleCreateSaving}>Добавить</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Top Up Saving Modal ─── */}
      {showTopUpModal !== null && (
        <div className="modal-overlay" onClick={() => setShowTopUpModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Пополнить копилку</h2>
              <button className="modal-close" onClick={() => setShowTopUpModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Доступно из накопленной прибыли: <strong>{formatMoney(availableProfit, sym)}</strong>
              </p>
              <div className="form-group">
                <label>СУММА ({sym})</label>
                <input type="number" autoFocus value={topUpForm.amount} onChange={e => setTopUpForm({ ...topUpForm, amount: e.target.value })} placeholder="Сумма" />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Эта сумма пополнит вашу цель и автоматически вычтется из «Факта» текущей недели бюджета.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowTopUpModal(null)}>Отмена</button>
              <button className="btn btn-primary" onClick={submitTopUpSaving}>Пополнить</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Withdraw Saving Modal ─── */}
      {showWithdrawModal !== null && (
        <div className="modal-overlay" onClick={() => setShowWithdrawModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Изъять из копилки</h2>
              <button className="modal-close" onClick={() => setShowWithdrawModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>СУММА ИЗЪЯТИЯ ({sym})</label>
                <input type="number" autoFocus value={withdrawForm.amount} onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} placeholder="Сумма" />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Эта сумма будет изъята из копилки и автоматически добавлена в прибыль бюджета в текущей неделе.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowWithdrawModal(null)}>Отмена</button>
              <button className="btn btn-primary" onClick={submitWithdrawSaving}>Изъять</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Pay Loan Modal ─── */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Внести платёж</h2>
              <button className="modal-close" onClick={() => setShowPayModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Сумма ({sym})</label>
                <input 
                  type="number" 
                  value={payForm.amount} 
                  onChange={e => setPayForm({ ...payForm, amount: e.target.value })} 
                  placeholder="Введите сумму..." 
                  autoFocus
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Эта сумма будет добавлена к оплаченной части кредита и автоматически запишется в «Факт» текущей недели бюджета.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowPayModal(null)}>Отмена</button>
              <button className="btn btn-primary" onClick={submitPayLoan}>Оплатить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
