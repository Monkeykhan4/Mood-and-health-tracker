from flask import Flask, render_template, request, jsonify
import sqlite3
import os
import subprocess
import requests
import time
import glob
from datetime import datetime

# Initialize Flask FIRST
app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'health.db')

# LLM Manager Class 
class LLMManager:
    def __init__(self):
        self.process = None
        self.api_url = "http://localhost:8080/completion"
        self.conversation_history = []
        self.max_history = 10
        self.health_data_snapshot = ""  # Store initial health context
        self.system_prompt = """You are A.R.I.A. (Adaptive Response Intelligence Algorithm), a local AI fitness coach with vaporwave aesthetic.

CRITICAL INSTRUCTIONS:
- DO NOT repeat the user's weight, BMI, or workout history in every response
- Mention health metrics ONLY when relevant to the specific question
- If user asks "How am I doing?" - reference their trends briefly
- If user asks about workouts - suggest based on their current state
- DO NOT say "I see you weigh X kg" or "You did Y workout" as a greeting
- Speak like a coach who remembers the context, not a data reporter
- Use cyberpunk slang: "neural gains", "synthwave stamina", "chrome gains"

Response style: Short, punchy, actionable. No data dumps."""

    def list_models(self):
        models_path = os.path.join(os.path.dirname(__file__), 'models', '*.gguf')
        files = glob.glob(models_path)
        return [os.path.basename(f) for f in files]
    
    def start(self, model_name, context_length):
        if self.is_running():
            return {"status": "already_running"}
            
        model_path = os.path.join(os.path.dirname(__file__), 'models', model_name)
        if not os.path.exists(model_path):
            return {"status": "error", "message": f"Model not found: {model_path}"}
        
        # Reset conversation
        self.conversation_history = []
        self.health_data_snapshot = ""
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("""INSERT OR REPLACE INTO ai_config (id, model_path, context_length, is_running, port)
                   VALUES (1, ?, ?, 1, 8080)""", (model_name, context_length))
        conn.commit()
        conn.close()
        
        server_exe = os.path.join(os.path.dirname(__file__), "llama-cpp", "llama-server.exe")
        
        cmd = [
            server_exe,
            "-m", model_path,
            "-c", str(context_length),
            "--port", "8080",
            "--host", "127.0.0.1",
            "-t", "6",
            "-ngl", "35",
            "--main-gpu", "0",
            "--batch-size", "512",
            "--temp", "0.7"
        ]
        
        try:
            self.process = subprocess.Popen(
                cmd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            def read_output():
                for line in self.process.stdout:
                    print(f"LLAMA: {line.strip()}")
            
            import threading
            threading.Thread(target=read_output, daemon=True).start()
            
        except Exception as e:
            return {"status": "error", "message": str(e)}
        
        for i in range(60):
            time.sleep(1)
            if self.is_running():
                return {"status": "online", "model": model_name}
        
        return {"status": "timeout"}
    
    def stop(self):
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except:
                self.process.kill()
            self.process = None
        
        self.conversation_history = []
        self.health_data_snapshot = ""
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("UPDATE ai_config SET is_running = 0 WHERE id = 1")
        conn.commit()
        conn.close()
        return {"status": "stopped"}
    
    def is_running(self):
        try:
            r = requests.get("http://localhost:8080/health", timeout=2)
            return r.status_code == 200
        except:
            return False
    
    def chat(self, user_message, health_context):
        if not self.is_running():
            return {"error": "AI offline"}
        
        is_first_message = len(self.conversation_history) == 0
        
        # Only fetch health data for the FIRST message
        if is_first_message:
            self.health_data_snapshot = self._compress_health_data()
            health_section = f"""[INITIAL_HEALTH_CONTEXT - Reference this throughout conversation, don't repeat verbatim]
{self.health_data_snapshot}
[/INITIAL_HEALTH_CONTEXT]

This is the start of our consultation."""
        else:
            # Subsequent messages: don't flood with data, just continue conversation
            health_section = "(Health context established in previousexchange. Continue naturally without repeating stats unless asked.)"

        # Build conversation history (only the actual chat, not the system prompts)
        history_str = ""
        for exchange in self.conversation_history[-self.max_history:]:
            history_str += f"User: {exchange['user']}\nA.R.I.A.: {exchange['aria']}\n"
        
        # Construct prompt - system prompt only once, then context, then history
        full_prompt = f"""{self.system_prompt}

{health_section}

{history_str}User: {user_message}
A.R.I.A.:"""
        
        try:
            r = requests.post(
                self.api_url,
                json={
                    "prompt": full_prompt,
                    "stop": ["User:", "</s>"],
                    "n_predict": 300,
                    "temperature": 0.7
                },
                timeout=120
            )
            result = r.json()
            response_text = result["content"].strip()
            
            # Save to history
            self.conversation_history.append({
                "user": user_message,
                "aria": response_text
            })
            
            # Trim history
            if len(self.conversation_history) > self.max_history:
                self.conversation_history = self.conversation_history[-self.max_history:]
            
            return {"response": response_text}
        except Exception as e:
            return {"error": str(e)}
    
    def clear_history(self):
        self.conversation_history = []
        self.health_data_snapshot = ""
        return {"status": "cleared"}

    def _compress_health_data(self):
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            
            weights = conn.execute("SELECT weight_kg FROM weights ORDER BY date DESC LIMIT 7").fetchall()
            weight_list = [str(w['weight_kg']) for w in reversed(weights)]
            current_weight = weights[0]['weight_kg'] if weights else "N/A"
            
            mood = conn.execute("SELECT AVG(mood_level) as avg FROM moods WHERE date >= date('now', '-14 days')").fetchone()
            mood_avg = round(mood['avg'], 1) if mood and mood['avg'] else 'N/A'
            
            workouts = conn.execute("""SELECT type, duration_min FROM workouts 
                                      WHERE date >= date('now', '-7 days') ORDER BY date DESC LIMIT 3""").fetchall()
            workout_summary = f"{len(workouts)} sessions" if workouts else "none recently"
            
            profile = conn.execute("SELECT target_weight, start_weight FROM profile WHERE id = 1").fetchone()
            target = profile['target_weight'] if profile else 'N/A'
            
            conn.close()
            
            return f"""Current: {current_weight}kg | Trend: {'→'.join(weight_list[-3:])} | Mood: {mood_avg}/5 | Recent workouts: {workout_summary} | Goal: {target}kg"""
        except Exception as e:
            return "Data unavailable"

# Initialize LLM Manager
llm = LLMManager()

# ALL YOUR EXISTING FUNCTIONS BELOW (keep these as they were):
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        height_cm REAL,
        age INTEGER,
        gender TEXT,
        start_weight REAL,
        target_weight REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS moods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE,
        mood_level INTEGER CHECK(mood_level BETWEEN 1 AND 5),
        note TEXT
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS weights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE,
        weight_kg REAL,
        bmi REAL
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        type TEXT,
        duration_min INTEGER,
        intensity TEXT,
        calories INTEGER
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS ai_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        model_path TEXT,
        context_length INTEGER DEFAULT 4096,
        system_prompt TEXT,
        is_running INTEGER DEFAULT 0,
        port INTEGER DEFAULT 8080
    )''')
    
    try:
        c.execute("ALTER TABLE profile ADD COLUMN age INTEGER")
    except:
        pass
    try:
        c.execute("ALTER TABLE profile ADD COLUMN gender TEXT")
    except:
        pass
    try:
        c.execute("ALTER TABLE profile ADD COLUMN start_weight REAL")
    except:
        pass
    
    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ALL ROUTES BELOW - DON'T CHANGE ANYTHING EXCEPT ADD THE NEW CLEAR ROUTE
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/profile', methods=['GET', 'POST', 'DELETE'])
def profile():
    conn = get_db()
    if request.method == 'POST':
        data = request.json
        c = conn.cursor()
        c.execute('''INSERT OR REPLACE INTO profile 
                   (id, height_cm, age, gender, start_weight, target_weight) 
                   VALUES (1, ?, ?, ?, ?, ?)''', 
                (data['height'], data.get('age'), data.get('gender'), 
                 data['start_weight'], data['target']))
        conn.commit()
        conn.close()
        return jsonify({'status': 'saved'})
    
    elif request.method == 'DELETE':
        c = conn.cursor()
        c.execute("DELETE FROM profile WHERE id = 1")
        c.execute("DELETE FROM weights")
        c.execute("DELETE FROM moods")
        c.execute("DELETE FROM workouts")
        conn.commit()
        conn.close()
        return jsonify({'status': 'deleted'})
    
    c = conn.cursor()
    row = c.execute('SELECT * FROM profile WHERE id = 1').fetchone()
    conn.close()
    return jsonify(dict(row) if row else {})

@app.route('/api/moods', methods=['GET', 'POST'])
def moods():
    conn = get_db()
    c = conn.cursor()
    if request.method == 'POST':
        data = request.json
        c.execute('''INSERT OR REPLACE INTO moods (date, mood_level, note) 
                   VALUES (?, ?, ?)''',
                (data['date'], data['level'], data.get('note', '')))
        conn.commit()
        conn.close()
        return jsonify({'status': 'saved'})
    
    c = conn.cursor()
    rows = c.execute('SELECT * FROM moods ORDER BY date').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/weights', methods=['GET', 'POST'])
def weights():
    conn = get_db()
    c = conn.cursor()
    
    c.execute('SELECT height_cm FROM profile WHERE id = 1')
    profile = c.fetchone()
    height = profile['height_cm'] if profile else 170
    
    if request.method == 'POST':
        data = request.json
        weight = data['weight']
        bmi = round(weight / ((height/100) ** 2), 1)
        
        c.execute('''INSERT OR REPLACE INTO weights (date, weight_kg, bmi) 
                   VALUES (?, ?, ?)''',
                (data['date'], weight, bmi))
        conn.commit()
        conn.close()
        return jsonify({'bmi': bmi})
    
    c = conn.cursor()
    rows = c.execute('SELECT * FROM weights ORDER BY date').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/weights/<int:id>', methods=['DELETE'])
def delete_weight(id):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM weights WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'deleted'})

@app.route('/api/stats')
def stats():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM profile WHERE id = 1')
    profile = c.fetchone()
    c.execute('SELECT * FROM weights ORDER BY date DESC LIMIT 1')
    latest = c.fetchone()
    c.execute('SELECT * FROM weights ORDER BY date ASC LIMIT 1')
    first = c.fetchone()
    conn.close()
    
    return jsonify({
        'profile': dict(profile) if profile else None,
        'latest_weight': dict(latest) if latest else None,
        'first_weight': dict(first) if first else None
    })

@app.route('/api/workouts', methods=['POST'])
def log_workout():
    data = request.json
    conn = get_db()
    c = conn.cursor()
    c.execute("""INSERT INTO workouts (date, type, duration_min, intensity, calories) 
                 VALUES (?, ?, ?, ?, ?)""",
              (data['date'], data['type'], data['duration'], data['intensity'], data.get('calories', 0)))
    conn.commit()
    conn.close()
    return jsonify({"status": "logged"})

@app.route('/api/ai/models')
def ai_models():
    return jsonify(llm.list_models())

@app.route('/api/ai/start', methods=['POST'])
def ai_start():
    data = request.json
    result = llm.start(data['model'], data['context_length'])
    return jsonify(result)

@app.route('/api/ai/stop', methods=['POST'])
def ai_stop():
    return jsonify(llm.stop())

@app.route('/api/ai/status')
def ai_status():
    running = llm.is_running()
    return jsonify({
        "running": running,
        "models": llm.list_models()
    })

@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    data = request.json
    result = llm.chat(data['message'], None)
    return jsonify(result)

# NEW ROUTE FOR CLEARING MEMORY
@app.route('/api/ai/clear', methods=['POST'])
def ai_clear():
    return jsonify(llm.clear_history())

if __name__ == '__main__':
    init_db()
    print("="*50)
    print("🌴 Vaporwave Health Tracker + A.R.I.A. System")
    print("="*50)
    print("Keep this window open to see debug messages")
    print("="*50)
    
    import webbrowser
    webbrowser.open('http://localhost:5000')
    app.run(debug=False, port=5000, threaded=True)