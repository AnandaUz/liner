import { getUser } from "@/services/auth.service";
import "./c-desk.scss";
import { getWeightLog } from "@/services/weightLog.service";
import { Desk } from "./Desk";
import type { IWeightLog } from "@shared/types";


export class CDesk extends HTMLElement {    
  public desk:Desk | null = null;
  public async init(id:string) {
    this.desk = new Desk(this);
    const weightLogs:IWeightLog[] = await getWeightLog(id);    
    this.desk.init(weightLogs);
    this.desk.render();
    this.desk.setStartPosition()
  }
 

  async connectedCallback() {

    
  }
}

customElements.define('c-desk', CDesk);