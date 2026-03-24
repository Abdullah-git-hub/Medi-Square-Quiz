// App Logic for Student Portal
let sessionData = JSON.parse(localStorage.getItem('quizSession')) || null;
let currentQIndex = 0;
let timerInterval;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('quizList')) {
        localStorage.removeItem('quizSession'); // Clear pending
        loadAvailableQuizzes();
    } else if (document.getElementById('questionsContainer')) {
        if (!sessionData) { window.location.href = '/'; return; }
        renderQuiz();
    }
    
    if(document.getElementById('chatForm')) {
        document.getElementById('chatForm').addEventListener('submit', handleChat);
    }
});

async function loadAvailableQuizzes() {
    const list = document.getElementById('quizList');
    try {
        const res = await fetch('/api/student/quizzes');
        const quizzes = await res.json();
        if(quizzes.length === 0) { list.innerHTML = '<p>No quizzes available right now.</p>'; return; }
        
        list.innerHTML = quizzes.map(q => `
            <div class="card quiz-card">
                <h3 style="color:var(--primary);">${q.title}</h3>
                <p style="font-size:0.95rem; margin-bottom:20px;">${q.description || 'No description provided.'}</p>
                <div class="flex" style="font-size:0.85rem; margin-bottom:15px; color:#64748B; font-weight:600;">
                    <span>⏱ ${q.timerMinutes > 0 ? q.timerMinutes + ' min' : 'Self Paced'}</span>
                    <span>|</span>
                    <span>📚 ${q.category}</span>
                </div>
                <button class="btn" style="width:100%" onclick="openRegModal('${q._id}', '${q.title.replace(/'/g, "\\'")}')">Take Quiz</button>
            </div>
        `).join('');
    } catch(e) { list.innerHTML = `<p style="color:var(--error)">Failed to load quizzes: ${e.message}</p>`; }
}

let selectedQuizId = null;
window.openRegModal = (id, title) => {
    selectedQuizId = id;
    document.getElementById('regQuizTitle').innerText = title;
    document.getElementById('regModal').style.display = 'flex';
};

if(document.getElementById('regForm')) {
    document.getElementById('regForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const err = document.getElementById('regError');
        btn.textContent = 'Preparing...';
        btn.disabled = true;
        
        const payload = {
            name: document.getElementById('sName').value,
            phone: document.getElementById('sPhone').value
        };
        try {
            const res = await fetch(`/api/student/quiz/${selectedQuizId}/start`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.message);
            
            localStorage.setItem('quizSession', JSON.stringify(data));
            window.location.href = '/quiz.html';
        } catch(error) {
            err.textContent = error.message;
            btn.textContent = 'Start Now';
            btn.disabled = false;
        }
    });
}

// ------ QUIZ TAKING LOGIC ------
function renderQuiz() {
    const { quiz, questions } = sessionData;
    document.getElementById('qNavTitle').innerText = quiz.title;
    
    // Timer setup
    if(quiz.timerMinutes > 0) {
        let timeRemaining = quiz.timerMinutes * 60;
        const display = document.getElementById('timerDisplay');
        const updateTimer = () => {
            if(timeRemaining <= 0) {
                clearInterval(timerInterval);
                display.innerText = "Time's Up!";
                submitQuiz();
                return;
            }
            const m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
            const s = (timeRemaining % 60).toString().padStart(2, '0');
            display.innerText = `⏱ ${m}:${s}`;
            if(timeRemaining < 60) display.classList.remove('safe'); // turns red
            timeRemaining--;
        };
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);
    } else {
        document.getElementById('timerDisplay').innerText = '';
    }

    const container = document.getElementById('questionsContainer');
    container.innerHTML = questions.map((q, i) => `
        <div class="question-box ${i===0 ? 'active' : ''}" id="qbox-${i}">
            <h3 style="margin-bottom:25px; font-size:1.4rem; line-height:1.4;">${i+1}. ${q.text}</h3>
            ${renderOptions(q, i)}
        </div>
    `).join('');
    
    updateNavButtons();
}

function renderOptions(q, i) {
    if(q.type === 'MCQ' || q.type === 'TF') {
        const opts = q.type === 'TF' ? ['True', 'False'] : q.options;
        return opts.map((opt) => `
            <label class="option-label">
                <input type="radio" name="ans_${i}" value="${opt}" onchange="saveAnswer('${q._id}', '${opt.replace(/'/g, "\\'")}')">
                <span>${opt}</span>
            </label>
        `).join('');
    } else {
        return `<input type="text" style="padding:15px; font-size:1.1rem" placeholder="Type your answer here..." onchange="saveAnswer('${q._id}', this.value)" onkeyup="saveAnswer('${q._id}', this.value)">`;
    }
}

let answersMap = {};
window.saveAnswer = (qId, val) => { answersMap[qId] = val; };

window.navigateQ = (dir) => {
    const boxes = document.querySelectorAll('.question-box');
    boxes[currentQIndex].classList.remove('active');
    currentQIndex += dir;
    boxes[currentQIndex].classList.add('active');
    updateNavButtons();
};

function updateNavButtons() {
    const total = sessionData.questions.length;
    document.getElementById('prevBtn').classList.toggle('hidden', currentQIndex === 0);
    
    if(currentQIndex === total - 1) {
        document.getElementById('nextBtn').classList.add('hidden');
        document.getElementById('submitBtn').classList.remove('hidden');
    } else {
        document.getElementById('nextBtn').classList.remove('hidden');
        document.getElementById('submitBtn').classList.add('hidden');
    }
    
    document.getElementById('qProgressText').innerText = `Question ${currentQIndex + 1} of ${total}`;
    document.getElementById('progressBar').style.width = `${((currentQIndex + 1) / total) * 100}%`;
}

if(document.getElementById('questionsForm')) {
    document.getElementById('questionsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if(confirm('Are you sure you want to submit? You cannot change your answers after this.')) {
            submitQuiz();
        }
    });
}

async function submitQuiz() {
    clearInterval(timerInterval);
    const btn = document.getElementById('submitBtn');
    if(btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }
    
    const answersArray = Object.keys(answersMap).map(qId => ({ questionId: qId, providedAnswer: answersMap[qId] }));
    const payload = { studentId: sessionData.student._id, answers: answersArray };
    
    try {
        const res = await fetch(`/api/student/quiz/${sessionData.quiz._id}/submit`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const result = await res.json();
        showResult(result);
    } catch(e) { alert('Error submitting quiz. Check connection.'); }
}

function showResult(result) {
    document.getElementById('quizPanel').classList.add('hidden');
    const panel = document.getElementById('resultPanel');
    panel.classList.remove('hidden');
    
    document.getElementById('resScore').innerText = `${result.score} / ${result.total}`;
    const pct = (result.score / result.total) * 100;
    
    let msg = 'Good attempt!';
    if(pct >= 80) msg = 'Excellent work! 🌟 Masterfully done!';
    else if(pct < 50) msg = 'Keep practicing! 💪 You will do better next time.';
    document.getElementById('resMsg').innerText = msg;
    
    if(result.questions && result.questions.length > 0) {
        document.getElementById('resAnswers').classList.remove('hidden');
        const list = document.getElementById('ansList');
        
        list.innerHTML = result.questions.map((q, i) => {
            const userAns = result.attempt.answers.find(a => a.questionId === q._id);
            const isCorrect = userAns && userAns.isCorrect;
            return `
                <div style="padding:20px; border-left: 6px solid ${isCorrect?'var(--success)':'var(--error)'}; border-radius:8px; margin-bottom:20px; background:white; box-shadow:0 2px 10px rgba(0,0,0,0.05)">
                    <p style="font-weight:600; margin-bottom:8px; font-size:1.1rem;">${i+1}. ${q.text}</p>
                    <p>Your Answer: <strong style="color:${isCorrect?'var(--success)':'var(--error)'}">${userAns && userAns.providedAnswer ? userAns.providedAnswer : '(No answer)'}</strong></p>
                    ${!isCorrect ? `<p>Correct Answer: <strong style="color:var(--success)">${q.correctAnswer}</strong></p>` : ''}
                </div>
            `;
        }).join('');
    }
    localStorage.removeItem('quizSession');
}

// ------ CHATBOT LOGIC ------
window.toggleChat = () => {
    const box = document.getElementById('chatbot');
    const bubble = document.getElementById('botBubble');
    if(box.style.display === 'block') { box.style.display = 'none'; bubble.style.display = 'flex'; }
    else { box.style.display = 'block'; bubble.style.display = 'none'; }
};

function handleChat(e) {
    e.preventDefault();
    const input = document.getElementById('chatIn');
    const msg = input.value.trim();
    if(!msg) return;
    
    const chat = document.getElementById('chatChat');
    chat.innerHTML += `<div class="msg user">${msg}</div>`;
    input.value = '';
    setTimeout(() => chat.scrollTop = chat.scrollHeight, 10);
    
    // Simple rule-based bot
    setTimeout(() => {
        let reply = "I'm a simple study assistant. Need help with quiz controls? Just ask!";
        const lowered = msg.toLowerCase();
        if(lowered.includes('submit') || lowered.includes('finish')) reply = "Press 'Submit Quiz' on the last question to finish. Don't forget!";
        else if(lowered.includes('time') || lowered.includes('clock')) reply = "Check the timer at the top right. If it hits zero, your answers will auto-submit!";
        else if(lowered.includes('score') || lowered.includes('result')) reply = "You will see your score and correct answers immediately after you submit.";
        else if(lowered.includes('hello') || lowered.includes('hi')) reply = "Hi there! Focus on your questions and let me know if you need technical guidance.";
        else if(lowered.includes('answer')) reply = "Sorry, I can't give you the answers! Try your best!";
        
        chat.innerHTML += `<div class="msg bot">${reply}</div>`;
        setTimeout(() => chat.scrollTop = chat.scrollHeight, 10);
    }, 600);
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed: ', err));
    });
}
