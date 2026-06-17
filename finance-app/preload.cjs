/**
 * Preload script — безопасный мост между Electron (Node.js) и React (web).
 * Экспонирует в window.electronAPI только необходимый минимум.
 */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    /** API-ключ, переданный из main-процесса через аргументы */
    getApiKey: () => {
        // main.cjs передаёт ключ через --api-key=<token> в argv
        // но preload получает его через env переменную, установленную main процессом
        return process.env.FINANSPRO_API_KEY || '';
    },
});
