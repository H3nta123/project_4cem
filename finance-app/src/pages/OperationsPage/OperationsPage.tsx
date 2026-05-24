import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useApp, formatMoney } from '../../store/AppContext';
import * as api from '../../api/api';
import type { OperationsFilter } from '../../types';
import './OperationsPage.css';

export default function OperationsPage() {
  const { state, dispatch } = useApp();
  const [filter, setFilter] = useState<OperationsFilter>('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: '', description: '', amount: '', type: 'income' as 'income'|'expense', date: new Date().toISOString().slice(0, 10) });
  const sym = state.settings.currencySymbol;

  const filtered = state.transactions.filter(t => filter === 'all' ? true : t.type === filter);

  async function handleAdd() {
    if (!form.category || !form.amount) return;
    try {
      await api.createTransaction({
        date: form.date,
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        type: form.type,
      });
      const updated = await api.getTransactions();
      dispatch({ type: 'SET_TRANSACTIONS', payload: updated });
      setShowModal(false);
      setForm({ category: '', description: '', amount: '', type: 'income', date: new Date().toISOString().slice(0, 10) });
    } catch (e) {
      console.error('Failed to create transaction:', e);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteTransaction(id);
      const updated = await api.getTransactions();
      dispatch({ type: 'SET_TRANSACTIONS', payload: updated });
    } catch (e) {
      console.error('Failed to delete transaction:', e);
    }
  }

  return (
    <div className="operations-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Операции</h1>
          <p className="page-subtitle">Все транзакции</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Добавить
        </button>
      </div>

      <div className="ops-filter-tabs">
        {(['all','income','expense'] as OperationsFilter[]).map(f => (
          <button key={f} className={`ops-filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Все' : f === 'income' ? 'Доходы' : 'Расходы'}
          </button>
        ))}
      </div>

      <div className="ops-table-wrapper">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Категория</th>
              <th>Описание</th>
              <th className="ops-th-amount">Сумма</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="ops-empty">Нет транзакций</td></tr>
            )}
            {filtered.map(tx => (
              <tr key={tx.id}>
                <td className="ops-date">{new Date(tx.date).toLocaleDateString('ru-RU')}</td>
                <td>{tx.category}</td>
                <td className="ops-desc">{tx.description}</td>
                <td className={`ops-amount ${tx.type === 'income' ? 'positive' : 'negative'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount, sym)}
                </td>
                <td><button className="ops-delete" onClick={() => handleDelete(tx.id)}><X size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Добавить транзакцию</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Тип</label>
                <div className="ops-type-toggle">
                  <button className={`ops-type-btn ${form.type === 'income' ? 'active income' : ''}`} onClick={() => setForm({...form, type: 'income'})}>Доход</button>
                  <button className={`ops-type-btn ${form.type === 'expense' ? 'active expense' : ''}`} onClick={() => setForm({...form, type: 'expense'})}>Расход</button>
                </div>
              </div>
              <div className="form-group">
                <label>Дата</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Категория</label>
                <input placeholder="Например: Зарплата" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <input placeholder="Описание операции" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Сумма</label>
                <input type="number" placeholder="0" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={handleAdd}>Добавить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
