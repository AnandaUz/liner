export function renderFooter(): void {
  const footer = document.querySelector('#footer');
  if (!footer) return;

  footer.innerHTML = `
    <p>© 2026 Ананда Шадрин</p>
  `;
}// src/components/footer.ts
