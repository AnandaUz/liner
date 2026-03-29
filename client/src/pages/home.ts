import '@/components/c-users-list/c-users-list';
import { getUser } from '@/services/auth.service';
import '@components/c-desk/c-desk';
import '@components/c-telegram-banner/c-telegram-banner';
import type { CDesk } from '@/components/c-desk/c-desk';

export function homePage() {


  return {
    html: `
      <c-telegram-banner></c-telegram-banner>
      <section>
        <c-desk></c-desk> 
        <c-users-list></c-users-list>
      </section>
    `,
    async init() {
      const user = getUser();
      if (user) {      

        const desk = document.querySelector('c-desk') as CDesk;
        if (desk) {
          desk.init(user.id);          
        }
      } 
    }
  };
}