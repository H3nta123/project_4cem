/* ============================================
   ФинансПро — TypeScript Interfaces
   ============================================ */

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string;          // ISO date string
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  type: TransactionType;
  createdAt: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  type: TransactionType;
  monthly: number[];     // 52 weeks
  parentId?: string;     // for subcategories
}

export interface BudgetData {
  year: number;
  categories: BudgetCategory[];
  mode: 'plan' | 'fact' | 'both';
}

export interface Investment {
  id: string;
  name: string;
  type: 'stocks' | 'bonds' | 'crypto' | 'fund' | 'metals' | 'other';
  typeLabel: string;     // human-readable: "Акции", "Облигации", etc.
  value: number;
  purchasePrice: number;
  growth: number;        // percentage
  quantity?: number;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  current: number;
  target: number;
  createdAt: string;
}

export interface Loan {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  monthlyPayment: number;
  interestRate: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'overdue' | 'completed';
  createdAt: string;
}

export type ScenarioType = 'base' | 'optimistic' | 'pessimistic' | 'aggressive' | 'custom';

export interface Scenario {
  id: string;
  name: string;
  type: ScenarioType;
  incomeModifier: number;   // multiplier, e.g. 1.1 for +10%
  expenseModifier: number;
  description?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  currency: string;
  currencySymbol: string;
  notifyPayments: boolean;
  notifyBudgetExceed: boolean;
  budgetStartDate: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  read: boolean;
  createdAt: string;
}

export type ActivePage =
  | 'budget'
  | 'operations'
  | 'analytics'
  | 'finances'
  | 'settings'
  | 'import'
  | 'whatif';

export type FinanceTab = 'loans' | 'savings' | 'investments';
export type OperationsFilter = 'all' | 'income' | 'expense';
