import { httpClient } from './client.js';

export interface UserAuthData {
  id?: string;
  username: string;
  email?: string;
  role?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserAuthData;
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const res = await httpClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  const data = (await res.json()) as AuthResponse & { error?: string };
  if (!res.ok) throw new Error(data.error || 'Erreur lors de la connexion');
  return data;
}

export async function registerApi(username: string, email: string, password: string): Promise<AuthResponse> {
  const res = await httpClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password })
  });
  const data = (await res.json()) as AuthResponse & { error?: string };
  if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'inscription');
  return data;
}

export async function logoutApi(refreshToken?: string | null): Promise<void> {
  await httpClient('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  }).catch(() => {});
}

