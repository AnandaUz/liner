export function homePage() {
  return {
    html: `
      <section>
        <h1>Home</h1>
        <p>Добро пожаловать</p>
      </section>
    `,
    init() {
      // логика специфичная для этой страницы
      console.log('home page ready');
    }
  };
}