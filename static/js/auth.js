// static/js/auth.js
// token keys are aligned with tasks.js (accessToken / refreshToken)

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

// safeJson for reuse
async function safeJson(response) {
    try { return await response.json(); }
    catch (e) { return {}; }
}

async function login(username, password) {
    if (!username || !password) {
        alert('ユーザー名とパスワードを入力してください');
        return false;
    }
    try {
        const res = await fetch('/api/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const body = await safeJson(res);
        if (!res.ok) {
            console.error('Login failed', res.status, body);
            alert('ログインに失敗しました: ' + (body.detail || res.status));
            return false;
        }
        if (body.access && body.refresh) {
            localStorage.setItem(ACCESS_KEY, body.access);
            localStorage.setItem(REFRESH_KEY, body.refresh);
            console.log('ログイン成功');
            return true;
        } else {
            console.error('Login response invalid', body);
            alert('ログインに失敗しました（トークンが取得できませんでした）');
            return false;
        }
    } catch (err) {
        console.error('Network error during login', err);
        alert('ネットワークエラーによりログインできませんでした');
        return false;
    }
}

function getExpFromJwt(token) {
    if (!token) return null;
    try {
        const payload = token.split('.')[1];
        // atob might throw on invalid padding; keep simple
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json).exp || null;
    } catch (e) { return null; }
}

function isAccessExpired(graceSeconds = 10) {
    const t = localStorage.getItem(ACCESS_KEY);
    const exp = getExpFromJwt(t);
    if (!exp) return true;
    return (Date.now() / 1000) > (exp - graceSeconds);
}

async function refreshToken() {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) return false;
    try {
        const res = await fetch('/api/token/refresh/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh })
        });
        const body = await safeJson(res);
        if (!res.ok) {
            console.error('Refresh failed', res.status, body);
            logout(false);
            return false;
        }
        if (body.access) {
            localStorage.setItem(ACCESS_KEY, body.access);
            console.log('access token refreshed');
            return true;
        }
        return false;
    } catch (e) {
        console.error('Network error while refreshing token', e);
        return false;
    }
}

function logout(redirect = true) {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    if (redirect) window.location.href = '/login/';
}

function getAuthHeader() {
    const token = localStorage.getItem(ACCESS_KEY);
    if (!token) return {};
    return { 'Authorization': `Bearer ${token}` };
}

// Optional: small fetch monkeypatch fallback (keeps safe behavior)
// Not required if using apiFetch, but helpful if some code calls fetch directly.
(function patchFetch() {
    if (window.__fetch_auth_patched) return;
    window.__fetch_auth_patched = true;
    const originalFetch = window.fetch;
    window.fetch = async function (input, init = {}) {
        init = init || {};
        init.headers = Object.assign({}, init.headers || {});
        const token = localStorage.getItem(ACCESS_KEY);
        if (token && !init.headers['Authorization'] && !init.headers['authorization']) {
            init.headers['Authorization'] = `Bearer ${token}`;
        }
        return originalFetch.call(this, input, init);
    };
})();

// expose api
window.auth = {
    login,
    logout,
    refreshToken,
    isAccessExpired,
    getAuthHeader,
    ACCESS_KEY,
    REFRESH_KEY
};
