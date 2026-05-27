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

import uvicorn
import webview

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("finanspro-launcher")

HOST = "127.0.0.1"
PORT = 8000


def find_free_port(start=8000, end=8100):
    """Find a free port in the given range."""
    for port in range(start, end):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.bind((HOST, port))
            s.close()
            return port
        except OSError:
            continue
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
        with open("server_crash.log", "w", encoding="utf-8") as f:
            f.write(f"Server crashed: {str(e)}\n")
            f.write(traceback.format_exc())
        logger.error(f"Server crashed: {e}")

def main():
    global PORT
    PORT = find_free_port()
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
