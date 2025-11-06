// api.js
// api.js
if (!window.apiJsLoaded) {
    window.apiJsLoaded = true;

    async function safeJson(response) {
        try { return await response.json(); }
        catch (e) {
            try { return await response.text(); } catch { return null; }
        }
    }

    async function apiFetch(url, options = {}) {
        if (!window.auth) throw new Error('auth.js must be loaded before api.js');

        options = Object.assign({}, options);
        options.headers = Object.assign({}, options.headers || {});

        // attach Authorization header from auth.getAuthHeader()
        Object.assign(options.headers, auth.getAuthHeader());

        if (options.body && !options.headers['Content-Type']) {
            options.headers['Content-Type'] = 'application/json';
        }

        let res = await fetch(url, options);

        if (res.status === 401) {
            const refreshed = await auth.refreshToken();
            if (refreshed) {
                options.headers = Object.assign({}, options.headers || {}, auth.getAuthHeader());
                res = await fetch(url, options);
            }
        }

        return res;
    }

    window.apiFetch = apiFetch;
    window.safeJson = safeJson;
}
