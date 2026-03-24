const token = localStorage.getItem('adminToken');
let currentQuizId = null;

const fetchAPI = async (url, options = {}) => {
    options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    const res = await fetch(url, options);
    if (res.status === 401) { logout(); return; }
    if (!res.ok) {
        let msg = await res.text();
        try { msg = JSON.parse(msg).message; } catch(e){}
        throw new Error(msg || 'API Error');
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
        return res.blob();
    }
    return res.json();
};

function logout() { localStorage.removeItem('adminToken'); window.location.href = '/login.html'; }

function showSection(sec) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`sec-${sec}`).classList.remove('hidden');
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    if(document.getElementById(`nav-${sec}`)) document.getElementById(`nav-${sec}`).classList.add('active');
    
    if(sec === 'dashboard') loadDashboard();
    if(sec === 'quizzes') loadQuizzes();
}

async function loadDashboard() {
    try {
        const data = await fetchAPI('/api/admin/analytics');
        document.getElementById('stat-quizzes').innerText = data.quizzesCount;
        document.getElementById('stat-students').innerText = data.studentsCount;
        document.getElementById('stat-attempts').innerText = data.attemptsCount;
    } catch (e) { console.error(e); }
}

async function loadQuizzes() {
    try {
        const quizzes = await fetchAPI('/api/admin/quizzes');
        const tbody = document.querySelector('#quizzesTable tbody');
        tbody.innerHTML = quizzes.map(q => `
            <tr>
                <td><strong>${q.title}</strong></td>
                <td>${q.category}</td>
                <td>${q.difficulty}</td>
                <td>${q.timerMinutes > 0 ? q.timerMinutes : 'None'}</td>
                <td>${q.attemptLimit}</td>
                <td><span style="color:${q.enabled ? 'var(--success)' : 'var(--error)'}; font-weight:bold;">${q.enabled ? 'Active' : 'Disabled'}</span></td>
                <td>
                    <button class="btn btn-secondary" style="padding:4px 8px;font-size:0.8rem" onclick="editQuiz('${q._id}')">Edit</button>
                    <button class="btn" style="padding:4px 8px;font-size:0.8rem" onclick="manageQuiz('${q._id}', '${q.title.replace(/'/g, "\\'")}')">Manage</button>
                    <button class="btn btn-danger" style="padding:4px 8px;font-size:0.8rem" onclick="deleteQuiz('${q._id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) { alert(e.message); }
}

function openCreateQuizModal() {
    document.getElementById('quizForm').reset();
    document.getElementById('quizId').value = '';
    document.getElementById('modalTitle').innerText = 'Create New Quiz';
    document.getElementById('createQuizModal').style.display = 'flex';
}

window.editQuiz = async (id) => {
    try {
        const q = await fetchAPI(`/api/admin/quizzes/${id}`);
        document.getElementById('quizId').value = q._id;
        document.getElementById('qTitle').value = q.title;
        document.getElementById('qDesc').value = q.description || '';
        document.getElementById('qTimer').value = q.timerMinutes;
        document.getElementById('qLimit').value = q.attemptLimit;
        document.getElementById('qCat').value = q.category;
        document.getElementById('qDiff').value = q.difficulty;
        document.getElementById('qEnabled').checked = q.enabled;
        document.getElementById('qShowAns').checked = q.showAnswersAfterSubmit;
        
        document.getElementById('modalTitle').innerText = 'Edit Quiz';
        document.getElementById('createQuizModal').style.display = 'flex';
    } catch(e) { alert(e.message); }
};

window.deleteQuiz = async (id) => {
    if(!confirm('Are you sure you want to delete this quiz, its questions, and invalidating attempts?')) return;
    try {
        await fetchAPI(`/api/admin/quizzes/${id}`, { method: 'DELETE' });
        loadQuizzes();
    } catch(e) { alert(e.message); }
};

document.getElementById('quizForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveQuizBtn');
    btn.disabled = true;
    const id = document.getElementById('quizId').value;
    const payload = {
        title: document.getElementById('qTitle').value,
        description: document.getElementById('qDesc').value,
        timerMinutes: parseInt(document.getElementById('qTimer').value) || 0,
        attemptLimit: parseInt(document.getElementById('qLimit').value) || 1,
        category: document.getElementById('qCat').value,
        difficulty: document.getElementById('qDiff').value,
        enabled: document.getElementById('qEnabled').checked,
        showAnswersAfterSubmit: document.getElementById('qShowAns').checked
    };
    try {
        const url = id ? `/api/admin/quizzes/${id}` : '/api/admin/quizzes';
        const method = id ? 'PUT' : 'POST';
        await fetchAPI(url, {
            method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        document.getElementById('createQuizModal').style.display = 'none';
        loadQuizzes();
    } catch(e) { alert(e.message); } finally { btn.disabled = false; }
});

window.manageQuiz = (id, title) => {
    currentQuizId = id;
    document.getElementById('detail-quiz-title').innerText = `Manage: ${title}`;
    showSection('quiz-details');
    showDetailTab('questions');
};

window.showDetailTab = (tab) => {
    document.getElementById('tab-questions').classList.add('hidden');
    document.getElementById('tab-leaderboard').classList.add('hidden');
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    
    document.getElementById('btn-tab-questions').classList.replace('btn', 'btn-secondary');
    document.getElementById('btn-tab-leaderboard').classList.replace('btn', 'btn-secondary');
    document.getElementById(`btn-tab-${tab}`).classList.replace('btn-secondary', 'btn');
    
    if(tab === 'questions') loadQuestions();
    if(tab === 'leaderboard') loadLeaderboard();
};

window.toggleOptionField = () => {
    const type = document.getElementById('q_type').value;
    document.getElementById('q_options_div').style.display = type === 'MCQ' ? 'block' : 'none';
};

window.deleteQuestion = async (id) => {
    if(!confirm('Delete question?')) return;
    try {
        await fetchAPI(`/api/admin/questions/${id}`, { method: 'DELETE' });
        loadQuestions();
    } catch(e) { alert(e.message); }
}

async function loadQuestions() {
    try {
        const qs = await fetchAPI(`/api/admin/quizzes/${currentQuizId}/questions`);
        const tbody = document.querySelector('#questionsTable tbody');
        tbody.innerHTML = qs.map(q => `
            <tr>
                <td>${q.text}</td>
                <td>${q.type}</td>
                <td>${q.options.join(', ')}</td>
                <td><strong>${q.correctAnswer}</strong></td>
                <td><button class="btn btn-danger" style="padding:4px 8px;font-size:0.8rem" onclick="deleteQuestion('${q._id}')">Del</button></td>
            </tr>
        `).join('');
    } catch(e) { alert(e.message); }
}

document.getElementById('addQuestionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        text: document.getElementById('q_text').value,
        type: document.getElementById('q_type').value,
        correctAnswer: document.getElementById('q_correct').value,
        options: document.getElementById('q_type').value === 'MCQ' ? document.getElementById('q_options').value.split('|').map(o=>o.trim()) : []
    };
    try {
        await fetchAPI(`/api/admin/quizzes/${currentQuizId}/questions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        document.getElementById('addQuestionForm').reset();
        toggleOptionField();
        loadQuestions();
    } catch(e) { alert(e.message); }
});

window.importCSV = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch(`/api/admin/quizzes/${currentQuizId}/questions/import`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        if(res.ok) { alert(data.message); loadQuestions(); }
        else alert(data.message);
    } catch(err) { alert('Error uploading file'); }
    e.target.value = ''; // reset string
};

async function loadLeaderboard() {
    try {
        const attempts = await fetchAPI(`/api/admin/quizzes/${currentQuizId}/leaderboard`);
        const tbody = document.querySelector('#leaderboardTable tbody');
        tbody.innerHTML = attempts.map((a, i) => `
            <tr>
                <td>#${i+1}</td>
                <td>${a.studentId ? a.studentId.name : 'Unknown'}</td>
                <td>${a.studentId ? a.studentId.phone : 'Unknown'}</td>
                <td><strong>${a.score} / ${a.totalQuestions}</strong></td>
                <td>${new Date(a.completedAt).toLocaleString()}</td>
            </tr>
        `).join('');
    } catch(e) { alert(e.message); }
}

window.exportLeaderboard = async () => {
    try {
        const blob = await fetchAPI(`/api/admin/quizzes/${currentQuizId}/export`);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz_${currentQuizId}_results.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch(e) { alert(e.message); }
};

if(token) showSection('dashboard');

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed: ', err));
    });
}
