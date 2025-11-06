// static/js/tasks.js

(() => {
    if (window.__todo_tasks_js_loaded) return;
    window.__todo_tasks_js_loaded = true;

    const API_URL = '/api/tasks/';
    const taskListEl = document.getElementById('task-list');
    const formEl = document.getElementById('task-form');

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

    async function fetchTasks() {
        try {
            const res = await apiFetch(API_URL, { method: 'GET' });
            if (res.status === 401) {
                showError('認証が切れました。再ログインしてください。');
                window.location.href = '/login/';
                return [];
            }
            if (!res.ok) {
                const body = await safeJson(res);
                console.error('fetchTasks failed', res.status, body);
                showError('タスクを取得できませんでした。');
                return [];
            }
            const data = await res.json();
            if (!Array.isArray(data)) {
                console.warn('unexpected tasks response', data);
                return [];
            }
            renderTaskList(data);
            return data;
        } catch (err) {
            console.error('fetchTasks error', err);
            showError('ネットワークエラーが発生しました。');
            return [];
        }
    }

    function renderTaskList(tasks) {
        if (!taskListEl) return;
        taskListEl.innerHTML = '';
        tasks.forEach(task => {
            const li = document.createElement('li');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.id = task.id;
            checkbox.checked = !!task.completed;

            const titleSpan = document.createElement('span');
            const dl = task.deadline ? new Date(task.deadline).toLocaleString() : '';
            titleSpan.textContent = ` ${task.title} (${task.priority}) - ${dl}`;

            li.appendChild(checkbox);
            li.appendChild(titleSpan);
            taskListEl.appendChild(li);
        });
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const title = document.getElementById('title')?.value.trim() || '';
        const deadlineRaw = document.getElementById('deadline')?.value || '';
        const priority = document.getElementById('priority')?.value || '';

        if (!title || !deadlineRaw) { alert('タイトルと締切を入力してください'); return; }

        const payload = { title, deadline: new Date(deadlineRaw).toISOString(), priority };

        try {
            const res = await apiFetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
            if (res.status === 401) {
                showError('認証が切れました。再ログインしてください。');
                window.location.href = '/login/';
                return;
            }
            const body = await safeJson(res);
            if (!res.ok) {
                console.error('create failed', res.status, body);
                alert('タスク追加に失敗しました: ' + (body.detail || JSON.stringify(body)));
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
        if (!e.target || e.target.type !== 'checkbox') return;
        const id = e.target.dataset.id;
        try {
            const res = await apiFetch(API_URL + id + '/', {
                method: 'PATCH',
                body: JSON.stringify({ completed: e.target.checked })
            });
            if (!res.ok) {
                const body = await safeJson(res);
                console.error('patch failed', res.status, body);
                showError('タスク更新に失敗しました');
            }
        } catch (err) {
            console.error('handleTaskToggle error', err);
            showError('ネットワークエラーが発生しました');
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
        formEl?.addEventListener('submit', handleFormSubmit);
        taskListEl?.addEventListener('change', handleTaskToggle);
        await fetchTasks();
    });

    window.fetchTasks = fetchTasks;
})();

