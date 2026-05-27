# -*- mode: python ; coding: utf-8 -*-
"""
ФинансПро — PyInstaller spec file
Bundles: Python backend + frontend dist → single-folder app
"""

import os
import sys

block_cipher = None

# Paths
backend_dir = os.path.dirname(os.path.abspath(SPEC))
dist_dir = os.path.join(backend_dir, 'dist')

python_dir = os.path.dirname(sys.executable)
dlls_dir = os.path.join(python_dir, 'DLLs')
extra_binaries = []
if os.path.exists(dlls_dir):
    for dll_name in ['libcrypto-3.dll', 'libssl-3.dll', 'sqlite3.dll', 'libffi-8.dll']:
        dll_path = os.path.join(dlls_dir, dll_name)
        if os.path.exists(dll_path):
            extra_binaries.append((dll_path, '.'))

a = Analysis(
    ['launcher.py'],
    pathex=[backend_dir],
    binaries=extra_binaries,
    datas=[
        (dist_dir, 'dist'),          # Frontend build
        ('api.py', '.'),
        ('database.py', '.'),
        ('schemas.py', '.'),
        ('seed.py', '.'),
    ],
    hiddenimports=[
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.off',
        'fastapi',
        'fastapi.middleware',
        'fastapi.middleware.cors',
        'fastapi.staticfiles',
        'fastapi.responses',
        'starlette',
        'starlette.routing',
        'starlette.middleware',
        'starlette.middleware.cors',
        'starlette.staticfiles',
        'starlette.responses',
        'starlette.formparsers',
        'starlette.status',
        'sqlalchemy',
        'sqlalchemy.dialects.sqlite',
        'pydantic',
        'pydantic._internal',
        'api',
        'database',
        'schemas',
        'seed',
        'multipart',
        'email_validator',
        'anyio',
        'anyio._backends',
        'anyio._backends._asyncio',
        'sniffio',
        'httptools',
        'dotenv',
        'yaml',
        'h11',
        'webview',
        'webview.platforms.edgechromium',
        'webview.platforms.mshtml',
        'clr',
        'pythonnet',
        'ssl',
        '_ssl',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='FinansPro',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,          # No console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='FinansPro',
)
