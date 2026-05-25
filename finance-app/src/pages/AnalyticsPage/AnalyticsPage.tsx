import { useApp, formatMoney } from '../../store/AppContext';
import './AnalyticsPage.css';

const EXPENSE_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#6b7280'];

export default function AnalyticsPage() {
  const { state } = useApp();
  const sym = state.settings.currencySymbol;

  const categories = state.budgetTable?.categories ?? [];

  // Budget-based totals (sum of all 52 weeks for first week as representative)
  const budgetIncome = categories.filter(c => c.type === 'income').reduce((s, c) => s + (c.monthly[0] || 0), 0);
  const budgetExpense = categories.filter(c => c.type === 'expense').reduce((s, c) => s + (c.monthly[0] || 0), 0);

  // Transaction-based totals
  const txIncome = state.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const txExpense = state.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const totalIncome = budgetIncome + txIncome;
  const totalExpense = budgetExpense + txExpense;
  const profit = totalIncome - totalExpense;

  // Expense breakdown by budget categories
  const expenseCats = categories.filter(c => c.type === 'expense');
  const totalExpBudget = expenseCats.reduce((s, c) => s + (c.monthly[0] || 0), 0);

  // Add transaction categories not in budget
  const txExpenseByCategory: Record<string, number> = {};
  state.transactions.filter(t => t.type === 'expense').forEach(t => {
    txExpenseByCategory[t.category] = (txExpenseByCategory[t.category] || 0) + t.amount;
  });

  const totalExpWithTx = totalExpBudget + txExpense;

  const expenseBreakdown = [
    ...expenseCats.map((c, i) => {
      const amount = (c.monthly[0] || 0) + (txExpenseByCategory[c.name] || 0);
      // Remove from txExpenseByCategory since it's already counted
      delete txExpenseByCategory[c.name];
      const pct = totalExpWithTx > 0 ? Math.round((amount / totalExpWithTx) * 100) : 0;
      return { name: c.name, amount, pct, color: EXPENSE_COLORS[i % EXPENSE_COLORS.length] };
    }),
    // Add remaining tx-only categories
    ...Object.entries(txExpenseByCategory).map(([name, amount], i) => {
      const pct = totalExpWithTx > 0 ? Math.round((amount / totalExpWithTx) * 100) : 0;
      return { name, amount, pct, color: EXPENSE_COLORS[(expenseCats.length + i) % EXPENSE_COLORS.length] };
    }),
  ].sort((a, b) => b.amount - a.amount);

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Аналитика</h1>
          <p className="page-subtitle">Показатели</p>
        </div>
      </div>

      <div className="analytics-cards">
        <div className="analytics-card analytics-card--income">
          <span className="analytics-card-label">ОБЩИЙ ДОХОД</span>
          <span className="analytics-card-value income">{formatMoney(totalIncome, sym)}</span>
        </div>
        <div className="analytics-card analytics-card--expense">
          <span className="analytics-card-label">ОБЩИЕ РАСХОДЫ</span>
          <span className="analytics-card-value expense">{formatMoney(totalExpense, sym)}</span>
        </div>
        <div className="analytics-card analytics-card--profit">
          <span className="analytics-card-label">ПРОФИЦИТ</span>
          <span className="analytics-card-value profit">{formatMoney(profit, sym)}</span>
        </div>
      </div>

      <div className="analytics-breakdown">
        <h3 className="analytics-section-title">РАСХОДЫ ПО КАТЕГОРИЯМ</h3>
        <div className="breakdown-list">
          {expenseBreakdown.map(item => (
            <div key={item.name} className="breakdown-item">
              <div className="breakdown-dot" style={{ background: item.color }} />
              <span className="breakdown-name">{item.name}</span>
              <span className="breakdown-amount">{formatMoney(item.amount, sym)}</span>
              <span className="breakdown-pct">{item.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
