import '../components/c-users-list';
import { getUser } from '@/services/auth.service';

export function homePage() {

  const user = getUser();
  return {
    html: `
      <section>

      
        
        <c-users-list></c-users-list>
      </section>
    `,
    init() {

    }
  };
}