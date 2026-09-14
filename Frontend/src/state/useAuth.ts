import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { loginApi, registerApi, logoutApi, type AuthResponse } from '../api/auth.js';

const user: Ref<string | null> = ref<string | null>(localStorage.getItem('username') || null);
const accessToken: Ref<string | null> = ref<string | null>(localStorage.getItem('accessToken') || null);

export interface UseAuthReturn {
  user: Ref<string | null>;
  isAuthenticated: ComputedRef<boolean>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (username: string, email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const isAuthenticated = computed<boolean>(() => !!accessToken.value);

  async function login(email: string, password: string): Promise<AuthResponse> {
    const data = await loginApi(email, password);

    accessToken.value = data.accessToken;
    user.value = data.user.username;

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('username', data.user.username);

    return data;
  }

  async function register(username: string, email: string, password: string): Promise<AuthResponse> {
    return await registerApi(username, email, password);
  }

  async function logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken) {
      await logoutApi(refreshToken);
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');

    accessToken.value = null;
    user.value = null;
  }

  return {
    user,
    isAuthenticated,
    login,
    register,
    logout
  };
}

