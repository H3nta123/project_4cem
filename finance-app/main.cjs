const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

let backendProcess = null;

// ─── Генерируем случайный API-ключ при каждом запуске ────
const API_KEY = crypto.randomBytes(32).toString('hex');

// ─── Single instance lock ────────────────────────────────
// Предотвращает запуск нескольких копий приложения
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
    process.exit(0);
}

app.on('second-instance', () => {
    // Если пользователь пытается открыть вторую копию — фокусируем существующее окно
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        if (windows[0].isMinimized()) windows[0].restore();
        windows[0].focus();
    }
});

// ─── Утилиты для управления бэкенд-процессом ────────────

/**
 * Убить все висящие процессы api.exe от предыдущих запусков.
 * На Windows process.kill() не всегда работает, поэтому используем taskkill.
 */
function killOldBackend() {
    if (process.platform === 'win32') {
        try {
            execSync('taskkill /IM api.exe /F /T', { stdio: 'ignore' });
        } catch (e) {
            // Процесс не найден — это нормально
        }
    }
}

/**
 * Корректно убить текущий бэкенд-процесс вместе с дочерними.
 */
function killBackendProcess() {
    if (!backendProcess) return;
    try {
        if (process.platform === 'win32' && backendProcess.pid) {
            // На Windows убиваем всё дерево процессов через taskkill
            execSync(`taskkill /PID ${backendProcess.pid} /F /T`, { stdio: 'ignore' });
        } else {
            backendProcess.kill('SIGKILL');
        }
    } catch (e) {
        // Процесс уже завершён
    }
    backendProcess = null;
}

/**
 * Подождать, пока порт освободится (макс. timeout мс).
 */
function waitForPortFree(port, timeout = 3000) {
    return new Promise((resolve) => {
        const start = Date.now();
        function check() {
            const net = require('net');
            const server = net.createServer();
            server.once('error', () => {
                if (Date.now() - start >= timeout) {
                    resolve(false);
                } else {
                    setTimeout(check, 200);
                }
            });
            server.once('listening', () => {
                server.close(() => resolve(true));
            });
            server.listen(port, '127.0.0.1');
        }
        check();
    });
}

/**
 * Wait for the backend server to respond on the given port.
 * Retries every 500ms up to maxAttempts times.
 */
function waitForBackend(port, maxAttempts = 30) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        function check() {
            attempts++;
            const req = http.get({
                hostname: '127.0.0.1',
                port: port,
                path: '/api/settings',
                headers: { 'X-API-Key': API_KEY },
            }, (res) => {
                resolve();
            });
            req.on('error', () => {
                if (attempts >= maxAttempts) {
                    reject(new Error('Backend did not start in time'));
                } else {
                    setTimeout(check, 500);
                }
            });
            req.setTimeout(1000, () => {
                req.destroy();
                if (attempts >= maxAttempts) {
                    reject(new Error('Backend did not start in time'));
                } else {
                    setTimeout(check, 500);
                }
            });
        }
        check();
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false, // false чтобы preload имел доступ к process.env
            preload: path.join(__dirname, 'preload.cjs'),
        }
    });

    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(async () => {
    // ─── 1. Убиваем старые процессы бэкенда ─────────────
    killOldBackend();

    // ─── 2. Ждём освобождения порта ─────────────────────
    const PORT = 8001;
    const portFree = await waitForPortFree(PORT, 3000);
    if (!portFree) {
        console.warn(`Port ${PORT} still busy after cleanup, trying to start anyway...`);
    }

    // ─── 3. Находим путь к бэкенду ──────────────────────
    const isPacked = app.isPackaged;
    const backendExePath = isPacked
        ? path.join(process.resourcesPath, 'backend', 'api.exe')
        : path.join(__dirname, '..', 'backend', 'dist', 'api.exe');

    console.log(`Looking for backend at: ${backendExePath}`);
    console.log(`Exists: ${fs.existsSync(backendExePath)}`);

    // ─── 4. Передаём API-ключ в preload через переменную окружения ───
    process.env.FINANSPRO_API_KEY = API_KEY;

    // ─── 5. Запускаем бэкенд ────────────────────────────
    if (fs.existsSync(backendExePath)) {
        backendProcess = spawn(backendExePath, [], {
            detached: false,
            stdio: 'pipe',
            cwd: path.dirname(backendExePath),
            env: {
                ...process.env,
                FINANSPRO_API_KEY: API_KEY,
            },
        });

        backendProcess.stdout.on('data', (data) => {
            console.log(`[backend] ${data}`);
        });
        backendProcess.stderr.on('data', (data) => {
            console.error(`[backend] ${data}`);
        });
        backendProcess.on('error', (err) => {
            console.error(`Backend failed to start: ${err.message}`);
        });
        backendProcess.on('exit', (code) => {
            console.log(`Backend exited with code ${code}`);
            backendProcess = null;
        });

        // ─── 6. Ждём готовности бэкенда ─────────────────
        try {
            await waitForBackend(PORT);
            console.log('Backend is ready!');
        } catch (e) {
            console.error('Backend wait timeout:', e.message);
        }
    } else {
        console.warn('Backend exe not found, frontend will try to connect anyway');
    }

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// ─── Корректное завершение бэкенда при выходе ────────────

app.on('before-quit', () => {
    killBackendProcess();
});

app.on('quit', () => {
    killBackendProcess();
});

app.on('window-all-closed', () => {
    killBackendProcess();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});