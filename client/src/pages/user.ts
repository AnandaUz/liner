import { getUsers } from '@/services/users.service';
import type { Page } from '../types';
import type { CDesk } from '@/components/c-desk/c-desk';


export const userPage: Page = ({ id }) => {
  return {
    html: `<section id="user-page">
    <h1>Загружается ...</h1>
      <c-telegram-banner></c-telegram-banner>
      <section>
        <c-desk></c-desk> 
        <c-users-list></c-users-list>
      </section>    
    </section>`,
    async init() {
      const users = await getUsers(); // из кэша, без запроса
      const user = users.find(u => u.id === id);

      const section = document.getElementById('user-page');
      if (!section) return;

      const h1El = section.querySelector('h1');

      if (!user) {
        if (h1El) {
          h1El.innerHTML = `Пользователь не найден`;
        }
        return;
      }

      if (h1El) {
        h1El.innerHTML = `${user.name}`;
      }

      const desk = section.querySelector('c-desk') as CDesk;
      if (desk) {
        desk.init(user.id);
      }
    }
  };
}