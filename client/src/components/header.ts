// src/components/header.ts

export function renderHeader(): void {
  const header = document.querySelector('#header');
  if (!header) return;

  header.innerHTML = `
    <nav>
      <a href="/">Главная</a>
      <a href="/settings">Настройки</a>
      <a href="/news">Новости</a>
    </nav>
  `;
  // подсвечивает текущую страницу
  const links = header.querySelectorAll('a');
  links.forEach(link => {
    if (link.getAttribute('href') === window.location.pathname) {
      link.classList.add('active');
    }
  });
}