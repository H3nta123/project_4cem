import { db } from './database';

export async function seedDefaultData() {
  const txCount = await db.transactions.count();
  if (txCount > 0) return;

  const now = new Date().toISOString();

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      theme: 'dark',
      currency: 'RUB',
      currencySymbol: '₽',
      notifyPayments: true,
      notifyBudgetExceed: true,
      budgetStartDate: '',
      profitAdjustment: 0,
    });
  }

  const w = (v1: number, v2: number, v3: number, v4: number = 0) =>
    [v1, v2, v3, v4, ...Array(48).fill(0)];

  await db.budgetCategories.bulkAdd([
    { id: 'inc-salary', name: 'Зарплата', type: 'income', monthly: w(18750,18750,18750,18750) },
    { id: 'inc-freelance', name: 'Фриланс', type: 'income', monthly: w(1250,1500,1750) },
    { id: 'inc-invest', name: 'Инвестиции', type: 'income', monthly: w(500,500,500,500) },
    { id: 'inc-other', name: 'Прочие доходы', type: 'income', monthly: w(250,250,250,250) },
    { id: 'exp-rent', name: 'Аренда', type: 'expense', monthly: w(3750,3750,3750,3750) },
    { id: 'exp-food', name: 'Продукты', type: 'expense', monthly: w(2000,2000,2000,2000) },
    { id: 'exp-transport', name: 'Транспорт', type: 'expense', monthly: w(750,750,750,750) },
    { id: 'exp-fun', name: 'Развлечения', type: 'expense', monthly: w(1000,1000,1000,1000) },
    { id: 'exp-health', name: 'Здоровье', type: 'expense', monthly: w(500,500,500,500) },
  ]);


  await db.transactions.bulkAdd([
    { id: 't1', date: '2025-12-01', category: 'Зарплата', description: 'Зарплата за декабрь', amount: 75000, type: 'income', createdAt: now },
    { id: 't2', date: '2025-12-05', category: 'Зарплата', description: 'Аванс', amount: 31000, type: 'income', createdAt: now },
    { id: 't3', date: '2025-12-10', category: 'Аренда', description: 'Квартира', amount: 15000, type: 'expense', createdAt: now },
    { id: 't4', date: '2025-12-11', category: 'Продукты', description: 'Пятёрочка', amount: 3200, type: 'expense', createdAt: now },
    { id: 't5', date: '2025-12-12', category: 'Транспорт', description: 'Бензин', amount: 3500, type: 'expense', createdAt: now },
    { id: 't6', date: '2025-12-13', category: 'Развлечения', description: 'Ресторан', amount: 4500, type: 'expense', createdAt: now },
    { id: 't7', date: '2025-12-14', category: 'Здоровье', description: 'Стоматолог', amount: 4000, type: 'expense', createdAt: now },
  ]);

  await db.investments.bulkAdd([
    { id: 'inv1', name: 'Сбербанк', type: 'stocks', typeLabel: 'Акции', value: 85000, purchasePrice: 70000, growth: 20.5, createdAt: now },
    { id: 'inv2', name: 'Газпром', type: 'stocks', typeLabel: 'Акции', value: 42000, purchasePrice: 43400, growth: -3.2, createdAt: now },
    { id: 'inv3', name: 'ОФЗ', type: 'bonds', typeLabel: 'Облигации', value: 120000, purchasePrice: 111300, growth: 7.8, createdAt: now },
    { id: 'inv4', name: 'Bitcoin', type: 'crypto', typeLabel: 'Крипто', value: 65000, purchasePrice: 26000, growth: 150.4, createdAt: now },
    { id: 'inv5', name: 'Фонд Тинькофф', type: 'fund', typeLabel: 'Фонд', value: 95000, purchasePrice: 87400, growth: 8.7, createdAt: now },
    { id: 'inv6', name: 'Золото', type: 'metals', typeLabel: 'Металлы', value: 55000, purchasePrice: 52200, growth: 5.3, createdAt: now },
  ]);

  await db.savings.bulkAdd([
    { id: 'sav1', name: 'Отпуск', current: 120000, target: 200000, createdAt: now },
    { id: 'sav2', name: 'MacBook', current: 90000, target: 160000, createdAt: now },
    { id: 'sav3', name: 'Подушка безопасности', current: 325000, target: 500000, createdAt: now },
  ]);

  await db.loans.bulkAdd([
    { id: 'loan1', name: 'Ипотека', totalAmount: 3500000, paidAmount: 590000, monthlyPayment: 35000, interestRate: 11.5, startDate: '2023-01-15', endDate: '2033-01-15', status: 'active', createdAt: now },
    { id: 'loan2', name: 'Автокредит', totalAmount: 800000, paidAmount: 320000, monthlyPayment: 18000, interestRate: 9.2, startDate: '2024-03-01', endDate: '2028-03-01', status: 'active', createdAt: now },
    { id: 'loan3', name: 'Потребительский', totalAmount: 90000, paidAmount: 60000, monthlyPayment: 5000, interestRate: 14.5, startDate: '2024-06-01', endDate: '2026-06-01', status: 'active', createdAt: now },
  ]);

  await db.notifications.bulkAdd([
    { id: 'n1', title: 'Платёж по ипотеке', message: 'Через 3 дня очередной платёж — 35 000 ₽', type: 'warning', read: false, createdAt: now },
    { id: 'n2', title: 'Бюджет превышен', message: 'Расходы на развлечения превысили план на 12%', type: 'danger', read: false, createdAt: now },
    { id: 'n3', title: 'Цель достигнута!', message: 'Накопление на MacBook выполнено на 56%', type: 'info', read: true, createdAt: now },
  ]);
}
