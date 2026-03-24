document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    const btn = e.target.querySelector('button');

    btn.textContent = 'Logging in...';
    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem('adminToken', data.token);
            window.location.href = '/admin.html';
        } else {
            errorMsg.textContent = data.message || 'Login failed';
        }
    } catch (err) {
        errorMsg.textContent = 'Server error. Please check if backend is running.';
    } finally {
        btn.textContent = 'Login';
    }
});
