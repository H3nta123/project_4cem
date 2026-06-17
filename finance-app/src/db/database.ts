import Dexie, { type Table } from 'dexie';
import type { Transaction, SavingsGoal, Loan, AppSettings, Notification, BudgetCategory } from '../types';

export class FinanceDatabase extends Dexie {
  transactions!: Table<Transaction, string>;

  savings!: Table<SavingsGoal, string>;
  loans!: Table<Loan, string>;
  budgetCategories!: Table<BudgetCategory, string>;
  notifications!: Table<Notification, string>;
  settings!: Table<AppSettings, number>;

  constructor() {
    super('FinansProDB');
    this.version(1).stores({
      transactions: 'id, date, category, type, createdAt',

      savings: 'id, name, createdAt',
      loans: 'id, name, status, createdAt',
      budgetCategories: 'id, name, type, parentId',
      notifications: 'id, type, read, createdAt',
      settings: '++id',
    });
  }
}

export const db = new FinanceDatabase();
