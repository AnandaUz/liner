// client/src/services/auth.guard.ts

import { getToken, removeTokens, refreshAccessToken } from './auth.service';
import { render } from '../router';

export async function authGuard(): Promise<void> {
  const token = getToken();
  const path = window.location.pathname;

  const publicRoutes = ['/welcome', '/register'];
  const isPublic = publicRoutes.includes(path);

  if (!token && !isPublic) {
    history.pushState({}, '', '/welcome');
    render();
    return;
  }

  if (token && path === '/welcome') {
    history.pushState({}, '', '/');
    render();
    return;
  }

  if (token) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        // Токен истёк — пробуем обновить
        const newToken = await refreshAccessToken();

        if (!newToken) {
          // Refresh тоже не помог — выгоняем
          removeTokens();
          history.pushState({}, '', '/welcome');
          render();
        }
        // Если обновили успешно — просто продолжаем
      }
    } catch (e) {
      console.error('Ошибка проверки токена:', e);
    }
  }
}