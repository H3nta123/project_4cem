"""
ФинансПро — FastAPI application v2.1.0
All endpoints for budget, categories, scenarios, transactions,
investments, savings, loans, settings, import, export, analytics.
"""

import csv
import io
import json
import logging
import os
import sys
from datetime import datetime, timedelta

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from database import (
    get_db, init_db, SessionLocal,
    BudgetCategory, Scenario, Transaction, Investment, SavingsGoal, Loan, Setting, Base, engine,
)
from schemas import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    BudgetValueUpdate,
    BudgetFactValueUpdate,
    BulkBudgetUpdate,
    MonthlyUpdate,
    AutofillRequest,
    ScenarioCreate,
    ScenarioResponse,
    BudgetTableResponse,
    TransactionCreate,
    TransactionResponse,
    InvestmentCreate,
    InvestmentUpdate,
    InvestmentResponse,
    SavingsGoalCreate,
    SavingsGoalUpdate,
    SavingsGoalResponse,
    LoanCreate,
    LoanUpdate,
    LoanResponse,
    SettingsResponse,
    SettingsUpdate,
    AnalyticsSummaryResponse,
    CategoryBreakdownItem,
    ImportResponse,
)
from seed import seed_data

# ─── Logging ─────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("finanspro")

# ─── App ─────────────────────────────────────────────────
app = FastAPI(title="ФинансПро API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Static files (bundled frontend) ─────────────────────
def _get_dist_dir():
    """Resolve the frontend dist directory."""
    if getattr(sys, 'frozen', False):
        base = sys._MEIPASS
    else:
        base = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, 'dist')


DIST_DIR = _get_dist_dir()


@app.on_event("startup")
def on_startup():
    logger.info("Initializing database...")
    init_db()
    seed_data()
    logger.info("Database ready.")
    logger.info(f"Static files dir: {DIST_DIR}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  CATEGORIES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@app.get("/api/categories", response_model=list[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    """Get all budget categories ordered by sort_order."""
    cats = db.query(BudgetCategory).order_by(BudgetCategory.sort_order).all()
    return [_cat_to_dict(c) for c in cats]


@app.post("/api/categories", response_model=CategoryResponse, status_code=201)
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    """Create a new budget category."""
    cat = BudgetCategory(
        name=data.name,
        type=data.type.value,
        monthly=json.dumps(data.monthly),
        monthly_fact=json.dumps(data.monthly_fact),
        sort_order=data.sort_order,
        parent_id=data.parent_id,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    logger.info(f"Created category: {cat.name} ({cat.type})")
    return _cat_to_dict(cat)


@app.put("/api/categories/{cat_id}", response_model=CategoryResponse)
def update_category(cat_id: int, data: CategoryUpdate, db: Session = Depends(get_db)):
    """Update a category's name, type, or monthly values."""
    cat = db.query(BudgetCategory).filter(BudgetCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    if data.name is not None:
        cat.name = data.name
    if data.type is not None:
        cat.type = data.type.value
    if data.monthly is not None:
        cat.monthly = json.dumps(data.monthly)
    if data.monthly_fact is not None:
        cat.monthly_fact = json.dumps(data.monthly_fact)
    if data.sort_order is not None:
        cat.sort_order = data.sort_order

    db.commit()
    db.refresh(cat)
    return _cat_to_dict(cat)


@app.delete("/api/categories/{cat_id}", status_code=204)
def delete_category(cat_id: int, db: Session = Depends(get_db)):
    """Delete a category by ID."""
    cat = db.query(BudgetCategory).filter(BudgetCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    db.delete(cat)
    db.commit()
    logger.info(f"Deleted category id={cat_id}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  BUDGET TABLE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@app.get("/api/budget", response_model=BudgetTableResponse)
def get_budget_table(db: Session = Depends(get_db)):
    """Get the full budget table with totals."""
    cats = db.query(BudgetCategory).order_by(BudgetCategory.sort_order).all()
    return _build_budget_response(cats, db=db)


@app.put("/api/budget/values/{cat_id}", response_model=CategoryResponse)
def update_budget_values(cat_id: int, data: MonthlyUpdate, db: Session = Depends(get_db)):
    """Replace all monthly values for a category."""
    cat = db.query(BudgetCategory).filter(BudgetCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    cat.monthly = json.dumps(data.monthly)
    db.commit()
    db.refresh(cat)
    return _cat_to_dict(cat)


@app.put("/api/budget/cell", response_model=BudgetTableResponse)
def update_single_cell(data: BudgetValueUpdate, db: Session = Depends(get_db)):
    """Update a single cell in the budget table (plan) and return refreshed totals."""
    cat = db.query(BudgetCategory).filter(BudgetCategory.id == data.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    monthly = json.loads(cat.monthly)
    # Extend if needed
    while len(monthly) < 52:
        monthly.append(0)
    if not (0 <= data.month_index < len(monthly)):
        raise HTTPException(status_code=400, detail="Индекс месяца вне диапазона")

    monthly[data.month_index] = data.value
    cat.monthly = json.dumps(monthly)
    db.commit()

    cats = db.query(BudgetCategory).order_by(BudgetCategory.sort_order).all()
    return _build_budget_response(cats, db=db)


@app.put("/api/budget/fact/cell", response_model=BudgetTableResponse)
def update_fact_cell(data: BudgetFactValueUpdate, db: Session = Depends(get_db)):
    """Update a single cell in the fact table and return refreshed totals."""
    cat = db.query(BudgetCategory).filter(BudgetCategory.id == data.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    monthly_fact = json.loads(cat.monthly_fact)
    while len(monthly_fact) < 52:
        monthly_fact.append(0)
    if not (0 <= data.month_index < len(monthly_fact)):
        raise HTTPException(status_code=400, detail="Индекс недели вне диапазона")

    monthly_fact[data.month_index] = data.value
    cat.monthly_fact = json.dumps(monthly_fact)
    db.commit()

    cats = db.query(BudgetCategory).order_by(BudgetCategory.sort_order).all()
    return _build_budget_response(cats, db=db)


@app.put("/api/budget/bulk", response_model=BudgetTableResponse)
def bulk_update_budget(data: BulkBudgetUpdate, db: Session = Depends(get_db)):
    """Batch-update multiple cells at once."""
    for upd in data.updates:
        cat = db.query(BudgetCategory).filter(BudgetCategory.id == upd.category_id).first()
        if not cat:
            continue
        monthly = json.loads(cat.monthly)
        while len(monthly) < 52:
            monthly.append(0)
        if 0 <= upd.month_index < len(monthly):
            monthly[upd.month_index] = upd.value
            cat.monthly = json.dumps(monthly)
    db.commit()

    cats = db.query(BudgetCategory).order_by(BudgetCategory.sort_order).all()
    return _build_budget_response(cats, db=db)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  AUTOFILL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@app.put("/api/budget/autofill", response_model=BudgetTableResponse)
def autofill_budget(data: AutofillRequest, db: Session = Depends(get_db)):
    """Autofill budget values for a category.
    period: 'weekly' fills each week, 'monthly' fills every 4 weeks.
    count: number of periods to fill.
    target: 'plan' or 'fact'.
    """
    cat = db.query(BudgetCategory).filter(BudgetCategory.id == data.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    if data.target == "fact":
        values = json.loads(cat.monthly_fact)
    else:
        values = json.loads(cat.monthly)

    while len(values) < 52:
        values.append(0)

    step = 1 if data.period == "weekly" else 4  # monthly = every 4 weeks
    week = data.start_week
    for _ in range(data.count):
        if 0 <= week < 52:
            values[week] = data.amount
        week += step

    if data.target == "fact":
        cat.monthly_fact = json.dumps(values)
    else:
        cat.monthly = json.dumps(values)

    db.commit()

    cats = db.query(BudgetCategory).order_by(BudgetCategory.sort_order).all()
    return _build_budget_response(cats, db=db)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  SCENARIOS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@app.get("/api/scenarios", response_model=list[ScenarioResponse])
def get_scenarios(db: Session = Depends(get_db)):
    """Get all available scenarios."""
    return db.query(Scenario).all()


@app.post("/api/scenarios", response_model=ScenarioResponse, status_code=201)
def create_scenario(data: ScenarioCreate, db: Session = Depends(get_db)):
    """Create a custom scenario."""
    scenario = Scenario(**data.model_dump())
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


@app.delete("/api/scenarios/{scenario_id}", status_code=204)
def delete_scenario(scenario_id: int, db: Session = Depends(get_db)):
    """Delete a custom scenario."""
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Сценарий не найден")
    if scenario.type != "custom":
        raise HTTPException(status_code=400, detail="Нельзя удалить встроенный сценарий")
    db.delete(scenario)
    db.commit()


@app.get("/api/budget/scenario/{scenario_id}", response_model=BudgetTableResponse)
def get_budget_with_scenario(scenario_id: int, db: Session = Depends(get_db)):
    """Get budget table with a scenario applied (values modified by modifiers)."""
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Сценарий не найден")
    cats = db.query(BudgetCategory).order_by(BudgetCategory.sort_order).all()
    return _build_budget_response(cats, scenario, db=db)


@app.post("/api/scenarios/{scenario_id}/apply", response_model=BudgetTableResponse)
def apply_scenario_to_plan(scenario_id: int, db: Session = Depends(get_db)):
    """Apply a scenario to the main plan — copies modified values into monthly (plan)."""
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Сценарий не найден")

    cats = db.query(BudgetCategory).order_by(BudgetCategory.sort_order).all()
    for cat in cats:
        monthly = json.loads(cat.monthly)
        while len(monthly) < 52:
            monthly.append(0)

        if cat.type == "income":
            monthly = [round(v * scenario.income_modifier, 2) for v in monthly]
        else:
            per_week_extra = scenario.extra_expense / 52
            monthly = [round(v * scenario.expense_modifier + per_week_extra, 2) for v in monthly]

        cat.monthly = json.dumps(monthly)

    db.commit()
    logger.info(f"Applied scenario '{scenario.name}' to plan")

    cats = db.query(BudgetCategory).order_by(BudgetCategory.sort_order).all()
    return _build_budget_response(cats, db=db)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  TRANSACTIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@app.get("/api/transactions", response_model=list[TransactionResponse])
def get_transactions(
    type: str | None = Query(None, description="Filter by type: income or expense"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Get transactions with optional filtering and pagination."""
    q = db.query(Transaction)
    if type:
        q = q.filter(Transaction.type == type)
    q = q.order_by(Transaction.date.desc(), Transaction.id.desc())
    return q.offset(offset).limit(limit).all()


@app.post("/api/transactions", response_model=TransactionResponse, status_code=201)
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)):
    """Create a new transaction."""
    tx = Transaction(
        date=data.date,
        category=data.category,
        description=data.description,
        amount=data.amount,
        type=data.type.value,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    logger.info(f"Created transaction: {tx.category} {tx.amount} ({tx.type})")
    return tx


@app.delete("/api/transactions/{tx_id}", status_code=204)
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    """Delete a transaction by ID."""
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Транзакция не найдена")
    db.delete(tx)
    db.commit()
    logger.info(f"Deleted transaction id={tx_id}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  INVESTMENTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@app.get("/api/investments", response_model=list[InvestmentResponse])
def get_investments(db: Session = Depends(get_db)):
    """Get all investments."""
    return db.query(Investment).order_by(Investment.id.desc()).all()


@app.post("/api/investments", response_model=InvestmentResponse, status_code=201)
def create_investment(data: InvestmentCreate, db: Session = Depends(get_db)):
    """Create a new investment."""
    inv = Investment(
        name=data.name,
        type=data.type.value,
        type_label=data.type_label,
        value=data.value,
        purchase_price=data.purchase_price,
        growth=data.growth,
        quantity=data.quantity,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    logger.info(f"Created investment: {inv.name}")
    return inv


@app.put("/api/investments/{inv_id}", response_model=InvestmentResponse)
def update_investment(inv_id: int, data: InvestmentUpdate, db: Session = Depends(get_db)):
    """Update an investment (e.g. after buy/sell)."""
    inv = db.query(Investment).filter(Investment.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Инвестиция не найдена")

    if data.name is not None:
        inv.name = data.name
    if data.value is not None:
        inv.value = data.value
    if data.purchase_price is not None:
        inv.purchase_price = data.purchase_price
    if data.growth is not None:
        inv.growth = data.growth
    if data.quantity is not None:
        inv.quantity = data.quantity

    db.commit()
    db.refresh(inv)
    return inv


@app.delete("/api/investments/{inv_id}", status_code=204)
def delete_investment(inv_id: int, db: Session = Depends(get_db)):
    """Delete an investment."""
    inv = db.query(Investment).filter(Investment.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Инвестиция не найдена")
    db.delete(inv)
    db.commit()
    logger.info(f"Deleted investment id={inv_id}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  SAVINGS GOALS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@app.get("/api/savings", response_model=list[SavingsGoalResponse])
def get_savings(db: Session = Depends(get_db)):
    """Get all savings goals."""
    return db.query(SavingsGoal).order_by(SavingsGoal.id.desc()).all()


@app.post("/api/savings", response_model=SavingsGoalResponse, status_code=201)
def create_saving(data: SavingsGoalCreate, db: Session = Depends(get_db)):
    """Create a new savings goal."""
    goal = SavingsGoal(
        name=data.name,
        target=data.target,
        current=data.current,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    logger.info(f"Created savings goal: {goal.name}")
    return goal


@app.put("/api/savings/{goal_id}", response_model=SavingsGoalResponse)
def update_saving(goal_id: int, data: SavingsGoalUpdate, db: Session = Depends(get_db)):
    """Update a savings goal (e.g. top up)."""
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Цель не найдена")

    if data.name is not None:
        goal.name = data.name
    if data.current is not None:
        goal.current = data.current
    if data.target is not None:
        goal.target = data.target

    db.commit()
    db.refresh(goal)
    return goal


@app.delete("/api/savings/{goal_id}", status_code=204)
def delete_saving(goal_id: int, db: Session = Depends(get_db)):
    """Delete a savings goal."""
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Цель не найдена")
    db.delete(goal)
    db.commit()
    logger.info(f"Deleted savings goal id={goal_id}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  LOANS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@app.get("/api/loans", response_model=list[LoanResponse])
def get_loans(db: Session = Depends(get_db)):
    """Get all loans."""
    return db.query(Loan).order_by(Loan.id.desc()).all()


@app.post("/api/loans", response_model=LoanResponse, status_code=201)
def create_loan(data: LoanCreate, db: Session = Depends(get_db)):
    """Create a new loan."""
    loan = Loan(
        name=data.name,
        total_amount=data.total_amount,
        paid_amount=data.paid_amount,
        monthly_payment=data.monthly_payment,
        interest_rate=data.interest_rate,
        start_date=data.start_date,
        end_date=data.end_date,
        status=data.status.value,
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    logger.info(f"Created loan: {loan.name}")
    return loan


@app.put("/api/loans/{loan_id}", response_model=LoanResponse)
def update_loan(loan_id: int, data: LoanUpdate, db: Session = Depends(get_db)):
    """Update a loan (e.g. make a payment)."""
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Кредит не найден")

    if data.name is not None:
        loan.name = data.name
    if data.paid_amount is not None:
        loan.paid_amount = data.paid_amount
    if data.monthly_payment is not None:
        loan.monthly_payment = data.monthly_payment
    if data.status is not None:
        loan.status = data.status.value

    # Auto-complete if fully paid
    if loan.paid_amount >= loan.total_amount:
        loan.status = "completed"

    db.commit()
    db.refresh(loan)
    return loan


@app.delete("/api/loans/{loan_id}", status_code=204)
def delete_loan(loan_id: int, db: Session = Depends(get_db)):
    """Delete a loan."""
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Кредит не найден")
    db.delete(loan)
    db.commit()
    logger.info(f"Deleted loan id={loan_id}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  SETTINGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SETTINGS_DEFAULTS = {
    "theme": "dark",
    "currency": "RUB",
    "currencySymbol": "₽",
    "notifyPayments": "true",
    "notifyBudgetExceed": "true",
    "budgetStartDate": "",
}


@app.get("/api/settings", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Get all application settings."""
    settings_rows = db.query(Setting).all()
    settings_dict = {s.key: s.value for s in settings_rows}

    return SettingsResponse(
        theme=settings_dict.get("theme", SETTINGS_DEFAULTS["theme"]),
        currency=settings_dict.get("currency", SETTINGS_DEFAULTS["currency"]),
        currencySymbol=settings_dict.get("currencySymbol", SETTINGS_DEFAULTS["currencySymbol"]),
        notifyPayments=settings_dict.get("notifyPayments", SETTINGS_DEFAULTS["notifyPayments"]).lower() == "true",
        notifyBudgetExceed=settings_dict.get("notifyBudgetExceed", SETTINGS_DEFAULTS["notifyBudgetExceed"]).lower() == "true",
        budgetStartDate=settings_dict.get("budgetStartDate", SETTINGS_DEFAULTS["budgetStartDate"]),
    )


@app.put("/api/settings", response_model=SettingsResponse)
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    """Update application settings."""
    updates = data.model_dump(exclude_none=True)

    for key, value in updates.items():
        # Convert booleans to string for storage
        str_value = str(value).lower() if isinstance(value, bool) else str(value)
        existing = db.query(Setting).filter(Setting.key == key).first()
        if existing:
            existing.value = str_value
        else:
            db.add(Setting(key=key, value=str_value))

    db.commit()
    logger.info(f"Updated settings: {list(updates.keys())}")
    return get_settings(db)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ANALYTICS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@app.get("/api/analytics/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(db: Session = Depends(get_db)):
    """Get analytics summary: income/expense totals and category breakdowns."""
    # Sum from budget categories (weekly totals → month 0 as representative)
    cats = db.query(BudgetCategory).all()

    total_income = 0.0
    total_expense = 0.0
    income_items: list[dict] = []
    expense_items: list[dict] = []

    for cat in cats:
        monthly = json.loads(cat.monthly)
        total = sum(monthly)
        if cat.type == "income":
            total_income += total
            income_items.append({"name": cat.name, "amount": total})
        else:
            total_expense += total
            expense_items.append({"name": cat.name, "amount": total})

    # Also add actual transactions
    transactions = db.query(Transaction).all()
    tx_income = sum(tx.amount for tx in transactions if tx.type == "income")
    tx_expense = sum(tx.amount for tx in transactions if tx.type == "expense")
    total_income += tx_income
    total_expense += tx_expense

    # Build breakdowns with percentages
    def build_breakdown(items: list[dict], total: float) -> list[CategoryBreakdownItem]:
        result = []
        for item in sorted(items, key=lambda x: x["amount"], reverse=True):
            pct = round((item["amount"] / total) * 100, 1) if total > 0 else 0
            result.append(CategoryBreakdownItem(name=item["name"], amount=item["amount"], percentage=pct))
        return result

    return AnalyticsSummaryResponse(
        total_income=total_income,
        total_expense=total_expense,
        profit=total_income - total_expense,
        expense_breakdown=build_breakdown(expense_items, total_expense),
        income_breakdown=build_breakdown(income_items, total_income),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  IMPORT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@app.post("/api/import/csv", response_model=ImportResponse)
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Import transactions from a CSV file.
    Expected columns: date, category, description, amount, type (income/expense).
    """
    imported = 0
    skipped = 0
    errors: list[str] = []

    try:
        content = await file.read()
        # Try UTF-8-BOM, then UTF-8, then cp1251 (Cyrillic Windows)
        for encoding in ['utf-8-sig', 'utf-8', 'cp1251']:
            try:
                text = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            return ImportResponse(imported=0, skipped=0, errors=["Не удалось определить кодировку файла"])

        # Detect delimiter
        first_line = text.split('\n')[0]
        delimiter = ';' if ';' in first_line else ','

        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)

        # Map Russian / English column names
        FIELD_MAP = {
            'дата': 'date', 'date': 'date',
            'категория': 'category', 'category': 'category',
            'описание': 'description', 'description': 'description',
            'сумма': 'amount', 'amount': 'amount',
            'тип': 'type', 'type': 'type',
        }

        for i, row in enumerate(reader, start=2):
            try:
                # Normalize field names
                normalized = {}
                for k, v in row.items():
                    if k is None:
                        continue
                    key_lower = k.strip().lower()
                    mapped = FIELD_MAP.get(key_lower)
                    if mapped:
                        normalized[mapped] = v.strip() if v else ""

                if 'date' not in normalized or 'amount' not in normalized:
                    skipped += 1
                    continue

                amount = float(normalized['amount'].replace(',', '.').replace(' ', ''))
                tx_type = normalized.get('type', '').lower()
                if tx_type in ('доход', 'income'):
                    tx_type = 'income'
                elif tx_type in ('расход', 'expense'):
                    tx_type = 'expense'
                else:
                    tx_type = 'expense' if amount < 0 else 'income'

                tx = Transaction(
                    date=normalized.get('date', ''),
                    category=normalized.get('category', 'Без категории'),
                    description=normalized.get('description', ''),
                    amount=abs(amount),
                    type=tx_type,
                )
                db.add(tx)
                imported += 1

            except Exception as e:
                errors.append(f"Строка {i}: {str(e)}")
                skipped += 1

        db.commit()
        logger.info(f"Import complete: {imported} imported, {skipped} skipped")

    except Exception as e:
        errors.append(f"Ошибка чтения файла: {str(e)}")

    return ImportResponse(imported=imported, skipped=skipped, errors=errors)


@app.post("/api/import/excel", response_model=ImportResponse)
async def import_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Import transactions from an Excel (.xlsx) file.
    Expected columns: Дата/Date, Категория/Category, Описание/Description, Сумма/Amount, Тип/Type.
    """
    imported = 0
    skipped = 0
    errors: list[str] = []

    try:
        from openpyxl import load_workbook

        content = await file.read()
        wb = load_workbook(filename=io.BytesIO(content), read_only=True, data_only=True)
        ws = wb.active
        if ws is None:
            return ImportResponse(imported=0, skipped=0, errors=["Не удалось открыть лист Excel"])

        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 2:
            return ImportResponse(imported=0, skipped=0, errors=["Файл пуст или содержит только заголовки"])

        # Map header row
        FIELD_MAP = {
            'дата': 'date', 'date': 'date',
            'категория': 'category', 'category': 'category',
            'описание': 'description', 'description': 'description',
            'сумма': 'amount', 'amount': 'amount',
            'тип': 'type', 'type': 'type',
        }

        header_row = rows[0]
        col_map = {}
        for idx, cell in enumerate(header_row):
            if cell is not None:
                key = str(cell).strip().lower()
                mapped = FIELD_MAP.get(key)
                if mapped:
                    col_map[mapped] = idx

        if 'date' not in col_map or 'amount' not in col_map:
            return ImportResponse(imported=0, skipped=0, errors=[
                f"Не найдены обязательные столбцы 'Дата' и 'Сумма'. Найденные: {[str(c) for c in header_row if c]}"
            ])

        for i, row in enumerate(rows[1:], start=2):
            try:
                date_val = row[col_map['date']] if 'date' in col_map else None
                amount_val = row[col_map['amount']] if 'amount' in col_map else None

                if date_val is None or amount_val is None:
                    skipped += 1
                    continue

                # Convert date
                if hasattr(date_val, 'strftime'):
                    date_str = date_val.strftime('%Y-%m-%d')
                else:
                    date_str = str(date_val).strip()

                # Convert amount
                if isinstance(amount_val, (int, float)):
                    amount = float(amount_val)
                else:
                    amount = float(str(amount_val).replace(',', '.').replace(' ', ''))

                # Get optional fields
                category = str(row[col_map['category']]).strip() if 'category' in col_map and row[col_map['category']] else 'Без категории'
                description = str(row[col_map['description']]).strip() if 'description' in col_map and row[col_map['description']] else ''

                tx_type_raw = str(row[col_map['type']]).strip().lower() if 'type' in col_map and row[col_map['type']] else ''
                if tx_type_raw in ('доход', 'income'):
                    tx_type = 'income'
                elif tx_type_raw in ('расход', 'expense'):
                    tx_type = 'expense'
                else:
                    tx_type = 'expense' if amount < 0 else 'income'

                tx = Transaction(
                    date=date_str,
                    category=category,
                    description=description,
                    amount=abs(amount),
                    type=tx_type,
                )
                db.add(tx)
                imported += 1

            except Exception as e:
                errors.append(f"Строка {i}: {str(e)}")
                skipped += 1

        db.commit()
        wb.close()
        logger.info(f"Excel import complete: {imported} imported, {skipped} skipped")

    except ImportError:
        errors.append("Библиотека openpyxl не установлена. Установите: pip install openpyxl")
    except Exception as e:
        errors.append(f"Ошибка чтения файла: {str(e)}")

    return ImportResponse(imported=imported, skipped=skipped, errors=errors)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  EXPORT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@app.get("/api/export/csv")
def export_csv(db: Session = Depends(get_db)):
    """Export budget table as CSV (UTF-8 with BOM for Excel compatibility)."""
    cats = db.query(BudgetCategory).order_by(BudgetCategory.sort_order).all()
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')

    headers = ["Категория", "Тип"] + [f"Нед{i + 1}" for i in range(52)]
    writer.writerow(headers)

    for cat in cats:
        monthly = json.loads(cat.monthly)
        type_label = "Доход" if cat.type == "income" else "Расход"
        writer.writerow([cat.name, type_label] + monthly)

    # Encode with UTF-8 BOM so Excel auto-detects Cyrillic correctly
    csv_text = output.getvalue()
    bom = b'\xef\xbb\xbf'
    csv_bytes = bom + csv_text.encode('utf-8')

    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": "attachment; filename=budget.csv"},
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  RESET
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@app.post("/api/reset", status_code=200)
def reset_data(db: Session = Depends(get_db)):
    """Reset all data — drop and recreate all tables, then re-seed."""
    db.close()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_data()
    logger.info("All data has been reset")
    return {"message": "Все данные сброшены"}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


def _cat_to_dict(cat: BudgetCategory) -> dict:
    """Convert a SQLAlchemy BudgetCategory to a response dict."""
    monthly = json.loads(cat.monthly)
    monthly_fact = json.loads(cat.monthly_fact) if cat.monthly_fact else [0.0] * 52
    # Ensure 52 elements
    while len(monthly) < 52:
        monthly.append(0)
    while len(monthly_fact) < 52:
        monthly_fact.append(0)
    return {
        "id": cat.id,
        "name": cat.name,
        "type": cat.type,
        "monthly": monthly,
        "monthly_fact": monthly_fact,
        "sort_order": cat.sort_order,
        "parent_id": cat.parent_id,
        "created_at": cat.created_at,
    }


def _get_weekly_dates(db: Session) -> list[str]:
    """Compute 52 weekly start dates from the budgetStartDate setting."""
    setting = db.query(Setting).filter(Setting.key == "budgetStartDate").first()
    start_date_str = setting.value if setting and setting.value else ""

    if start_date_str:
        try:
            start = datetime.strptime(start_date_str, "%Y-%m-%d")
        except ValueError:
            start = datetime.now()
    else:
        # Default to Monday of current week
        today = datetime.now()
        start = today - timedelta(days=today.weekday())

    dates = []
    for i in range(52):
        d = start + timedelta(weeks=i)
        dates.append(d.strftime("%Y-%m-%d"))
    return dates


def _build_budget_response(
    cats: list[BudgetCategory],
    scenario: Scenario | None = None,
    db: Session = None,
) -> dict:
    """Build the full budget table response with optional scenario modifiers."""
    cat_responses = []
    monthly_income = [0.0] * 52
    monthly_expense = [0.0] * 52
    monthly_fact_income = [0.0] * 52
    monthly_fact_expense = [0.0] * 52

    for cat in cats:
        monthly = json.loads(cat.monthly)
        monthly_fact = json.loads(cat.monthly_fact) if cat.monthly_fact else [0.0] * 52

        # Ensure 52 elements
        while len(monthly) < 52:
            monthly.append(0)
        while len(monthly_fact) < 52:
            monthly_fact.append(0)

        # Apply scenario modifiers (only to plan, not fact)
        if scenario:
            if cat.type == "income":
                monthly = [round(v * scenario.income_modifier, 2) for v in monthly]
            else:
                per_week_extra = scenario.extra_expense / 52
                monthly = [round(v * scenario.expense_modifier + per_week_extra, 2) for v in monthly]

        cat_responses.append({
            "id": cat.id,
            "name": cat.name,
            "type": cat.type,
            "monthly": monthly,
            "monthly_fact": monthly_fact,
            "sort_order": cat.sort_order,
            "parent_id": cat.parent_id,
            "created_at": cat.created_at,
        })

        for i in range(52):
            if cat.type == "income":
                monthly_income[i] += monthly[i]
                monthly_fact_income[i] += monthly_fact[i]
            else:
                monthly_expense[i] += monthly[i]
                monthly_fact_expense[i] += monthly_fact[i]

    monthly_balance = [monthly_income[i] - monthly_expense[i] for i in range(52)]
    monthly_fact_balance = [monthly_fact_income[i] - monthly_fact_expense[i] for i in range(52)]

    # Total profit = sum of all weekly balances
    total_profit = sum(monthly_balance)

    # Weekly dates
    weekly_dates = _get_weekly_dates(db) if db else [f"2026-W{i+1:02d}" for i in range(52)]

    return {
        "categories": cat_responses,
        "monthly_income": monthly_income,
        "monthly_expense": monthly_expense,
        "monthly_balance": monthly_balance,
        "monthly_fact_income": monthly_fact_income,
        "monthly_fact_expense": monthly_fact_expense,
        "monthly_fact_balance": monthly_fact_balance,
        "weekly_dates": weekly_dates,
        "total_profit": total_profit,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  FRONTEND STATIC FILES (must be LAST — catch-all)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


if os.path.isdir(DIST_DIR):
    # Mount assets sub-directory for JS/CSS
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve static files or fallback to index.html for SPA routing."""
        file_path = os.path.join(DIST_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_path = os.path.join(DIST_DIR, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
        return HTMLResponse("<h1>Frontend not found</h1>", status_code=404)
