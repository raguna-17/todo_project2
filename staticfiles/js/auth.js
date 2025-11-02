// js/auth.js
async function login(username, password) {
    const res = await fetch('http://127.0.0.1:8000/api/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    console.log(data); // { access: '...', refresh: '...' } が出るか確認
    if (data.access) {
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        console.log('ログイン成功');
    }
}
  
