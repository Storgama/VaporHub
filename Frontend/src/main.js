async function loadTwitchStats() {
    try {
        const response = await fetch('http://localhost:3000/api/twitch/stats');
        const data = await response.json();

        document.querySelector('#channel-name').textContent = data.channel;

        const statusEl = document.querySelector('#status');
        if (data.isLive) {
            statusEl.textContent = '🔴 En Live';
            statusEl.className = 'live';
        } else {
            statusEl.textContent = '⚪ Hors ligne';
            statusEl.className = 'offline';
        }

    } catch (error) {
        console.error('Erreur :', error);
        document.querySelector('#channel-name').textContent = 'Erreur de connexion au serveur Express';
    }
}

loadTwitchStats();