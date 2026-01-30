
NEON HEALTH + A.R.I.A. SYSTEM - COMPLETE SETUP GUIDE


For: Windows 10/11 (Mac/Linux requires path adjustments)
Author: Monkey Mehrab
Version: 3.0


PART 1: REQUIRED DOWNLOADS & INSTALLATION
-----------------------------------------

STEP 1: INSTALL PYTHON
----------------------
Download: https://www.python.org/downloads/windows/
Version: Python 3.10 or newer (3.11 recommended)
IMPORTANT: Check "Add Python to PATH" during installation

Verify installation:
    Open CMD and type: python --version

STEP 2: INSTALL REQUIRED PYTHON LIBRARIES
-----------------------------------------
Open CMD in the project folder and run:

    pip install flask

Or if that fails:
    python -m pip install flask

This is the ONLY Python library required. Everything else is built-in.

STEP 3: DOWNLOAD LLAMA.CPP (AI Engine)
--------------------------------------
URL: https://github.com/ggerganov/llama.cpp/releases

Choose based on your hardware:

[FOR NVIDIA GPU USERS - RTX 20xx/30xx/40xx series]
Download: llama-bXXXX-bin-win-cuda-cu12.4-x64.zip
(Where XXXX is the latest build number, e.g., b7885)

Also download: cudart-llama-bin-win-cuda-12.4-x64.zip
(This provides CUDA runtime DLLs)

Extract BOTH zips to: Vaporwave-health/llama-cpp/

[FOR CPU ONLY USERS - No dedicated GPU]
Download: llama-bXXXX-bin-win-avx2-x64.zip
(AVX2 version for modern CPUs)

Extract to: Vaporwave-health/llama-cpp/

[FOR OLDER CPUs]
Download: llama-bXXXX-bin-win-avx-x64.zip
(Only if AVX2 version crashes)

PART 2: FOLDER STRUCTURE SETUP
------------------------------

Create this exact structure:

Vaporwave-health/                    <-- Main project folder
├── app.py                           <-- Main application
├── start.bat                        <-- Launch script
├── health.db                        <-- Created automatically on first run
├── llama-cpp/                       <-- Extract llama.cpp here
│   ├── llama-server.exe             <-- Main AI server
│   ├── llama-cli.exe
│   ├── cudart64_12.dll              <-- From cudart zip (GPU only)
│   └── [other .dll files...]
├── models/                          <-- Create this folder
│   └── [your .gguf models here]     <-- Download AI brains here
├── templates/
│   └── index.html                   <-- Web interface
└── static/
    ├── style.css                    <-- Styling
    └── script.js                    <-- Logic


PART 3: DOWNLOAD AI MODELS (.gguf files)
----------------------------------------

Place these in the /models/ folder

RECOMMENDED FOR 7B CLASS (Best balance):
----------------------------------------
Name: Llama-3.1-8B-Instruct-Q4_K_M.gguf
Size: ~4.9 GB
Source: https://huggingface.co/TheBloke/Llama-3.1-8B-Instruct-GGUF
Best for: General fitness coaching, good reasoning

Alternative: Meta-Llama-3-8B-Instruct-Q4_K_M.gguf
Source: https://huggingface.co/TheBloke/Meta-Llama-3-8B-Instruct-GGUF

FAST OPTION (Lower quality):
----------------------------
Name: Phi-3-mini-4k-instruct-Q5_K_M.gguf
Size: ~2.3 GB
Source: https://huggingface.co/TheBloke/Phi-3-mini-4k-instruct-GGUF
Best for: Slow CPUs, less VRAM

HIGH QUALITY OPTION:
--------------------
Name: Llama-3.1-8B-Instruct-Q5_K_M.gguf
Size: ~5.7 GB
Better quality, slower inference

HOW TO DOWNLOAD:
1. Visit the HuggingFace link
2. Click "Files and versions" tab
3. Find the Q4_K_M or Q5_K_M file
4. Click download arrow (down arrow icon)
5. Save to Vaporwave-health/models/

PART 4: HARDWARE REQUIREMENTS
-----------------------------

MINIMUM (CPU Only):
-------------------
CPU: Any modern CPU (Intel i5/AMD Ryzen 5 or better)
RAM: 8 GB system RAM
Storage: 10 GB free space
OS: Windows 10/11 64-bit
Performance: 2-5 tokens/second (usable but slow)

RECOMMENDED (GPU):
------------------
GPU: NVIDIA GTX 1060 6GB or better
     RTX 2060/3060/4060 (excellent)
     RTX 4070 Super (optimal - 40+ tokens/sec)
VRAM: 6GB+ dedicated GPU memory
RAM: 16 GB system RAM
Storage: SSD with 10 GB free
Performance: 20-60 tokens/second (instant responses)

NOT SUPPORTED:
--------------
- AMD GPUs (llama.cpp ROCm support is experimental)
- Intel integrated graphics (will fallback to CPU)
- Windows 7/8
- 32-bit systems


PART 5: FIRST TIME SETUP
------------------------

1. Double-click start.bat
2. Browser opens automatically to http://localhost:5000
3. Initialize your profile in BIO_METRICS tab
4. Go to A.R.I.A. tab
5. Select your downloaded .gguf model from dropdown
6. Adjust context window (4096 recommended for 7B models)
7. Click "INITIALIZE A.R.I.A."
8. Wait 10-30 seconds for model to load into VRAM/RAM
9. Status dot turns green when ready
10. Start chatting!


PART 6: TROUBLESHOOTING
-----------------------

ERROR: "llama-server.exe not found"
------------------------------------
Fix: Extract llama.cpp files to llama-cpp/ folder (not root)

ERROR: "No models found"
------------------------
Fix: Download .gguf file to models/ folder, refresh page

ERROR: "CUDA out of memory"
---------------------------
Fix: Lower context window to 2048, or use smaller Q4_K_M model
     Close other GPU-heavy apps (games, video editors)

ERROR: "AI offline" after clicking initialize
---------------------------------------------
Fix: Check CMD window for error messages
     Common: Missing cudart64_12.dll (extract cudart zip properly)
     Common: Model file corrupted (re-download)

ERROR: App won't start
---------------------
Fix: Check Python is in PATH
     Run: pip install flask

SLOW RESPONSES:
---------------
Normal for CPU. For GPU speed, ensure:
- You downloaded CUDA version (not AVX2)
- -ngl 35 flag is set (GPU layers offloaded)
- No other apps using GPU


PART 7: FILE MANIFEST (What Each File Does)
-------------------------------------------

app.py              - Flask web server, database logic, AI integration
start.bat           - One-click launcher (opens browser + starts server)
health.db           - SQLite database (your data, created automatically)
templates/index.html - Web interface (3 tabs: Mood, Weight, AI)
static/style.css    - Visual styling (vaporwave theme)
static/script.js    - Frontend logic, charts, AI communication

llama-cpp/          - AI engine (llama.cpp compiled binaries)
models/*.gguf       - AI model weights (the "brain")


PART 8: UPDATING THE APP
------------------------

To update llama.cpp:
1. Download new release from GitHub
2. Extract to llama-cpp/ (overwrite old files)
3. Restart app

To update AI model:
1. Download new .gguf to models/
2. Select in A.R.I.A. tab
3. Old models can be deleted to save space


SUPPORT & DOCUMENTATION

Llama.cpp: https://github.com/ggerganov/llama.cpp
Models: https://huggingface.co/TheBloke
Flask: https://flask.palletsprojects.com/
