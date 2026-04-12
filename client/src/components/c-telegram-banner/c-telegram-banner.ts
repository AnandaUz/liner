import { fetchWithAuth } from '@services/api';
import './c-telegram-banner.scss';
import { getUser, saveUser } from '@services/auth.service';

class CTelegramBanner extends HTMLElement {
  async connectedCallback() {
    const user = getUser()!;
    
    if (user?.telegramId) return; // уже привязан — ничего не показываем

    try {
      const response = await fetchWithAuth('/api/telegram/link');
      const { link } = await response.json() as { link: string };

      this.innerHTML = `
        <div class="tg-banner">
          <p>Подключите Telegram бот чтобы отправлять данные о весе</p>
          <a href="${link}" target="_blank" class="tg-banner__btn">
            Подключить Telegram
          </a>
          <button class="tg-banner__btn just">Уже подключено</button>
        </div>
      `;
      this.querySelector('.just')?.addEventListener('click', () => {
        user.telegramId = 123;
        saveUser(user)
        this.remove();
      });
    } catch (e) {
      console.error('Ошибка получения ссылки:', e);
    }
  }
}

customElements.define('c-telegram-banner', CTelegramBanner);