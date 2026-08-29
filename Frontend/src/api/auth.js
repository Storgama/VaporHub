import { httpClient } from './client.js';

export async function loginApi(email, password) {
  const res = await httpClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur lors de la connexion');
  return data;
}

export async function registerApi(username, email, password) {
  const res = await httpClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'inscription');
  return data;
}

export async function logoutApi(refreshToken) {
  return await httpClient('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  }).catch(() => {});
}