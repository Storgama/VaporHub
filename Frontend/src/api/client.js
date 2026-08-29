const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Client HTTP centralisé (fetch enveloppé)
 */
export async function httpClient(endpoint, options = {}) {
  const accessToken = localStorage.getItem('accessToken');

  options.headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    options.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${BASE_URL}${endpoint}`, options);

  // Gestion du token expiré (401 / 403)
  if ((response.status === 401 || response.status === 403) && accessToken) {
    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken) {
      const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        localStorage.setItem('accessToken', data.accessToken);

        // Rejoue la requête avec le nouveau token
        options.headers['Authorization'] = `Bearer ${data.accessToken}`;
        response = await fetch(`${BASE_URL}${endpoint}`, options);
      } else {
        // Refresh token invalide -> déconnexion forcée
        localStorage.clear();
        window.location.reload();
      }
    }
  }

  return response;
}