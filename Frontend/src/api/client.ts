const BASE_URL: string = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000/api';

/**
 * Client HTTP centralisé (fetch enveloppé avec gestion du refresh token)
 */
export async function httpClient(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = localStorage.getItem('accessToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  options.headers = headers;

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
        const data = (await refreshResponse.json()) as { accessToken: string };
        localStorage.setItem('accessToken', data.accessToken);

        // Rejoue la requête avec le nouveau token
        headers['Authorization'] = `Bearer ${data.accessToken}`;
        options.headers = headers;
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

