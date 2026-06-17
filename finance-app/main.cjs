const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

let backendProcess = null;

// ─── Генерируем случайный API-ключ при каждом запуске ────
const API_KEY = crypto.randomBytes(32).toString('hex');

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
    // In production (packaged), extraResources are placed in process.resourcesPath
    // In development, look relative to __dirname
    const isPacked = app.isPackaged;
    const backendExePath = isPacked
        ? path.join(process.resourcesPath, 'backend', 'api.exe')
        : path.join(__dirname, '..', 'backend', 'dist', 'api.exe');

    console.log(`Looking for backend at: ${backendExePath}`);
    console.log(`Exists: ${fs.existsSync(backendExePath)}`);

    // ─── Передаём API-ключ в preload через переменную окружения ───
    process.env.FINANSPRO_API_KEY = API_KEY;

    if (fs.existsSync(backendExePath)) {
        backendProcess = spawn(backendExePath, [], {
            detached: false,
            stdio: 'pipe',
            cwd: path.dirname(backendExePath),
            env: {
                ...process.env,
                FINANSPRO_API_KEY: API_KEY,  // Передаём ключ бэкенду
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

        // Wait for backend to be ready before showing UI
        try {
            await waitForBackend(8001);
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

app.on('quit', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});