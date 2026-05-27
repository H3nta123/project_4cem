<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/wallet.svg" alt="Logo" width="80" height="80">
  <h1 align="center">ФинансПро (FinansPro)</h1>
  <p align="center">
    <strong>Мощный и современный инструмент для управления личными и бизнес-финансами</strong>
    <br />
    <br />
    <a href="#особенности">Особенности</a>
    ·
    <a href="#стек-технологий">Стек</a>
    ·
    <a href="#установка-и-запуск">Установка</a>
  </p>
</div>

---

## 🌟 Особенности

- 📊 **Бюджетирование на 52 недели:** Удобное планирование доходов и расходов на весь год.
- 🎯 **План vs Факт:** Отслеживайте реальное выполнение вашего финансового плана.
- 🔮 **What-If Сценарии:** Моделируйте различные финансовые ситуации (падение доходов, рост расходов) и смотрите на результат.
- 📈 **Инвестиции и Кредиты:** Ведите учет своих активов и обязательств в одном месте.
- 📥 **Импорт данных:** Загружайте банковские выписки (CSV / Excel).
- 🎨 **Современный UI:** Темная тема, приятные анимации, отзывчивый дизайн и мощные графики (Recharts).

## 💻 Стек технологий

**Frontend:**
- [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) (сборщик)
- [Recharts](https://recharts.org/) (визуализация данных)
- [Lucide React](https://lucide.dev/) (иконки)

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com/) (серверная логика)
- [SQLAlchemy](https://www.sqlalchemy.org/) + [SQLite](https://sqlite.org/) (база данных)
- [Uvicorn](https://www.uvicorn.org/) (ASGI сервер)

## 🚀 Установка и запуск

Проект представляет собой монорепозиторий. Бэкенд и фронтенд запускаются отдельно для удобства разработки.

### 1. Запуск Backend (FastAPI)

```bash
cd backend
python -m venv venv

# Активация окружения (Windows)
venv\Scripts\activate
# Активация окружения (macOS/Linux)
source venv/bin/activate

pip install -r requirements.txt
python main.py
```
> Бэкенд будет доступен по адресу: `http://localhost:8000`

### 2. Запуск Frontend (Vite)

```bash
cd finance-app
npm install
npm run dev
```
> Фронтенд будет доступен по адресу: `http://localhost:5173`

---

## 🛠️ Разработка и сборка

При сборке в продакшен фронтенд собирается в папку `backend/dist`, и FastAPI сам раздает статику, что позволяет запускать приложение как единое целое.

```bash
cd finance-app
npm run build
# Файлы соберутся в ../backend/dist
```

## 🤝 Вклад в проект

Пулл-реквесты приветствуются. Если вы хотите внести значительные изменения, пожалуйста, сначала откройте issue для обсуждения.

## 📝 Лицензия

MIT License
