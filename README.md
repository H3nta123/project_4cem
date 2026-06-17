<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/wallet.svg" alt="Logo" width="80" height="80">
  <h1 align="center">ФинансПро (FinansPro)</h1>
  <p align="center">
    <strong>Современное, приватное и безопасное десктопное приложение для управления личными финансами.</strong>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white" alt="Electron" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  </p>
</div>

---

## 🌟 О проекте

**ФинансПро** — это инструмент для бюджетирования, который ставит во главу угла **приватность**. Все ваши финансовые данные хранятся исключительно локально на вашем устройстве. Никаких облачных баз данных, скрытой телеметрии или платных подписок. Только вы и ваши финансы.

### Ключевые возможности

- 📊 **Бюджетирование на 52 недели:** Удобное планирование доходов и расходов на весь год с гранулярностью до недели.
- 🎯 **План vs Факт:** Отслеживание реального выполнения финансового плана с автоматическим расчетом отклонений.
- 🔮 **Сценарный анализ (What-If):** Моделирование различных финансовых ситуаций (падение доходов, рост расходов, новые кредиты) в изолированных песочницах без влияния на основные данные.
- 📥 **Умный импорт:** Автоматическое распознавание и загрузка банковских выписок (включая прямой парсинг неструктурированных PDF-выписок Сбербанка, а также CSV и Excel).
- 📈 **Инвестиции и Кредиты:** Единый дашборд для учета активов и пассивов с автоматическим расчетом графиков выплат.
- 🎨 **Современный UI/UX:** Темная/Светлая тема, отзывчивый дизайн и интерактивные графики на базе Recharts.

---

## 🏗 Архитектура

Проект построен по гибридной архитектуре, объединяющей мощь веб-технологий и Python в едином десктопном приложении:

*   **Оболочка (Host):** `Electron` — обеспечивает нативный оконный интерфейс и изоляцию процессов.
*   **Frontend (UI):** `React 18` + `TypeScript` + `Vite` + `Tailwind CSS`. SPA-приложение, общающееся с локальным сервером.
*   **Backend (API):** `FastAPI` (Python) — высокопроизводительный асинхронный REST API сервер, запускаемый как дочерний процесс Electron. Python выбран благодаря его непревзойденной экосистеме для анализа данных (Pandas) и парсинга PDF (pypdf).
*   **База данных:** `SQLite` через `SQLAlchemy ORM` — надежное локальное хранилище.

---

## 🛡 Безопасность (Security First)

Несмотря на то, что приложение работает локально, внедрены строгие механизмы защиты от других процессов в системе:

- **Межпроцессная аутентификация (IPC Auth):** При каждом запуске Electron генерирует уникальный криптографический `API-Key` (256-bit), который передается бэкенду. Frontend общается с API строго с использованием этого ключа.
- **Electron Hardening:** Строгая изоляция (отключен `nodeIntegration`, включен `contextIsolation`). Взаимодействие UI с ОС происходит только через жестко типизированный `preload.cjs` мост. Это исключает атаки класса XSS -> RCE.
- **Защита от Path Traversal** и строгая валидация всех загружаемых файлов через Pydantic.

---

## 🚀 Установка и Запуск (Для разработчиков)

Проект представляет собой монорепозиторий. Для локальной разработки потребуется запустить Backend и Frontend в разных терминалах.

### 1. Запуск Backend (FastAPI)
```bash
cd backend
python -m venv venv

# Активация окружения (Windows)
venv\Scripts\activate
# Для macOS/Linux: source venv/bin/activate

pip install -r requirements.txt
python main.py
```
*API будет доступно на `http://127.0.0.1:8001`*

### 2. Запуск Frontend (Vite)
```bash
cd finance-app
npm install
npm run dev
```
*UI будет доступен на `http://localhost:5173`*

---

## 📦 Сборка релизного .exe (Production)

Для сборки готового десктопного приложения Windows (с установщиком) используется связка PyInstaller + Electron Builder:

```bash
# 1. Сборка бэкенда в исполняемый файл
cd backend
venv\Scripts\activate
pip install pyinstaller
pyinstaller api.spec

# 2. Сборка фронтенда и упаковка приложения
cd ../finance-app
npm run build
npm run electron:build
```

Готовый `setup.exe` появится в папке `finance-app/dist_electron`.

---

## 🤖 Примечание о разработке

В процессе создания приложения активно применялись LLM для ускорения написания рутинного кода (Pydantic-схемы, CRUD), создания регулярных выражений для парсинга PDF и проведения статического аудита безопасности (SAST). Весь сгенерированный код прошел тщательное ручное тестирование и архитектурную адаптацию командой.


