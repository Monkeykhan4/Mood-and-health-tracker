let currentDate = new Date();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let selectedMood = null;
let moodData = {};
let weightData = [];
let chartInstance = null;
let currentView = 'month';
let profileData = null;

function switchTab(tab, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tab + '-tab').classList.add('active');
    if (btn) btn.classList.add('active');
    
    if (tab === 'weight') initWeightTab();
    if (tab === 'ai') loadAIModels();
}

function setMoodView(view) {
    currentView = view;
    document.getElementById('month-view').style.display = view === 'month' ? 'block' : 'none';
    document.getElementById('year-view').style.display = view === 'year' ? 'block' : 'none';
    document.getElementById('btn-month').classList.toggle('active', view === 'month');
    document.getElementById('btn-year').classList.toggle('active', view === 'year');
    
    if (view === 'year') generateYearView(currentYear);
    else generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
}

function changeYear(delta) {
    currentYear += delta;
    generateYearView(currentYear);
}

function generateYearView(year) {
    document.getElementById('current-year').textContent = year;
    const grid = document.getElementById('year-grid');
    grid.innerHTML = '';
    
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    months.forEach((monthName, monthIdx) => {
        const block = document.createElement('div');
        block.className = 'month-block';
        
        const title = document.createElement('div');
        title.className = 'month-title';
        title.textContent = monthName;
        block.appendChild(title);
        
        const miniCal = document.createElement('div');
        miniCal.className = 'mini-calendar';
        
        const firstDay = new Date(year, monthIdx, 1).getDay();
        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
        
        for (let i = 0; i < firstDay; i++) {
            const pad = document.createElement('div');
            pad.className = 'mini-day';
            pad.style.opacity = '0.2';
            miniCal.appendChild(pad);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const cell = document.createElement('div');
            cell.className = 'mini-day';
            cell.textContent = day;
            
            if (moodData[dateStr]) {
                cell.classList.add(`mood-${moodData[dateStr].level}`);
            }
            
            cell.onclick = () => openMoodModal(dateStr);
            miniCal.appendChild(cell);
        }
        
        block.appendChild(miniCal);
        grid.appendChild(block);
    });
}

function generateCalendar(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    
    const grid = document.getElementById('calendar');
    grid.innerHTML = '';
    
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    days.forEach(day => {
        const div = document.createElement('div');
        div.className = 'day-header';
        div.textContent = day;
        grid.appendChild(div);
    });
    
    for (let i = 0; i < startPadding; i++) {
        const div = document.createElement('div');
        div.className = 'day-cell other-month';
        grid.appendChild(div);
    }
    
    const today = new Date();
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const div = document.createElement('div');
        div.className = 'day-cell';
        div.textContent = i;
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
            div.classList.add('today');
        }
        
        if (moodData[dateStr]) {
            div.classList.add(`mood-${moodData[dateStr].level}`);
            if (moodData[dateStr].note) {
                div.style.border = '2px solid #fff';
            }
        }
        
        div.onclick = () => openMoodModal(dateStr);
        grid.appendChild(div);
    }
    
    document.getElementById('current-month').textContent = 
        new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
}

function openMoodModal(date) {
    selectedDate = date;
    document.getElementById('modal-date').textContent = date;
    document.getElementById('mood-modal').classList.add('active');
    
    if (moodData[date]) {
        selectMood(moodData[date].level);
        document.getElementById('mood-note').value = moodData[date].note || '';
    } else {
        selectMood(null);
        document.getElementById('mood-note').value = '';
    }
}

function closeModal() {
    document.getElementById('mood-modal').classList.remove('active');
}

function selectMood(level) {
    selectedMood = level;
    document.querySelectorAll('.mood-option').forEach(el => {
        el.classList.toggle('selected', parseInt(el.dataset.level) === level);
    });
}

async function saveMood() {
    if (!selectedMood) return alert('SELECT MOOD LEVEL');
    
    const note = document.getElementById('mood-note').value;
    
    await fetch('/api/moods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, level: selectedMood, note })
    });
    
    moodData[selectedDate] = { level: selectedMood, note };
    
    if (currentView === 'month') {
        generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
    } else {
        generateYearView(currentYear);
    }
    closeModal();
}

async function initWeightTab() {
    const response = await fetch('/api/stats');
    const data = await response.json();
    profileData = data.profile;
    
    if (!data.profile) {
        document.getElementById('profile-setup').style.display = 'block';
        document.getElementById('weight-dashboard').style.display = 'none';
    } else {
        document.getElementById('profile-setup').style.display = 'none';
        document.getElementById('weight-dashboard').style.display = 'block';
        
        document.getElementById('target-display').textContent = data.profile.target_weight + 'kg';
        document.getElementById('start-weight-display').textContent = (data.profile.start_weight || '--') + 'kg';
        
        if (data.latest_weight) {
            document.getElementById('current-weight').textContent = data.latest_weight.weight_kg + 'kg';
            document.getElementById('current-bmi').textContent = data.latest_weight.bmi;
            updateProgress(data.latest_weight.weight_kg, data.profile);
        } else if (data.profile.start_weight) {
            document.getElementById('current-weight').textContent = data.profile.start_weight + 'kg';
        }
        
        loadWeightList();
        loadChart();
    }
    
    document.getElementById('weight-date').valueAsDate = new Date();
}

async function saveProfile() {
    const height = parseFloat(document.getElementById('setup-height').value);
    const age = parseInt(document.getElementById('setup-age').value);
    const gender = document.getElementById('setup-gender').value;
    const startWeight = parseFloat(document.getElementById('setup-start-weight').value);
    const target = parseFloat(document.getElementById('setup-target').value);
    
    if (!height || !startWeight || !target) return alert('ENTER REQUIRED DATA');
    
    await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ height, age, gender, start_weight: startWeight, target })
    });
    
    await fetch('/api/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString().split('T')[0], weight: startWeight })
    });
    
    initWeightTab();
}

async function addWeight() {
    const date = document.getElementById('weight-date').value;
    const weight = parseFloat(document.getElementById('weight-input').value);
    
    if (!date || !weight) return alert('ENTER ALL DATA');
    
    const response = await fetch('/api/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, weight })
    });
    
    const result = await response.json();
    document.getElementById('current-weight').textContent = weight + 'kg';
    document.getElementById('current-bmi').textContent = result.bmi;
    
    updateProgress(weight, profileData);
    loadWeightList();
    loadChart();
    document.getElementById('weight-input').value = '';
}

function updateProgress(current, profile) {
    if (!profile || !profile.start_weight) return;
    
    const start = profile.start_weight;
    const target = profile.target_weight;
    const totalDistance = target - start;
    const currentDistance = current - start;
    
    let percentage = 0;
    if (totalDistance !== 0) {
        percentage = (currentDistance / totalDistance) * 100;
    }
    
    const sign = percentage >= 0 ? '' : '-';
    const absPercent = Math.abs(percentage).toFixed(1);
    document.getElementById('percentage-display').textContent = `${sign}${absPercent}%`;
    document.getElementById('progress-text').textContent = 
        percentage >= 100 ? 'GOAL REACHED!' : 
        percentage < 0 ? `${absPercent}% BEHIND START` : 
        `${absPercent}% TO GOAL`;
    
    const visualPercent = Math.max(0, Math.min(100, percentage));
    document.getElementById('track-start').textContent = `${start}kg`;
    document.getElementById('track-goal').textContent = `${target}kg`;
    
    const runner = document.querySelector('.runner');
    if (percentage < 0) {
        runner.style.transform = 'scaleX(1)';
    } else {
        runner.style.transform = 'scaleX(-1)';
    }
    
    runner.style.left = `calc(${visualPercent}% - 20px)`;
}

async function loadWeightList() {
    const response = await fetch('/api/weights');
    const weights = await response.json();
    weightData = weights;
    
    const list = document.getElementById('weight-list');
    list.innerHTML = '';
    
    [...weights].reverse().slice(0, 10).forEach(entry => {
        const item = document.createElement('div');
        item.className = 'data-item';
        item.innerHTML = `
            <span>${entry.date}: ${entry.weight_kg}kg (BMI: ${entry.bmi})</span>
            <button onclick="deleteWeight(${entry.id})" class="retro-btn danger" style="padding: 2px 8px; font-size: 0.8em;">DELETE</button>
        `;
        list.appendChild(item);
    });
}

async function deleteWeight(id) {
    if (!confirm('DELETE THIS ENTRY?')) return;
    
    await fetch(`/api/weights/${id}`, { method: 'DELETE' });
    loadWeightList();
    loadChart();
    
    const response = await fetch('/api/stats');
    const data = await response.json();
    if (data.latest_weight && data.profile) {
        updateProgress(data.latest_weight.weight_kg, data.profile);
        document.getElementById('current-weight').textContent = data.latest_weight.weight_kg + 'kg';
        document.getElementById('current-bmi').textContent = data.latest_weight.bmi;
    }
}

function openProfileEdit() {
    if (!profileData) return;
    document.getElementById('edit-height').value = profileData.height_cm || '';
    document.getElementById('edit-age').value = profileData.age || '';
    document.getElementById('edit-gender').value = profileData.gender || 'male';
    document.getElementById('edit-target').value = profileData.target_weight || '';
    document.getElementById('profile-modal').classList.add('active');
}

function closeProfileModal() {
    document.getElementById('profile-modal').classList.remove('active');
}

async function updateProfile() {
    const height = parseFloat(document.getElementById('edit-height').value);
    const age = parseInt(document.getElementById('edit-age').value);
    const gender = document.getElementById('edit-gender').value;
    const target = parseFloat(document.getElementById('edit-target').value);
    
    if (!height || !target) return alert('ENTER REQUIRED DATA');
    
    await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            height, 
            age, 
            gender, 
            start_weight: profileData.start_weight, 
            target 
        })
    });
    
    closeProfileModal();
    initWeightTab();
}

async function resetData() {
    if (!confirm('WARNING: DELETE ALL PROFILE DATA?\n\nTHIS CANNOT BE UNDONE.')) return;
    
    await fetch('/api/profile', { method: 'DELETE' });
    location.reload();
}

async function loadChart() {
    const response = await fetch('/api/weights');
    const weights = await response.json();
    const profileRes = await fetch('/api/profile');
    const profile = await profileRes.json();
    
    if (weights.length === 0) return;
    
    const labels = weights.map(w => w.date);
    const weightData = weights.map(w => w.weight_kg);
    const bmiData = weights.map(w => w.bmi);
    const targetLine = new Array(labels.length).fill(profile.target_weight);
    const startLine = new Array(labels.length).fill(profile.start_weight);
    
    const ctx = document.getElementById('weightChart').getContext('2d');
    
    if (chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'WEIGHT (KG)',
                data: weightData,
                borderColor: '#FF0055',
                backgroundColor: 'rgba(255, 0, 85, 0.1)',
                tension: 0.4,
                borderWidth: 2
            }, {
                label: 'BMI',
                data: bmiData,
                borderColor: '#00F0FF',
                backgroundColor: 'rgba(0, 240, 255, 0.1)',
                tension: 0.4,
                borderWidth: 2,
                yAxisID: 'y1'
            }, {
                label: 'TARGET',
                data: targetLine,
                borderColor: '#B026FF',
                borderDash: [5, 5],
                borderWidth: 2,
                pointRadius: 0
            }, {
                label: 'START',
                data: startLine,
                borderColor: '#808080',
                borderDash: [2, 2],
                borderWidth: 1,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: {
                    labels: { color: '#00F0FF', font: { family: 'VT323', size: 14 } }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#B026FF', font: { family: 'VT323' } },
                    grid: { color: 'rgba(176, 38, 255, 0.2)' }
                },
                y: {
                    ticks: { color: '#FF0055', font: { family: 'VT323' } },
                    grid: { color: 'rgba(255, 0, 85, 0.2)' }
                },
                y1: {
                    position: 'right',
                    ticks: { color: '#00F0FF', font: { family: 'VT323' } },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// AI Functions
async function loadAIModels() {
    console.log("Loading AI models...");
    try {
        const res = await fetch('/api/ai/models');
        const models = await res.json();
        console.log("Models found:", models);
        
        const select = document.getElementById('model-select');
        if (models.length > 0) {
            select.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
        } else {
            select.innerHTML = '<option value="">NO .GGUF MODELS FOUND IN /models</option>';
        }
        
        // Check status
        const statusRes = await fetch('/api/ai/status');
        const status = await statusRes.json();
        console.log("AI Status:", status);
        
        if (status.running) {
            setAIOnline();
        }
    } catch (e) {
        console.error("Error loading AI:", e);
        document.getElementById('model-select').innerHTML = '<option value="">ERROR LOADING MODELS</option>';
    }
}

function updateCtxDisplay(val) {
    document.getElementById('ctx-value').textContent = val;
}

async function launchARIA() {
    const model = document.getElementById('model-select').value;
    const ctx = document.getElementById('context-slider').value;
    const btn = document.querySelector('#ai-config button.primary');
    const errorDiv = document.getElementById('ai-error');
    
    if (!model) {
        errorDiv.textContent = "ERROR: SELECT MODEL FILE FIRST";
        errorDiv.style.display = 'block';
        return;
    }
    
    errorDiv.style.display = 'none';
    btn.textContent = "INITIALIZING... (CHECK CONSOLE)";
    btn.disabled = true;
    
    console.log(`Starting ARIA with model: ${model}, context: ${ctx}`);
    
    try {
        const res = await fetch('/api/ai/start', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({model, context_length: parseInt(ctx)})
        });
        
        const data = await res.json();
        console.log("Start result:", data);
        
        if (data.status === 'online' || data.status === 'already_running') {
            setAIOnline();
            addChatMessage("system", `A.R.I.A. ONLINE. Model: ${model}. Context: ${ctx} tokens.`);
        } else {
            errorDiv.textContent = `ERROR: ${data.message || 'Failed to start'}`;
            errorDiv.style.display = 'block';
            btn.textContent = "INITIALIZE A.R.I.A.";
            btn.disabled = false;
        }
    } catch (e) {
        console.error("Launch error:", e);
        errorDiv.textContent = `ERROR: ${e.message}`;
        errorDiv.style.display = 'block';
        btn.textContent = "INITIALIZE A.R.I.A.";
        btn.disabled = false;
    }
}

function setAIOnline() {
    document.getElementById('ai-status').className = "status-indicator online";
    document.getElementById('ai-status').textContent = "● ONLINE";
    document.getElementById('ai-config').style.display = 'none';
    document.getElementById('ai-chat').style.display = 'flex';
    document.getElementById('ai-chat').classList.add('active');
}

async function shutdownARIA() {
    await fetch('/api/ai/stop', {method: 'POST'});
    location.reload();
}

async function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    
    addChatMessage("user", msg);
    input.value = "";
    
    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-msg system';
    typingDiv.textContent = 'A.R.I.A. is analyzing...';
    typingDiv.id = 'typing-indicator';
    document.getElementById('chat-history').appendChild(typingDiv);
    document.getElementById('chat-history').scrollTop = 999999;
    
    try {
        const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({message: msg})
        });
        
        const data = await res.json();
        document.getElementById('typing-indicator').remove();
        
        if (data.response) {
            addChatMessage("aria", data.response);
        } else {
            addChatMessage("system", `ERROR: ${data.error || 'No response'}`);
        }
    } catch (e) {
        document.getElementById('typing-indicator').remove();
        addChatMessage("system", `ERROR: ${e.message}`);
    }
}

function addChatMessage(sender, text) {
    const container = document.getElementById('chat-history');
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    
    if (sender === 'user') div.textContent = 'YOU: ' + text;
    else if (sender === 'aria') div.textContent = 'A.R.I.A.: ' + text;
    else div.textContent = text;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

async function logWorkout() {
    const type = document.getElementById('workout-type').value;
    const duration = document.getElementById('workout-duration').value;
    const intensity = document.getElementById('workout-intensity').value;
    
    if (!type || !duration) {
        alert('ENTER WORKOUT DETAILS');
        return;
    }
    
    await fetch('/api/workouts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            date: new Date().toISOString().split('T')[0],
            type, duration: parseInt(duration), intensity
        })
    });
    
    addChatMessage("system", `LOGGED: ${type.toUpperCase()} ${duration}MIN (${intensity.toUpperCase()})`);
    
    document.getElementById('workout-type').value = '';
    document.getElementById('workout-duration').value = '';
}

async function loadMoods() {
    const response = await fetch('/api/moods');
    const moods = await response.json();
    moods.forEach(m => {
        moodData[m.date] = { level: m.mood_level, note: m.note };
    });
    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
}
async function clearAIHistory() {
    await fetch('/api/ai/clear', {method: 'POST'});
    document.getElementById('chat-history').innerHTML = '<div class="chat-msg system">MEMORY CLEARED. NEW NEURAL CONVERSATION STARTED.</div>';
    addChatMessage("system", "A.R.I.A. standing by for new directives.");
}
window.onload = () => {
    loadMoods();
    if (document.getElementById('weight-date')) {
        document.getElementById('weight-date').valueAsDate = new Date();
    }
    loadAIModels();
};