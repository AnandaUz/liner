import '@styles/style.scss'
import { render } from './router';

import { renderHeader } from './components/header'; // добавить
import { renderFooter } from './components/footer'; // добавить


renderHeader(); // добавить — один раз при загрузке
renderFooter(); // добавить — один раз при загрузке

// Рендерим страницу при первой загрузке
render();
// Перехватываем клики по ссылкам
document.addEventListener('click', (e) => {
  const target = e.target as HTMLAnchorElement;
  
  if (target.tagName === 'A' && target.href.startsWith(window.location.origin)) {
    e.preventDefault();
    history.pushState({}, '', target.href);
    renderHeader()
    render();
  }
});

// Обрабатываем кнопки браузера "назад" / "вперёд"
window.addEventListener('popstate', () => {
  renderHeader()
  render();
});


/*
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>

    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
    <button id="settings-btn">Settings</button>
  </div>
`


document.querySelector<HTMLButtonElement>('#settings-btn')!
  .addEventListener('click', () => navigate('/settings'))

  */