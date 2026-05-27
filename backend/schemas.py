"""
ФинансПро — Pydantic v2 schemas
"""

from pydantic import BaseModel, ConfigDict
from enum import Enum
from typing import Optional
from datetime import datetime


# ─── Enums ───────────────────────────────────────────────

class CategoryType(str, Enum):
    income = "income"
    expense = "expense"


class InvestmentType(str, Enum):
    stocks = "stocks"
    bonds = "bonds"
    crypto = "crypto"
    fund = "fund"
    metals = "metals"
    other = "other"


class LoanStatus(str, Enum):
    active = "active"
    overdue = "overdue"
    completed = "completed"


# ─── Category schemas ───────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    type: CategoryType
    monthly: list[float] = [0.0] * 52
    monthly_fact: list[float] = [0.0] * 52
    sort_order: int = 0
    parent_id: Optional[int] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[CategoryType] = None
    monthly: Optional[list[float]] = None
    monthly_fact: Optional[list[float]] = None
    sort_order: Optional[int] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str
    monthly: list[float]
    monthly_fact: list[float]
    sort_order: int
    parent_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Budget value update (single cell) ──────────────────

class BudgetValueUpdate(BaseModel):
    category_id: int
    month_index: int  # 0–51 (week index)
    value: float


class BudgetFactValueUpdate(BaseModel):
    category_id: int
    month_index: int  # 0–51 (week index)
    value: float


class BulkBudgetUpdate(BaseModel):
    updates: list[BudgetValueUpdate]


class MonthlyUpdate(BaseModel):
    monthly: list[float]


# ─── Autofill ───────────────────────────────────────────

class AutofillRequest(BaseModel):
    category_id: int
    start_week: int      # 0-based week index
    amount: float
    period: str          # "weekly" or "monthly"
    count: int           # number of periods
    target: str = "plan" # "plan" or "fact"


# ─── Scenario schemas ───────────────────────────────────

class ScenarioCreate(BaseModel):
    name: str
    type: str = "custom"
    income_modifier: float = 1.0
    expense_modifier: float = 1.0
    extra_expense: float = 0.0
    description: Optional[str] = None


class ScenarioResponse(BaseModel):
    id: int
    name: str
    type: str
    income_modifier: float
    expense_modifier: float
    extra_expense: float
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Full budget table response ─────────────────────────

class BudgetTableResponse(BaseModel):
    categories: list[CategoryResponse]
    monthly_income: list[float]
    monthly_expense: list[float]
    monthly_balance: list[float]
    monthly_fact_income: list[float]
    monthly_fact_expense: list[float]
    monthly_fact_balance: list[float]
    weekly_dates: list[str]     # ISO dates for start of each week
    total_profit: float         # cumulative balance over all weeks


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  TRANSACTIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TransactionCreate(BaseModel):
    date: str
    category: str
    description: str = ""
    amount: float
    type: CategoryType


class TransactionResponse(BaseModel):
    id: int
    date: str
    category: str
    description: str
    amount: float
    type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  INVESTMENTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class InvestmentCreate(BaseModel):
    name: str
    type: InvestmentType
    type_label: str
    value: float = 0.0
    purchase_price: float = 0.0
    growth: float = 0.0
    quantity: Optional[float] = None


class InvestmentUpdate(BaseModel):
    name: Optional[str] = None
    value: Optional[float] = None
    purchase_price: Optional[float] = None
    growth: Optional[float] = None
    quantity: Optional[float] = None


class InvestmentResponse(BaseModel):
    id: int
    name: str
    type: str
    type_label: str
    value: float
    purchase_price: float
    growth: float
    quantity: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  SAVINGS GOALS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class SavingsGoalCreate(BaseModel):
    name: str
    target: float
    current: float = 0.0


class SavingsGoalUpdate(BaseModel):
    name: Optional[str] = None
    current: Optional[float] = None
    target: Optional[float] = None


class SavingsGoalResponse(BaseModel):
    id: int
    name: str
    current: float
    target: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  LOANS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class LoanCreate(BaseModel):
    name: str
    total_amount: float
    paid_amount: float = 0.0
    monthly_payment: float = 0.0
    interest_rate: float = 0.0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: LoanStatus = LoanStatus.active


class LoanUpdate(BaseModel):
    name: Optional[str] = None
    paid_amount: Optional[float] = None
    monthly_payment: Optional[float] = None
    status: Optional[LoanStatus] = None


class LoanResponse(BaseModel):
    id: int
    name: str
    total_amount: float
    paid_amount: float
    monthly_payment: float
    interest_rate: float
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  SETTINGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class SettingsResponse(BaseModel):
    theme: str = "dark"
    currency: str = "RUB"
    currencySymbol: str = "₽"
    notifyPayments: bool = True
    notifyBudgetExceed: bool = True
    budgetStartDate: str = ""


class SettingsUpdate(BaseModel):
    theme: Optional[str] = None
    currency: Optional[str] = None
    currencySymbol: Optional[str] = None
    notifyPayments: Optional[bool] = None
    notifyBudgetExceed: Optional[bool] = None
    budgetStartDate: Optional[str] = None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ANALYTICS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class CategoryBreakdownItem(BaseModel):
    name: str
    amount: float
    percentage: float


class AnalyticsSummaryResponse(BaseModel):
    total_income: float
    total_expense: float
    profit: float
    expense_breakdown: list[CategoryBreakdownItem]
    income_breakdown: list[CategoryBreakdownItem]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  IMPORT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ImportResponse(BaseModel):
    imported: int
    skipped: int
    errors: list[str]
