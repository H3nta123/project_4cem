"""
ФинансПро — Desktop Launcher
Starts the FastAPI server and opens a native desktop window via pywebview.
This file is the PyInstaller entry point.
"""

import sys
import os
import threading
import time
import logging
import socket
import subprocess

import uvicorn
import webview

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("finanspro-launcher")

HOST = "127.0.0.1"
PORT = 8001  # Совпадает с портом, захардкоженным во фронтенде


def is_port_free(host, port):
    """Check if a port is available."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)
        s.bind((host, port))
        s.close()
        return True
    except OSError:
        return False


def kill_process_on_port(host, port):
    """Kill any process listening on the given port (Windows only)."""
    if sys.platform != "win32":
        return
    try:
        result = subprocess.run(
            ["netstat", "-aon"],
            capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.splitlines():
            if f":{port}" in line and "LISTENING" in line:
                parts = line.strip().split()
                pid = parts[-1]
                if pid and pid.isdigit() and int(pid) != os.getpid():
                    logger.info(f"Killing stale process PID={pid} on port {port}")
                    subprocess.run(
                        ["taskkill", "/PID", pid, "/F", "/T"],
                        capture_output=True, timeout=5
                    )
    except Exception as e:
        logger.warning(f"Could not kill process on port {port}: {e}")


def wait_for_port_free(host, port, timeout=5.0):
    """Wait for a port to become free."""
    start = time.time()
    while time.time() - start < timeout:
        if is_port_free(host, port):
            return True
        time.sleep(0.3)
    return False


def find_free_port(start=8001, end=8100):
    """Find a free port in the given range."""
    for port in range(start, end):
        if is_port_free(HOST, port):
            return port
    return start


import api
import traceback

def run_server(port: int):
    """Start the uvicorn server in a separate thread."""
    try:
        uvicorn.run(
            api.app,
            host=HOST,
            port=port,
            reload=False,
            log_level="warning",
        )
    except Exception as e:
        # If server crashes, log it to a file
        log_path = os.path.join(
            os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(__file__),
            "server_crash.log"
        )
        with open(log_path, "w", encoding="utf-8") as f:
            f.write(f"Server crashed: {str(e)}\n")
            f.write(traceback.format_exc())
        logger.error(f"Server crashed: {e}")

def main():
    global PORT

    # ─── Освобождаем порт, если он занят старым экземпляром ───
    if not is_port_free(HOST, PORT):
        logger.warning(f"Port {PORT} is busy, trying to free it...")
        kill_process_on_port(HOST, PORT)
        if not wait_for_port_free(HOST, PORT, timeout=5.0):
            logger.warning(f"Port {PORT} still busy, finding alternative...")
            PORT = find_free_port(PORT + 1)
            logger.info(f"Using alternative port: {PORT}")

    logger.info(f"Starting ФинансПро server on {HOST}:{PORT}")

    # Start the server in a daemon thread so it shuts down when the window closes
    server_thread = threading.Thread(target=run_server, args=(PORT,), daemon=True)
    server_thread.start()

    url = f"http://{HOST}:{PORT}"
    
    # Wait for the server to be ready
    for _ in range(30):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1)
            s.connect((HOST, PORT))
            s.close()
            break
        except (ConnectionRefusedError, socket.timeout, OSError):
            time.sleep(0.5)

    logger.info(f"Opening native window for {url}")
    # Create the native desktop window using pywebview
    webview.create_window(
        "ФинансПро",
        url,
        width=1280,
        height=800,
        min_size=(800, 600),
        background_color='#0f172a' # Dark theme background
    )
    # Start the webview GUI loop (blocking)
    webview.start()


if __name__ == "__main__":
    main()
