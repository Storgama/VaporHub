const API_URL = 'http://localhost:3000/api';

// --- Éléments du DOM ---
const authSection = document.querySelector('#auth-section');
const dashboardSection = document.querySelector('#dashboard-section');
const tabLogin = document.querySelector('#tab-login');
const tabRegister = document.querySelector('#tab-register');
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const authMessage = document.querySelector('#auth-message');
const userDisplay = document.querySelector('#user-display');
const logoutBtn = document.querySelector('#logout-btn');

// --- 1. Gestion des Onglets (Login / Register) ---
tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    authMessage.textContent = '';
});

tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    authMessage.textContent = '';
});

// --- 2. Inscription ---
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authMessage.textContent = '';

    const username = document.querySelector('#register-username').value;
    const email = document.querySelector('#register-email').value;
    const password = document.querySelector('#register-password').value;

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            authMessage.textContent = data.error || 'Erreur lors de l\'inscription';
            return;
        }

        authMessage.style.color = '#00ff66';
        authMessage.textContent = 'Compte créé avec succès ! Connecte-toi maintenant.';
        tabLogin.click();
    } catch (err) {
        authMessage.textContent = 'Erreur de connexion avec le serveur';
    }
});

// --- 3. Connexion ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authMessage.textContent = '';

    const email = document.querySelector('#login-email').value;
    const password = document.querySelector('#login-password').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            authMessage.style.color = '#ff5555';
            authMessage.textContent = data.error || 'Identifiants incorrects';
            return;
        }

        // Sauvegarde des tokens et infos utilisateur
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('username', data.user.username);

        // Réinitialiser les champs et afficher le dashboard
        loginForm.reset();
        renderApp();
    } catch (err) {
        authMessage.style.color = '#ff5555';
        authMessage.textContent = 'Erreur de connexion avec le serveur';
    }
});

// --- 4. Déconnexion ---
logoutBtn.addEventListener('click', async () => {
    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken) {
        // Prévenir le serveur pour invalider le Refresh Token en BDD
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        }).catch(() => {});
    }

    // Vider le stockage local
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');

    renderApp();
});

// --- 5. Helper : Requête authentifiée avec renouvellement automatique ---
async function fetchWithAuth(url, options = {}) {
    let accessToken = localStorage.getItem('accessToken');

    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`
    };

    let res = await fetch(url, options);

    // Si le token est expiré (401 ou 403), on tente de le rafraîchir
    if (res.status === 401 || res.status === 403) {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
            logoutBtn.click();
            return res;
        }

        // Appel au endpoint refresh
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem('accessToken', data.accessToken);

            // On rejoue la requête initiale avec le nouveau token
            options.headers['Authorization'] = `Bearer ${data.accessToken}`;
            res = await fetch(url, options);
        } else {
            // Le Refresh Token a lui aussi expiré ou été révoqué
            logoutBtn.click();
        }
    }

    return res;
}

// --- 6. Chargement des statistiques Twitch (protégé) ---
async function loadTwitchStats() {
    try {
        const res = await fetchWithAuth(`${API_URL}/twitch/stats`);
        const data = await res.json();

        if (!res.ok) {
            document.querySelector('#channel-name').textContent = 'Erreur d\'authentification';
            return;
        }

        document.querySelector('#channel-name').textContent = data.channel;

        const statusEl = document.querySelector('#status');
        if (data.isLive) {
            statusEl.textContent = '🔴 En Live (' + data.viewerCount + ' viewers)';
            statusEl.className = 'live';
        } else {
            statusEl.textContent = '⚪ Hors ligne';
            statusEl.className = 'offline';
        }
    } catch (err) {
        document.querySelector('#channel-name').textContent = 'Erreur de chargement';
    }
}

// --- 7. Gestion de l'état global de l'application ---
function renderApp() {
    const accessToken = localStorage.getItem('accessToken');
    const username = localStorage.getItem('username');

    if (accessToken) {
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        userDisplay.textContent = username || 'Créateur';
        loadTwitchStats();
    } else {
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
    }
}

// Démarrage initial au chargement de la page
renderApp();