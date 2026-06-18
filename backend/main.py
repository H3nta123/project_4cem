"""
ФинансПро — Entry point
Run with: python main.py
"""

import sys
import os
import socket
import time
import logging

import uvicorn
from api import app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("finanspro-main")

HOST = "127.0.0.1"
PORT = 8001


def is_port_free(host: str, port: int) -> bool:
    """Проверить, свободен ли порт."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)
        s.bind((host, port))
        s.close()
        return True
    except OSError:
        return False


def wait_for_port_free(host: str, port: int, timeout: float = 5.0) -> bool:
    """Подождать, пока порт освободится (макс. timeout секунд)."""
    start = time.time()
    while time.time() - start < timeout:
        if is_port_free(host, port):
            return True
        logger.info(f"Порт {port} занят, ожидание освобождения...")
        time.sleep(0.5)
    return False


def kill_process_on_port(host: str, port: int):
    """Попытаться убить процесс, занимающий порт (только Windows)."""
    if sys.platform != "win32":
        return
    try:
        import subprocess
        result = subprocess.run(
            ["netstat", "-aon"],
            capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.splitlines():
            if f":{port}" in line and "LISTENING" in line:
                parts = line.strip().split()
                pid = parts[-1]
                if pid and pid.isdigit() and int(pid) != os.getpid():
                    logger.info(f"Убиваем процесс PID={pid}, занимающий порт {port}")
                    subprocess.run(
                        ["taskkill", "/PID", pid, "/F", "/T"],
                        capture_output=True, timeout=5
                    )
    except Exception as e:
        logger.warning(f"Не удалось убить процесс на порту {port}: {e}")


if __name__ == "__main__":
    is_frozen = getattr(sys, 'frozen', False)

    # Если порт занят — попробовать освободить
    if not is_port_free(HOST, PORT):
        logger.warning(f"Порт {PORT} занят. Попытка освободить...")
        kill_process_on_port(HOST, PORT)
        if not wait_for_port_free(HOST, PORT, timeout=5.0):
            logger.error(f"Порт {PORT} не удалось освободить! Запуск невозможен.")
            sys.exit(1)

    logger.info(f"Запуск сервера на {HOST}:{PORT}")

    if is_frozen:
        # Direct reference required in frozen (PyInstaller) mode
        uvicorn.run(app, host=HOST, port=PORT, reload=False)
    else:
        # String format allows auto-reload in development
        uvicorn.run("api:app", host=HOST, port=PORT, reload=True)
