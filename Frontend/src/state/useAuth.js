import { ref, computed } from 'vue';
import { loginApi, registerApi, logoutApi } from '../api/auth.js';

const user = ref(localStorage.getItem('username') || null);
const accessToken = ref(localStorage.getItem('accessToken') || null);

export function useAuth() {

    const isAuthenticated = computed(() => !!accessToken.value);

    async function login(email, password) {

        const data = await loginApi(email, password);

        accessToken.value = data.accessToken;
        user.value = data.user.username;

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('username', data.user.username);

        return data;

    }

    async function register(username, email, password) {

        return await registerApi(username, email, password);

    }

    async function logout() {

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
