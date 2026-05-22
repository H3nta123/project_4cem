/**
 * ФинансПро — API client v2.0.0
 * All REST calls to the FastAPI backend
 */

// In production the frontend is served by the same FastAPI server,
// so we use a relative URL. In dev mode (Vite), we proxy to the backend.
const API_BASE = window.location.port === '5173'
  ? 'http://localhost:8000/api'
  : '/api';

// ─── Generic fetch helper ────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}


// ─── Types (match backend schemas) ───────────────────────

export interface CategoryResponse {
  id: number;
  name: string;
  type: 'income' | 'expense';
  monthly: number[];
  sort_order: number;
  parent_id: number | null;
  created_at: string;
}

export interface BudgetTableResponse {
  categories: CategoryResponse[];
  monthly_income: number[];
  monthly_expense: number[];
  monthly_balance: number[];
}

export interface ScenarioResponse {
  id: number;
  name: string;
  type: string;
  income_modifier: number;
  expense_modifier: number;
  extra_expense: number;
  description: string | null;
  created_at: string;
}

export interface TransactionResponse {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  created_at: string;
}

export interface InvestmentResponse {
  id: number;
  name: string;
  type: string;
  type_label: string;
  value: number;
  purchase_price: number;
  growth: number;
  quantity: number | null;
  created_at: string;
}

export interface SavingsGoalResponse {
  id: number;
  name: string;
  current: number;
  target: number;
  created_at: string;
}

export interface LoanResponse {
  id: number;
  name: string;
  total_amount: number;
  paid_amount: number;
  monthly_payment: number;
  interest_rate: number;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'overdue' | 'completed';
  created_at: string;
}

export interface SettingsResponse {
  theme: 'dark' | 'light';
  currency: string;
  currencySymbol: string;
  notifyPayments: boolean;
  notifyBudgetExceed: boolean;
}

export interface AnalyticsSummaryResponse {
  total_income: number;
  total_expense: number;
  profit: number;
  expense_breakdown: { name: string; amount: number; percentage: number }[];
  income_breakdown: { name: string; amount: number; percentage: number }[];
}

export interface ImportResponse {
  imported: number;
  skipped: number;
  errors: string[];
}


// ─── Categories ──────────────────────────────────────────

export async function getCategories(): Promise<CategoryResponse[]> {
  return request('/categories');
}

export async function createCategory(data: {
  name: string;
  type: 'income' | 'expense';
  monthly?: number[];
  sort_order?: number;
}): Promise<CategoryResponse> {
  return request('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCategory(
  id: number,
  data: { name?: string; type?: string; monthly?: number[]; sort_order?: number },
): Promise<CategoryResponse> {
  return request(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: number): Promise<void> {
  return request(`/categories/${id}`, { method: 'DELETE' });
}


// ─── Budget table ────────────────────────────────────────

export async function getBudgetTable(): Promise<BudgetTableResponse> {
  return request('/budget');
}

export async function updateBudgetCell(
  categoryId: number,
  monthIndex: number,
  value: number,
): Promise<BudgetTableResponse> {
  return request('/budget/cell', {
    method: 'PUT',
    body: JSON.stringify({
      category_id: categoryId,
      month_index: monthIndex,
      value,
    }),
  });
}

export async function updateCategoryMonthly(
  categoryId: number,
  monthly: number[],
): Promise<CategoryResponse> {
  return request(`/budget/values/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify({ monthly }),
  });
}


// ─── Scenarios ───────────────────────────────────────────

export async function getScenarios(): Promise<ScenarioResponse[]> {
  return request('/scenarios');
}

export async function createScenario(data: {
  name: string;
  income_modifier: number;
  expense_modifier: number;
  extra_expense?: number;
  description?: string;
}): Promise<ScenarioResponse> {
  return request('/scenarios', {
    method: 'POST',
    body: JSON.stringify({ ...data, type: 'custom' }),
  });
}

export async function deleteScenario(id: number): Promise<void> {
  return request(`/scenarios/${id}`, { method: 'DELETE' });
}

export async function getBudgetWithScenario(scenarioId: number): Promise<BudgetTableResponse> {
  return request(`/budget/scenario/${scenarioId}`);
}


// ─── Transactions ────────────────────────────────────────

export async function getTransactions(type?: 'income' | 'expense'): Promise<TransactionResponse[]> {
  const query = type ? `?type=${type}` : '';
  return request(`/transactions${query}`);
}

export async function createTransaction(data: {
  date: string;
  category: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}): Promise<TransactionResponse> {
  return request('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteTransaction(id: number): Promise<void> {
  return request(`/transactions/${id}`, { method: 'DELETE' });
}


// ─── Investments ─────────────────────────────────────────

export async function getInvestments(): Promise<InvestmentResponse[]> {
  return request('/investments');
}

export async function createInvestment(data: {
  name: string;
  type: string;
  type_label: string;
  value: number;
  purchase_price: number;
  growth?: number;
  quantity?: number;
}): Promise<InvestmentResponse> {
  return request('/investments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateInvestment(
  id: number,
  data: { name?: string; value?: number; purchase_price?: number; growth?: number; quantity?: number },
): Promise<InvestmentResponse> {
  return request(`/investments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteInvestment(id: number): Promise<void> {
  return request(`/investments/${id}`, { method: 'DELETE' });
}


// ─── Savings ─────────────────────────────────────────────

export async function getSavings(): Promise<SavingsGoalResponse[]> {
  return request('/savings');
}

export async function createSaving(data: {
  name: string;
  target: number;
  current?: number;
}): Promise<SavingsGoalResponse> {
  return request('/savings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSaving(
  id: number,
  data: { name?: string; current?: number; target?: number },
): Promise<SavingsGoalResponse> {
  return request(`/savings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSaving(id: number): Promise<void> {
  return request(`/savings/${id}`, { method: 'DELETE' });
}


// ─── Loans ───────────────────────────────────────────────

export async function getLoans(): Promise<LoanResponse[]> {
  return request('/loans');
}

export async function createLoan(data: {
  name: string;
  total_amount: number;
  paid_amount?: number;
  monthly_payment?: number;
  interest_rate?: number;
  start_date?: string;
  end_date?: string;
}): Promise<LoanResponse> {
  return request('/loans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateLoan(
  id: number,
  data: { name?: string; paid_amount?: number; monthly_payment?: number; status?: string },
): Promise<LoanResponse> {
  return request(`/loans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteLoan(id: number): Promise<void> {
  return request(`/loans/${id}`, { method: 'DELETE' });
}


// ─── Settings ────────────────────────────────────────────

export async function getSettings(): Promise<SettingsResponse> {
  return request('/settings');
}

export async function updateSettings(data: Partial<SettingsResponse>): Promise<SettingsResponse> {
  return request('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}


// ─── Analytics ───────────────────────────────────────────

export async function getAnalyticsSummary(): Promise<AnalyticsSummaryResponse> {
  return request('/analytics/summary');
}


// ─── Import ──────────────────────────────────────────────

export async function importFile(file: File): Promise<ImportResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/import/csv`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}


// ─── Reset ───────────────────────────────────────────────

export async function resetData(): Promise<void> {
  return request('/reset', { method: 'POST' });
}


// ─── Export ──────────────────────────────────────────────

export function getExportCsvUrl(): string {
  return `${API_BASE}/export/csv`;
}
