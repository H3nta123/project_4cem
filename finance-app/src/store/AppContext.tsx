import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppSettings } from '../types';
import type {
  BudgetTableResponse,
  ScenarioResponse,
  TransactionResponse,
  InvestmentResponse,
  SavingsGoalResponse,
  LoanResponse,
} from '../api/api';
import * as api from '../api/api';

/* ─── State ──────────────────────────────────────────── */

interface AppState {
  /* Budget — loaded from backend */
  budgetTable: BudgetTableResponse | null;
  scenarios: ScenarioResponse[];
  activeScenarioId: number | null;

  /* Data from backend */
  transactions: TransactionResponse[];
  investments: InvestmentResponse[];
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
  | { type: 'SET_SCENARIOS'; payload: ScenarioResponse[] }
  | { type: 'SET_ACTIVE_SCENARIO'; payload: number | null }
  | { type: 'SET_TRANSACTIONS'; payload: TransactionResponse[] }
  | { type: 'SET_INVESTMENTS'; payload: InvestmentResponse[] }
  | { type: 'SET_SAVINGS'; payload: SavingsGoalResponse[] }
  | { type: 'SET_LOANS'; payload: LoanResponse[] }
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> };

const defaultSettings: AppSettings = {
  theme: 'dark', currency: 'RUB', currencySymbol: '₽',
  notifyPayments: true, notifyBudgetExceed: true,
};

const initialState: AppState = {
  budgetTable: null,
  scenarios: [],
  activeScenarioId: null,
  transactions: [],
  investments: [],
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
    case 'SET_SCENARIOS':
      return { ...state, scenarios: action.payload };
    case 'SET_ACTIVE_SCENARIO':
      return { ...state, activeScenarioId: action.payload };
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload };
    case 'SET_INVESTMENTS':
      return { ...state, investments: action.payload };
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

  /* Load all data from backend on mount */
  useEffect(() => {
    async function loadData() {
      try {
        const [budgetTable, scenarios, transactions, investments, savings, loans, settings] = await Promise.all([
          api.getBudgetTable(),
          api.getScenarios(),
          api.getTransactions(),
          api.getInvestments(),
          api.getSavings(),
          api.getLoans(),
          api.getSettings(),
        ]);
        dispatch({ type: 'SET_BUDGET_TABLE', payload: budgetTable });
        dispatch({ type: 'SET_SCENARIOS', payload: scenarios });
        dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
        dispatch({ type: 'SET_INVESTMENTS', payload: investments });
        dispatch({ type: 'SET_SAVINGS', payload: savings });
        dispatch({ type: 'SET_LOANS', payload: loans });
        dispatch({ type: 'SET_SETTINGS', payload: settings });
      } catch (e) {
        console.error('Failed to load from backend:', e);
        dispatch({ type: 'SET_ERROR', payload: 'Не удалось подключиться к серверу' });
      }
    }
    loadData();
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
