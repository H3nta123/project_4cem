"""
ФинансПро — Entry point
Run with: python main.py
"""

import sys
import uvicorn
from api import app

if __name__ == "__main__":
    # Disable reload when running as a PyInstaller bundle
    is_frozen = getattr(sys, 'frozen', False)
    if is_frozen:
        # Direct reference required in frozen (PyInstaller) mode
        uvicorn.run(app, host="127.0.0.1", port=8001, reload=False)
    else:
        # String format allows auto-reload in development
        uvicorn.run("api:app", host="127.0.0.1", port=8001, reload=True)
