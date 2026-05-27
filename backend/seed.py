"""
ФинансПро — Seed data (initial categories & scenarios)
Matches the frontend seed data from finance-app/src/db/seed.ts
"""

import json
from database import SessionLocal, BudgetCategory, Scenario, Setting


def _weekly(v1, v2, v3, v4=0):
    """Create a 52-week array with first 4 values set, rest zeros."""
    return json.dumps([v1, v2, v3, v4] + [0] * 48)


def _zeros_52():
    """Create a 52-week array of zeros (for monthly_fact)."""
    return json.dumps([0] * 52)


def seed_data():
    """Insert default categories & scenarios if DB is empty."""
    db = SessionLocal()
    try:
        if db.query(BudgetCategory).count() > 0:
            return  # already seeded

        # ─── Income categories ───
        categories = [
            BudgetCategory(
                name="Зарплата", type="income",
                monthly=_weekly(18750, 18750, 18750, 18750),
                monthly_fact=_zeros_52(),
                sort_order=1,
            ),
            BudgetCategory(
                name="Фриланс", type="income",
                monthly=_weekly(1250, 1500, 1750, 0),
                monthly_fact=_zeros_52(),
                sort_order=2,
            ),
            BudgetCategory(
                name="Инвестиции", type="income",
                monthly=_weekly(500, 500, 500, 500),
                monthly_fact=_zeros_52(),
                sort_order=3,
            ),
            BudgetCategory(
                name="Прочие доходы", type="income",
                monthly=_weekly(250, 250, 250, 250),
                monthly_fact=_zeros_52(),
                sort_order=4,
            ),
            # ─── Expense categories ───
            BudgetCategory(
                name="Аренда", type="expense",
                monthly=_weekly(3750, 3750, 3750, 3750),
                monthly_fact=_zeros_52(),
                sort_order=5,
            ),
            BudgetCategory(
                name="Продукты", type="expense",
                monthly=_weekly(2000, 2000, 2000, 2000),
                monthly_fact=_zeros_52(),
                sort_order=6,
            ),
            BudgetCategory(
                name="Транспорт", type="expense",
                monthly=_weekly(750, 750, 750, 750),
                monthly_fact=_zeros_52(),
                sort_order=7,
            ),
            BudgetCategory(
                name="Развлечения", type="expense",
                monthly=_weekly(1000, 1000, 1000, 1000),
                monthly_fact=_zeros_52(),
                sort_order=8,
            ),
            BudgetCategory(
                name="Здоровье", type="expense",
                monthly=_weekly(500, 500, 500, 500),
                monthly_fact=_zeros_52(),
                sort_order=9,
            ),
        ]
        db.add_all(categories)

        # ─── Scenarios ───
        scenarios = [
            Scenario(
                name="Базовый", type="base",
                income_modifier=1.0, expense_modifier=1.0,
                extra_expense=0, description="Без изменений",
            ),
            Scenario(
                name="Оптимистичный", type="optimistic",
                income_modifier=1.2, expense_modifier=0.9,
                extra_expense=0, description="Доход +20%, расходы −10%",
            ),
            Scenario(
                name="Пессимистичный", type="pessimistic",
                income_modifier=0.85, expense_modifier=1.15,
                extra_expense=0, description="Доход −15%, расходы +15%",
            ),
            Scenario(
                name="Экстренный", type="emergency",
                income_modifier=1.0, expense_modifier=1.0,
                extra_expense=50000, description="Доп. расход 50 000 ₽",
            ),
        ]
        db.add_all(scenarios)

        # ─── Default Settings ───
        settings = [
            Setting(key="theme", value="dark"),
            Setting(key="currency", value="RUB"),
            Setting(key="currencySymbol", value="₽"),
            Setting(key="notifyPayments", value="true"),
            Setting(key="notifyBudgetExceed", value="true"),
            Setting(key="budgetStartDate", value=""),
        ]
        db.add_all(settings)

        db.commit()
    finally:
        db.close()
