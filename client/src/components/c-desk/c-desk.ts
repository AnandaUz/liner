
import "./c-desk.scss";
import { getWeightLog } from "@/services/weightLog.service";
import { Desk } from "./Desk";
import type { IWeightLog } from "@shared/types";


export class CDesk extends HTMLElement {    
  public desk: Desk | null = null;
  public async init(id: string) {
    this.innerHTML = '<div class="desk-loading">Загрузка графика...</div>';
    try {
      const weightLogs: IWeightLog[] = await getWeightLog(id);
      this.desk = new Desk(this);
      this.desk.init(weightLogs);
      this.desk.render();
      this.desk.setStartPosition();
    } catch (e) {
      this.innerHTML = '<div class="desk-error">Не удалось загрузить данные графика</div>';
      console.error(e);
    }
  }
 

  async connectedCallback() {

    
  }
}

customElements.define('c-desk', CDesk);