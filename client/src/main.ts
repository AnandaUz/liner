import '@styles/style.scss'
import { render } from './router';

import { renderHeader } from './components/header'; 
import { renderFooter } from './components/footer'; 
import { authGuard } from './services/auth.guard';
import { handleCredential } from './services/auth.service';

const startGoogleAuth = () => {
  if (typeof google !== 'undefined') {
    google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredential,
    });
    const btn = document.querySelector<HTMLElement>('.google-btn');
    if (btn) {
      google.accounts.id.renderButton(btn, { type: 'standard', theme: 'outline', size: 'large' });
    }
  } else {
    // Если скрипт Google еще не готов, пробуем снова через 100мс
    setTimeout(startGoogleAuth, 100);
  }
};
async function init() {
  await authGuard();
  renderHeader();
  renderFooter();
  render();
  startGoogleAuth();
}
init();

document.addEventListener('click', (e) => {
  const target = e.target as HTMLAnchorElement;
  
  if (target.tagName === 'A' && target.href.startsWith(window.location.origin)) {
    e.preventDefault();
    history.pushState({}, '', target.href);
    authGuard().then(() => {
      renderHeader();
      render();
    });
  }
});

// Обрабатываем кнопки браузера "назад" / "вперёд"
window.addEventListener('popstate', () => {
  authGuard().then(() => {
      renderHeader();
      render();
    });
});

