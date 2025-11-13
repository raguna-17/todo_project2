// api.js
if (!window.apiJsLoaded) {
    window.apiJsLoaded = true;

    async function safeJson(response) {
        try {
            return await response.json();
        } catch (e) {
            try { return await response.text(); } catch { return null; }
        }
    }

    async function apiFetch(url, options = {}) {
        if (!window.auth) throw new Error('auth.js must be loaded before api.js');

        // デフォルト options の初期化
        options = Object.assign({}, options);
        options.headers = Object.assign({}, options.headers || {});

        // Authorization ヘッダーを追加
        Object.assign(options.headers, auth.getAuthHeader());

        // JSON ボディの Content-Type
        if (options.body && !options.headers['Content-Type']) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body); // body がオブジェクトの場合は文字列化
        }

        let res = await fetch(url, options);

        // 401 の場合、トークンをリフレッシュして再試行
        if (res.status === 401 && auth.refreshToken) {
            const refreshed = await auth.refreshToken();
            if (refreshed) {
                // 新しいヘッダーで再度 fetch
                options.headers = Object.assign({}, options.headers, auth.getAuthHeader());
                res = await fetch(url, options);
            }
        }

        return res;
    }

    window.apiFetch = apiFetch;
    window.safeJson = safeJson;
}
