import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppSettings } from '../types';
import type {
  BudgetTableResponse,
  TransactionResponse,
  SavingsGoalResponse,
  LoanResponse,
} from '../api/api';
import * as api from '../api/api';

/* ─── State ──────────────────────────────────────────── */

interface AppState {
  /* Budget — loaded from backend */
  budgetTable: BudgetTableResponse | null;

  /* Data from backend */
  transactions: TransactionResponse[];
  savings: SavingsGoalResponse[];
  loans: LoanResponse[];
  settings: AppSettings;

  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_BUDGET_TABLE'; payload: BudgetTableResponse }
  | { type: 'SET_TRANSACTIONS'; payload: TransactionResponse[] }
  | { type: 'SET_SAVINGS'; payload: SavingsGoalResponse[] }
  | { type: 'SET_LOANS'; payload: LoanResponse[] }
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> };

const defaultSettings: AppSettings = {
  theme: 'dark', currency: 'RUB', currencySymbol: '₽',
  notifyPayments: true, notifyBudgetExceed: true,
  budgetStartDate: '', profitAdjustment: 0,
};

const initialState: AppState = {
  budgetTable: null,
  transactions: [],
  savings: [],
  loans: [],
  settings: defaultSettings,
  loading: true,
  error: null,
};

/* ─── Reducer ────────────────────────────────────────── */

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_BUDGET_TABLE':
      return { ...state, budgetTable: action.payload, loading: false };
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload };
    case 'SET_SAVINGS':
      return { ...state, savings: action.payload };
    case 'SET_LOANS':
      return { ...state, loans: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    default:
      return state;
  }
}

/* ─── Context ────────────────────────────────────────── */

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  /* Load all data from backend on mount (with retry for Electron startup) */
  useEffect(() => {
    async function loadDataWithRetry(retries = 10, delay = 1000) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const [budgetTable, transactions, savings, loans, settings] = await Promise.all([
            api.getBudgetTable(),
            api.getTransactions(),
            api.getSavings(),
            api.getLoans(),
            api.getSettings(),
          ]);
          dispatch({ type: 'SET_BUDGET_TABLE', payload: budgetTable });
          dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
          dispatch({ type: 'SET_SAVINGS', payload: savings });
          dispatch({ type: 'SET_LOANS', payload: loans });
          dispatch({ type: 'SET_SETTINGS', payload: settings });
          return; // Success — exit retry loop
        } catch (e) {
          console.warn(`Load attempt ${attempt}/${retries} failed:`, e);
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, delay));
          } else {
            console.error('Failed to load from backend after all retries:', e);
            dispatch({ type: 'SET_ERROR', payload: 'Не удалось подключиться к серверу' });
          }
        }
      }
    }
    loadDataWithRetry();
  }, []);

  /* Theme */
  useEffect(() => {
    if (!state.loading) {
      document.documentElement.setAttribute('data-theme', state.settings.theme);
    }
  }, [state.settings.theme, state.loading]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function formatMoney(amount: number, symbol = '₽'): string {
  return amount.toLocaleString('ru-RU') + ' ' + symbol;
}
