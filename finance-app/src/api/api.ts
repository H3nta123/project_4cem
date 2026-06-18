/**
 * ФинансПро — API client v2.1.0
 * All REST calls to the FastAPI backend
 */

// ─── Electron API bridge type ────────────────────────────
declare global {
  interface Window {
    electronAPI?: {
      getApiKey: () => string;
    };
  }
}

// Electron загружает из file:// — нужен полный URL бэкенда.
// Standalone (pywebview) и Vite dev — используют relative /api
//   (Vite проксирует через vite.config.ts, pywebview раздаёт с того же сервера).
const API_BASE = window.location.protocol === 'file:'
  ? 'http://127.0.0.1:8001/api'
  : '/api';

// ─── API Key (из Electron preload или пусто в dev) ───────
const API_KEY: string = window.electronAPI?.getApiKey?.() || '';


// ─── Generic fetch helper ────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
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
  monthly_fact: number[];
  sort_order: number;
  parent_id: number | null;
  created_at: string;
}

export interface BudgetTableResponse {
  categories: CategoryResponse[];
  monthly_income: number[];
  monthly_expense: number[];
  monthly_balance: number[];
  monthly_fact_income: number[];
  monthly_fact_expense: number[];
  monthly_fact_balance: number[];
  weekly_dates: string[];
  total_profit: number;
  weekly_remainder: number[];
  weekly_wallet_total: number[];
  weekly_cumulative_balance: number[];
  weekly_fact_remainder: number[];
  weekly_fact_wallet_total: number[];
  weekly_fact_cumulative_balance: number[];
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
  payment_type: 'weekly' | 'monthly';
  created_at: string;
}

export interface SettingsResponse {
  theme: 'dark' | 'light';
  currency: string;
  currencySymbol: string;
  notifyPayments: boolean;
  notifyBudgetExceed: boolean;
  budgetStartDate: string;
  profitAdjustment: number;
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
  data: { name?: string; type?: string; monthly?: number[]; monthly_fact?: number[]; sort_order?: number },
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

export async function updateBudgetFactCell(
  categoryId: number,
  monthIndex: number,
  value: number,
): Promise<BudgetTableResponse> {
  return request('/budget/fact/cell', {
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

export async function bulkUpdateBudget(data: {
  updates: { category_id: number; month_index: number; value: number }[];
}): Promise<BudgetTableResponse> {
  return request('/budget/bulk', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}


// ─── Autofill ────────────────────────────────────────────

export async function autofillBudget(data: {
  category_id: number;
  start_week: number;
  amount: number;
  period: 'weekly' | 'monthly';
  count: number;
  target: 'plan' | 'fact';
}): Promise<BudgetTableResponse> {
  return request('/budget/autofill', {
    method: 'PUT',
    body: JSON.stringify(data),
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

export async function applyScenario(scenarioId: number): Promise<BudgetTableResponse> {
  return request(`/scenarios/${scenarioId}/apply`, {
    method: 'POST',
  });
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

export async function updateSaving(id: number, data: { name?: string; current?: number; target?: number }): Promise<SavingsGoalResponse> {
  return request(`/savings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSaving(id: number): Promise<void> {
  return request(`/savings/${id}`, {
    method: 'DELETE',
  });
}

export async function topupSaving(id: number, amount: number): Promise<SavingsGoalResponse> {
  return request(`/savings/${id}/topup`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export async function withdrawSaving(id: number, amount: number): Promise<SavingsGoalResponse> {
  return request(`/savings/${id}/withdraw`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
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
  payment_type?: 'weekly' | 'monthly';
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

export async function payLoan(id: number, amount: number): Promise<LoanResponse> {
  return request(`/loans/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
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
  const ext = file.name.toLowerCase().split('.').pop();

  if (ext === 'pdf') {
    return importSberPdf(file);
  }

  const formData = new FormData();
  formData.append('file', file);
  const endpoint = ext === 'xlsx' || ext === 'xls' ? '/import/excel' : '/import/csv';

  const uploadHeaders: Record<string, string> = {};
  if (API_KEY) uploadHeaders['X-API-Key'] = API_KEY;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: uploadHeaders,
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}


export async function importSberPdf(file: File): Promise<ImportResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const pdfHeaders: Record<string, string> = {};
  if (API_KEY) pdfHeaders['X-API-Key'] = API_KEY;

  const res = await fetch(`${API_BASE}/import/sber-pdf`, {
    method: 'POST',
    headers: pdfHeaders,
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
  const url = `${API_BASE}/export/csv`;
  return API_KEY ? `${url}?api_key=${encodeURIComponent(API_KEY)}` : url;
}
