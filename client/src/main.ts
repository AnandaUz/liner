import '@styles/style.scss'
import { render } from './router';

import { renderHeader } from './components/header'; // добавить
import { renderFooter } from './components/footer'; // добавить
import { authGuard } from './services/auth.guard';
import { handleCredential } from './services/auth.service';

const startGoogleAuth = async () => {
  if (typeof google !== 'undefined') {
    google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredential,
    });
    await authGuard();
    render();

  } else {
    // Если скрипт Google еще не готов, пробуем снова через 100мс
    setTimeout(startGoogleAuth, 100);
    render();
  }
};

async function init() {
  renderHeader();
  renderFooter();
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
