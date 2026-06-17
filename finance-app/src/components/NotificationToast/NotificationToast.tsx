import { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { Bell, X } from 'lucide-react';
import './NotificationToast.css';

export default function NotificationToast() {
  const { state } = useApp();
  const [notifications, setNotifications] = useState<{id: string, text: string, type: 'info' | 'warning'}[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (state.loading || !state.budgetTable) return;

    const newNotifs: {id: string, text: string, type: 'info' | 'warning'}[] = [];

    // Check 1: Need to enter fact data
    const { weekly_dates, categories } = state.budgetTable;
    if (weekly_dates && weekly_dates.length > 0) {
      let currentWeekIndex = 0;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      for (let i = 0; i < weekly_dates.length; i++) {
        const d = new Date(weekly_dates[i]);
        if (now >= d) currentWeekIndex = i;
        else break;
      }
      
      const weekStartDate = new Date(weekly_dates[currentWeekIndex]);
      const daysSinceStart = Math.floor((now.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // If it's the first 3 days of the week and all fact values are 0
      if (daysSinceStart >= 0 && daysSinceStart <= 3) {
        const allEmpty = categories.every(c => (c.monthly_fact[currentWeekIndex] || 0) === 0);
        if (allEmpty) {
          newNotifs.push({
            id: `fact-reminder-${currentWeekIndex}`,
            text: `Началась новая неделя ${currentWeekIndex + 1}! Не забудьте внести фактические данные в бюджет.`,
            type: 'info'
          });
        }
      }
    }

    // Check 2: Active loans payments
    const activeLoans = state.loans.filter(l => l.status !== 'completed' && l.monthly_payment > 0);
    if (activeLoans.length > 0) {
      const loanNames = activeLoans.map(l => l.name).join(', ');
      newNotifs.push({
        id: `loan-reminder-${activeLoans.map(l => l.id).join('-')}`,
        text: `Напоминание о платежах по кредитам: ${loanNames}.`,
        type: 'warning'
      });
    }

    // Filter out dismissed
    const visible = newNotifs.filter(n => !dismissed.has(n.id));
    setNotifications(visible);
  }, [state.loading, state.budgetTable, state.loans, dismissed]);

  if (notifications.length === 0) return null;

  return (
    <div className="notification-toast-container">
      {notifications.map(n => (
        <div key={n.id} className={`notification-toast ${n.type}`}>
          <div className="notification-icon">
            <Bell size={18} />
          </div>
          <div className="notification-content">
            {n.text}
          </div>
          <button 
            className="notification-close" 
            onClick={() => {
              setDismissed(prev => new Set(prev).add(n.id));
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
