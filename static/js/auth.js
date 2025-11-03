// js/auth.js
async function login(username, password) {
    // 環境ごとのAPI URL
    const API_URLS = {
        local: 'http://127.0.0.1:8000/api/token/',
        render: 'https://todo-project2.onrender.com/api/token/',
    };
    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    const API_URL = isLocal ? API_URLS.local : API_URLS.render;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!res.ok) {
            const errorBody = await res.json().catch(() => ({}));
            console.error('Login failed', res.status, errorBody);
            alert('ログインに失敗しました: ' + (errorBody.detail || res.status));
            return false;
        }

        const data = await res.json();
        if (data.access && data.refresh) {
            localStorage.setItem('accessToken', data.access);
            localStorage.setItem('refreshToken', data.refresh);
            console.log('ログイン成功');
            return true;
        } else {
            console.error('Login response invalid', data);
            alert('ログインに失敗しました（トークンが取得できませんでした）');
            return false;
        }
    } catch (err) {
        console.error('Network error during login', err);
        alert('ネットワークエラーによりログインできませんでした');
        return false;
    }
}
