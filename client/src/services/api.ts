// client/src/services/api.ts

import { getToken, refreshAccessToken, removeTokens } from './auth.service';
import { render } from '../router';

const API_URL = import.meta.env.VITE_API_URL;

export async function fetchWithAuth(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  // Токен истёк — пробуем обновить
  if (response.status === 401) {
    const newToken = await refreshAccessToken();

    if (!newToken) {
      // Refresh токен тоже истёк — выгоняем на /welcome
      removeTokens();
      history.pushState({}, '', '/welcome');
      render();
      throw new Error('Сессия истекла');
    }

    // Повторяем запрос с новым токеном
    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newToken}`,
        ...options.headers,
      },
    });
  }

  return response;
}