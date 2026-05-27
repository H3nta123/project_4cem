"""
ФинансПро — SQLAlchemy models & DB setup
SQLite + check_same_thread=False for FastAPI
"""

import os
import sys
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone


def _get_db_path():
    """Get the database path — next to the executable or in the CWD."""
    if getattr(sys, 'frozen', False):
        # Running as a PyInstaller bundle
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, 'finance.db')


DB_PATH = _get_db_path()
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ─── Models ──────────────────────────────────────────────

class BudgetCategory(Base):
    """Категория бюджета (доход или расход) с помесячными значениями."""
    __tablename__ = "budget_categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    type = Column(String(10), nullable=False)  # "income" | "expense"
    monthly = Column(Text, nullable=False, default="[0,0,0,0,0,0,0,0,0,0,0,0]")
    monthly_fact = Column(Text, nullable=False, default='[' + ','.join(['0'] * 52) + ']')
    sort_order = Column(Integer, default=0)
    parent_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Scenario(Base):
    """Сценарий «Что если» — модификаторы дохода/расхода."""
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)  # base, optimistic, pessimistic, emergency, custom
    income_modifier = Column(Float, default=1.0)
    expense_modifier = Column(Float, default=1.0)
    extra_expense = Column(Float, default=0.0)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Transaction(Base):
    """Транзакция (операция) — доход или расход."""
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(String(10), nullable=False)  # ISO date YYYY-MM-DD
    category = Column(String(100), nullable=False)
    description = Column(String(255), default="")
    amount = Column(Float, nullable=False)
    type = Column(String(10), nullable=False)  # "income" | "expense"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Investment(Base):
    """Инвестиция — актив портфеля."""
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)  # stocks, bonds, crypto, fund, metals, other
    type_label = Column(String(50), nullable=False)  # Акции, Облигации, etc.
    value = Column(Float, default=0.0)
    purchase_price = Column(Float, default=0.0)
    growth = Column(Float, default=0.0)  # percentage
    quantity = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SavingsGoal(Base):
    """Цель накопления."""
    __tablename__ = "savings_goals"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    current = Column(Float, default=0.0)
    target = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Loan(Base):
    """Кредит / займ."""
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    monthly_payment = Column(Float, default=0.0)
    interest_rate = Column(Float, default=0.0)
    start_date = Column(String(10), nullable=True)  # ISO date
    end_date = Column(String(10), nullable=True)  # ISO date
    status = Column(String(20), default="active")  # active, overdue, completed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Setting(Base):
    """Настройка приложения (key-value)."""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    key = Column(String(50), nullable=False, unique=True, index=True)
    value = Column(String(255), nullable=False)


# ─── DB lifecycle ────────────────────────────────────────

def migrate_db():
    """Run migrations to add new columns to existing databases."""
    import sqlite3
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Check if monthly_fact column exists
    cursor.execute("PRAGMA table_info(budget_categories)")
    columns = [row[1] for row in cursor.fetchall()]
    if 'monthly_fact' not in columns:
        default_val = '[' + ','.join(['0'] * 52) + ']'
        cursor.execute(f"ALTER TABLE budget_categories ADD COLUMN monthly_fact TEXT NOT NULL DEFAULT '{default_val}'")
        conn.commit()
    conn.close()


def init_db():
    """Create all tables if they don't exist."""
    Base.metadata.create_all(bind=engine)
    migrate_db()


def get_db():
    """FastAPI dependency — yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
