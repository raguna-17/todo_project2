// js/tasks.js (安全・レンダー対応版)
(() => {
    if (window.__todo_tasks_js_loaded) return;
    window.__todo_tasks_js_loaded = true;

    // 環境ごとのAPI URL
    const API_URLS = {
        local: 'http://127.0.0.1:8000/api/tasks/',
        render: 'https://todo-project2.onrender.com/api/tasks/',
    };
    const TOKEN_URLS = {
        local: 'http://127.0.0.1:8000/api/token/refresh/',
        render: 'https://todo-project2.onrender.com/api/token/refresh/',
    };

    // ホストに応じて選択
    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    const API_URL = isLocal ? API_URLS.local : API_URLS.render;
    const TOKEN_URL = isLocal ? TOKEN_URLS.local : TOKEN_URLS.render;

    const taskListEl = document.getElementById('task-list');
    const formEl = document.getElementById('task-form');

    // ===============================
    // ユーティリティ
    // ===============================
    function getAccessToken() {
        return localStorage.getItem('accessToken') || null;
    }

    async function refreshAccessToken() {
        const refresh = localStorage.getItem('refreshToken');
        if (!refresh) return false;
        try {
            const res = await fetch(TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh })
            });
            if (!res.ok) return false;
            const data = await res.json();
            localStorage.setItem('accessToken', data.access);
            console.info('Access token refreshed');
            return true;
        } catch (e) {
            console.error('refresh failed', e);
            return false;
        }
    }

    async function apiFetch(url, opts = {}) {
        const token = getAccessToken();
        opts.headers = Object.assign({}, opts.headers || {}, { 'Content-Type': 'application/json' });
        if (token) opts.headers['Authorization'] = `Bearer ${token}`;

        const doFetch = async (retry = true) => {
            try {
                const res = await fetch(url, opts);
                if (res.status === 401 && retry) {
                    const ok = await refreshAccessToken();
                    if (!ok) return res;
                    opts.headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
                    return doFetch(false);
                }
                return res;
            } catch (err) {
                console.error('apiFetch network error', err);
                throw err;
            }
        };
        return doFetch(true);
    }

    async function safeJson(res) {
        const text = await res.text();
        try { return JSON.parse(text); } catch { return text; }
    }

    function showError(msg) {
        let el = document.getElementById('error-box');
        if (!el) {
            el = document.createElement('div');
            el.id = 'error-box';
            el.style.color = 'red';
            el.style.margin = '10px 0';
            document.body.prepend(el);
        }
        el.textContent = msg;
    }

    async function handleUnauthorized() {
        console.warn('Unauthorized: token invalid or missing.');
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
            showError('認証が切れました。再ログインしてください。');
            window.location.href = '/login/'; // ログインページに誘導
        }
    }

    function escapeHtml(s = '') {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    }

    // ===============================
    // タスク操作
    // ===============================
    async function fetchTasks() {
        const token = getAccessToken();
        if (!token) { await handleUnauthorized(); return []; }

        try {
            const res = await apiFetch(API_URL, { method: 'GET' });
            if (!res.ok) {
                const data = await safeJson(res);
                console.error('fetchTasks failed', res.status, data);
                return [];
            }

            const data = await safeJson(res);
            if (!Array.isArray(data)) return [];

            if (!taskListEl) return data;

            taskListEl.innerHTML = '';
            data.forEach(task => {
                const li = document.createElement('li');
                const dl = task.deadline ? new Date(task.deadline).toLocaleString() : '';
                li.innerHTML = `<input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}"> ${escapeHtml(task.title)} (${escapeHtml(task.priority)}) - ${dl}`;
                taskListEl.appendChild(li);
            });

            return data;
        } catch (err) {
            console.error('fetchTasks error', err);
            return [];
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const token = getAccessToken();
        if (!token) return handleUnauthorized();

        const title = document.getElementById('title')?.value.trim() || '';
        const deadlineRaw = document.getElementById('deadline')?.value || '';
        const priority = document.getElementById('priority')?.value || '';

        if (!title || !deadlineRaw) { alert('タイトルと締切を入力してください'); return; }

        const payload = { title, deadline: new Date(deadlineRaw).toISOString(), priority };

        try {
            const res = await apiFetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
            const body = await safeJson(res);

            if (res.status === 401) { await handleUnauthorized(); return; }
            if (!res.ok) {
                alert('タスク追加に失敗しました: ' + JSON.stringify(body));
                return;
            }

            formEl?.reset();
            await fetchTasks();
        } catch (err) {
            console.error('handleFormSubmit error', err);
            alert('タスク追加に失敗しました（ネットワークエラー）');
        }
    }

    async function handleTaskToggle(e) {
        if (e.target.type !== 'checkbox') return;
        const id = e.target.dataset.id;
        const token = getAccessToken();
        if (!token) return handleUnauthorized();

        try {
            const res = await apiFetch(API_URL + id + '/', {
                method: 'PATCH',
                body: JSON.stringify({ completed: e.target.checked })
            });
            if (!res.ok) console.error('patch failed', res.status, await safeJson(res));
        } catch (err) {
            console.error('handleTaskToggle error', err);
        }
    }

    // ===============================
    // DOM 初期化
    // ===============================
    document.addEventListener('DOMContentLoaded', async () => {
        formEl?.addEventListener('submit', handleFormSubmit);
        taskListEl?.addEventListener('change', handleTaskToggle);
        await fetchTasks();
    });

    window.fetchTasks = fetchTasks;
    window.apiFetch = apiFetch;
})();
