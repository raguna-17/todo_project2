// js/tasks.js (修正版)
(() => {
    if (window.__todo_tasks_js_loaded) {
        console.warn('tasks.js: already loaded');
        return;
    }
    window.__todo_tasks_js_loaded = true;

    const API_URL = 'http://127.0.0.1:8000/api/tasks/';
    const taskList = document.getElementById('task-list');
    const form = document.getElementById('task-form');

    // ===============================
    // 共通ユーティリティ関数（ここに置く）
    // ===============================

    // アクセストークン自動リフレッシュ
    async function refreshAccessToken() {
        const refresh = localStorage.getItem('refreshToken');
        if (!refresh) return false;
        try {
            const r = await fetch('http://127.0.0.1:8000/api/token/refresh/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh })
            });
            if (!r.ok) return false;
            const data = await r.json();
            localStorage.setItem('accessToken', data.access);
            console.info('Access token refreshed');
            return true;
        } catch (e) {
            console.error('refresh failed', e);
            return false;
        }
    }

    async function apiFetch(url, opts = {}) {
        const token = localStorage.getItem('accessToken');
        opts.headers = Object.assign({}, opts.headers || {}, { 'Content-Type': opts.headers?.['Content-Type'] || 'application/json' });
        if (token) opts.headers['Authorization'] = `Bearer ${token}`;

        // 内部関数で一度だけリトライする
        const doFetch = async (retry = true) => {
            const res = await fetch(url, opts);
            if (res.status === 401 && retry) {
                // token が無い/期限切れ なら refresh を試し、成功したら再リクエスト
                const ok = await refreshAccessToken();
                if (!ok) return res; // refresh失敗 → 呼び出し側で処理
                // 更新された token をヘッダにセットして再試行
                const newToken = localStorage.getItem('accessToken');
                if (newToken) opts.headers['Authorization'] = `Bearer ${newToken}`;
                return doFetch(false);
            }
            return res;
        };

        return doFetch(true);
      }




    // エラー表示関数
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
  




    function getAccessToken() {
        return localStorage.getItem('accessToken') || null;
    }

    async function safeJson(res) {
        const text = await res.text();
        try { return JSON.parse(text); } catch { return text; }
    }

    function escapeHtml(s = '') {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    }

    async function handleUnauthorized() {
        console.warn('Unauthorized: token invalid or missing.');
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
            showError('認証が切れました。再ログインしてください。');
            // 必要ならログインページへ飛ばす
            // window.location.href = '/login/';
        } else {
            console.info('token refreshed via handleUnauthorized');
        }
    }
      

    // priority を OPTIONS から取り、select を埋める
    async function populatePriorityChoices() {
        const token = getAccessToken();
        const select = document.getElementById('priority');
        if (!select) return;
        try {
            const res = await apiFetch(API_URL, { method: 'OPTIONS' });
            
            if (!res.ok) {
                console.warn('OPTIONS failed', res.status);
                return;
            }
            const meta = await res.json().catch(() => null);
            const choices = meta?.actions?.POST?.priority?.choices || meta?.fields?.priority?.choices;
            if (!choices) return;
            select.innerHTML = '';
            // choices は [["L","Low"], ...] を想定
            choices.forEach(c => {
                const opt = document.createElement('option');

                if (Array.isArray(c)) {
                    // ["L","Low"]
                    opt.value = c[0];
                    opt.textContent = c[1] || c[0];
                } else if (c && typeof c === 'object') {
                    // { value: "L", display_name: "Low" } の場合
                    opt.value = c.value ?? (c.key ?? '');
                    opt.textContent = c.display_name ?? c.label ?? c.value ?? String(c);
                } else {
                    // 単純な文字列 "L"
                    opt.value = c;
                    opt.textContent = String(c);
                }

                select.appendChild(opt);
              });
        } catch (e) {
            console.error('populatePriorityChoices error', e);
        }
    }

    // fetchTasks: 一覧取得
    async function fetchTasks() {
        const token = getAccessToken();
        if (!token) { await handleUnauthorized(); return []; }
        try {
            const res = await apiFetch(API_URL, { method: 'GET' });
            const data = await safeJson(res);
            if (res.status === 401) { await handleUnauthorized(); console.error('fetchTasks 401', data); return []; }
            if (!res.ok) { console.error('fetchTasks failed', res.status, data); return []; }
            if (!Array.isArray(data)) { console.error('fetchTasks: expected array but got', data); return []; }

            const taskList = document.getElementById('task-list');
            if (!taskList) return data;
            taskList.innerHTML = '';
            data.forEach(task => {
                const li = document.createElement('li');
                const dl = task.deadline ? new Date(task.deadline).toLocaleString() : '';
                li.innerHTML = `
              <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
              ${escapeHtml(task.title)} (${escapeHtml(task.priority)}) - ${dl}
            `;
                taskList.appendChild(li);
            });

            // ← ここが抜けていたら undefined を返す。必ず返すこと。
            return data;
        } catch (err) {
            console.error('fetchTasks error', err);
            return [];
        }
    }
      

    // フォーム submit ハンドラ（deadline を ISO に変換、priority は select 値を使用）
    async function handleFormSubmit(e) {
        e.preventDefault();
        const token = getAccessToken();
        if (!token) return handleUnauthorized();

        const titleEl = document.getElementById('title');
        const deadlineEl = document.getElementById('deadline');
        const priorityEl = document.getElementById('priority');

        const title = titleEl ? titleEl.value.trim() : '';
        const deadlineRaw = deadlineEl ? deadlineEl.value : '';
        const priority = priorityEl ? priorityEl.value : '';

        if (!title) { alert('タイトルを入力してください'); return; }
        if (!deadlineRaw) { alert('締切を入力してください'); return; }

        // ここで deadlineIso を先に作る（参照はこの後）
        const deadlineIso = new Date(deadlineRaw).toISOString();

        // デバッグログは deadlineIso を作った後に出す
        console.log('sending payload', { title, deadline: deadlineIso, priority });

        const payload = { title, deadline: deadlineIso, priority };

        try {
            // apiFetch を使っているなら apiFetch に置き換えてください
            const res = await apiFetch
                ? await apiFetch(API_URL, { method: 'POST', body: JSON.stringify(payload) })
                : await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });

            const body = await safeJson(res);
            if (res.status === 401) { await handleUnauthorized(); console.error('POST 401', body); return; }
            if (!res.ok) {
                if (body && typeof body === 'object') {
                    Object.entries(body).forEach(([k, v]) => alert(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`));
                } else {
                    alert('タスク追加に失敗しました: ' + res.status);
                }
                return;
            }
            // 成功
            const form = document.getElementById('task-form');
            form && form.reset();
            await fetchTasks();
        } catch (err) {
            console.error('submit error', err);
            alert('通信エラーが発生しました');
        }
    }
      

    // チェックボックス切替（PATCH）
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
            if (res.status === 401) { await handleUnauthorized(); return; }
            if (!res.ok) {
                const body = await safeJson(res).catch(() => null);
                console.error('patch failed', res.status, body);
            }
        } catch (err) {
            console.error('patch error', err);
        }
    }

    // DOM 完全準備後にイベント登録・初期化を実行
    document.addEventListener('DOMContentLoaded', async () => {
        // elements
        const form = document.getElementById('task-form');
        const taskList = document.getElementById('task-list');

        if (form) form.addEventListener('submit', handleFormSubmit);
        if (taskList) taskList.addEventListener('change', handleTaskToggle);

        // 優先度をサーバーから取り、表示する
        await populatePriorityChoices();

        // トークンあれば一覧取得
        if (getAccessToken()) await fetchTasks();
    });

    // 外部から呼べるようにしておく（必要なら）
    window.fetchTasks = fetchTasks;
    window.apiFetch = apiFetch;
})();


