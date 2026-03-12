import type { Routes } from './types';

import { homePage } from './pages/home';
import { settingsPage } from './pages/settings';
import { newsPage } from './pages/news/news';


const routes: Routes = {
  '/':          homePage,
  '/settings':  settingsPage,
  '/news':      newsPage,
};

export function render(): void {
  const path = window.location.pathname;
  const page = routes[path] ?? (() => '<h1>404</h1>');

  try {
    const main = document.querySelector('main');
    if (!main) throw new Error('Элемент main не найден в DOM');
    
    const { html, init } = page();
    main.innerHTML = html;
    init?.();  // запускаем логику страницы если она есть
  } catch (e) {
    console.error('Ошибка роутера:', e);
  }
}