import {type IWeightLog} from "@shared/types";
const Options = {
    scale:{
        forDay:20,
        forWeight:150,
        scaleStep:0.2,
    },
    paths_styles:[
        {
            color:"#02631aad",
            strokeWidth:1              
        },
        {
            color:"#fc3604b4",   
            strokeWidth:2           
        },
        {
            color:"#0347c7b0", 
            strokeWidth:3             
        }
    ],
    
    weedend_color:"#89cc983b",
    supportLine_color:"#00000023",
    comment_color:"#00771eff",
    supportLine_width:1,
    view_startWeight:40,
    view_endWeight:200,
    
} as const
interface PointData {
  x: number;
  y: number;
  weight: number;
  ind:number;
  date:Date | null;
}
type TGraphPoint = {
    weight:number;
    date?:Date;
    comment?:string | undefined;
    isDashed?:boolean;
}
interface IBg {
    svgStr:string;
    position:{dx:number,dy:number};
    size:{w:number,h:number};
    repeat:string;
}

interface WeightData {
    min: number;
    max: number;
    arr: IWeightLog[];
    totalDayCount: number;
    startDay?: Date;
    endDay?: Date;
}



export class Desk {

    private isDragging = false;
    private startX = 0;
    private startY = 0;
    private initialLeft = 0;
    private initialTop = 0;
    private parent:HTMLElement;
    private desk:HTMLElement;
    
    private svg!:SVGElement;
    private bgs:Array<IBg> = [];
    private destPosition = {x:0,y:0};
    private dYY = 0
    private graphs:Array<TGraphPoint[]> = [];
    private tooltip!:HTMLDivElement;

    weightLogs: IWeightLog[] = []
    private weightData:WeightData = {
        min: 0,
        max: 300,
        arr: [],
        totalDayCount:0,
    }
    scale: { forDay: number; forWeight: number } = {
        forDay: Options.scale.forDay,
        forWeight: Options.scale.forWeight,
    } 
    constructor(parent:HTMLElement) {
        this.parent = parent;
        this.parent.innerHTML = '';
        const desk = document.createElement('div');
        desk.className = 'desk';
        this.parent.appendChild(desk);

        this.desk = desk;    
    }
    init(weightLogs: IWeightLog[] = []) {

        this.initSvg()
        this.initDrag()
        this.initTooltip()

        this.weightLogs = weightLogs;       

        // Оптимальный поиск min/max дат (так как weightLogs уже отсортированы API)
        if (weightLogs.length === 0) return;

        const toDay = new Date();

        let minT:Date
        if (weightLogs[0]) {
            minT = new Date(weightLogs[0].date)
        } else {
            minT = toDay
        }
        const totalDayCount = Math.ceil((toDay.getTime() - minT.getTime()) / (1000 * 60 * 60 * 24))

        const wD = this.weightData;
        wD.totalDayCount = totalDayCount;
        wD.startDay = minT
        wD.endDay = toDay

        wD.min = Infinity;
        wD.max = -Infinity;

        weightLogs.forEach(log => {
            if (log.weight < wD.min) wD.min = log.weight;
            if (log.weight > wD.max) wD.max = log.weight;
        });

        //- собираем график учитывая пропущенные дни
        
        // const mm: number[] = [];
        
        
        const mas: TGraphPoint[] = [];
        let prevDate:Date | null = null;
        let prevWeight:number = 0;
        this.weightLogs.forEach(log => {
            if (log) { 

                const d = new Date(log.date);
                d.setHours(10,0,0,0);
                if (prevDate) {
                    const diff = d.getTime() - prevDate.getTime();
                    const diffDays = diff / (1000 * 60 * 60 * 24);
                    if (diffDays > 1) {
                        const step = (log.weight - prevWeight) / diffDays;
                        for (let i = 1; i < diffDays; i++) {
                            const newDate = new Date(prevDate.getTime() + i * (1000 * 60 * 60 * 24));
                            mas.push({date: newDate, weight: prevWeight + step * i,isDashed:true});
                        }
                    }
                }
                mas.push({date: d, weight: log.weight, comment: log.comment});
                prevDate = d;
                prevWeight = log.weight;
            }
        });
        this.graphs[0] = mas

        
        this.graphs[1] = this.loess(mas, 15) // сглаживание за 15 дней
        this.graphs[2] = this.loess(mas, 45) // сглаживание за 45 дней
    }
    initSvg() {             

        // ── создаём SVG ───────────────────────────────────────────────────
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");        
        this.desk.appendChild(svg);
        this.svg = svg

        // const tooltip = document.querySelector('#tooltip') as SVGGElement;
        

        
        
    }
    initTooltip() {
        const tooltip = document.createElement('div')
        tooltip.classList.add('tooltip')
        document.body.appendChild(tooltip)
        this.tooltip = tooltip

        tooltip.innerHTML = `        
            
        `        

    }
    showTooltip(x:number, y:number, innerHTML:string) {
        this.tooltip.style.left = x + 'px';
        this.tooltip.style.top = y + 'px';
        this.tooltip.innerHTML = `        
            ${innerHTML}
        `        
        this.tooltip.classList.add('active');
    }
    hideTooltip() {
        this.tooltip.classList.remove('active');
    }
    private formatDate(date: Date | null): string {
        if (!date) return '';
        const d = String(date.getDate()).padStart(2, '0');
        const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        const m = months[date.getMonth()];
        const y = String(date.getFullYear()).slice(-2);
        return `${d} ${m} ${y}`;
    }

    createPoint(data:PointData): SVGCircleElement {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", data.x.toString());
        circle.setAttribute("cy", data.y.toString());
        circle.setAttribute("r", "10");
        circle.classList.add("chart-point");    
        circle.setAttribute("fill", '#00000000');

        circle.addEventListener('mouseover', () => {
            const rect = circle.getBoundingClientRect()
            const x = rect.left + rect.width / 2
            const y = rect.top + rect.height / 2

            let html = ''
            html += `<div class="date">${this.formatDate(data.date)}</div>`
            html += `<div class="w">Вес: ${Math.round(data.weight * 100) / 100}</div>`
            const graph0 = this.graphs[0]!
            const curr = graph0[data.ind]!
            const prev = graph0[data.ind-1]
            if (prev) {
                let dw = curr.weight - prev.weight
                dw = Math.round(dw * 100) / 100
                if (dw>0) html += `<div class="dw plus">Разница: +${dw}</div>`
                else html += `<div class="dw minus">Разница: ${dw}</div>`
            }
            const prev2 = graph0[data.ind-7]
            if (prev2) {
                let dw = curr.weight - prev2.weight
                dw = Math.round(dw * 100) / 100
                if (dw>0) html += `<div class="dw2 plus">Неделя: +${dw}</div>`
                else html += `<div class="dw2 minus">Неделя: ${dw}</div>`
            }



            
             this.showTooltip(x, y, html);
        }       )

        circle.addEventListener('mouseout', () => {
            this.hideTooltip();
        });
        return circle;
    }
    
    render() {

        //- svgDesk
        const svgDesk = this.svg
        
        const startDay = this.weightData.startDay || new Date()
        const W = this.weightData.totalDayCount * this.scale.forDay
        const H = (this.weightData.max - this.weightData.min + 10) * this.scale.forWeight

        svgDesk.setAttribute("width", W + 'px');
        svgDesk.setAttribute("height", H + 'px');
        svgDesk.setAttribute("viewBox", `0 0 ${W} ${H}`);

        //- svgBG

        const bgs:IBg[] = [   ]
        this.bgs = bgs
        
        this.dYY = (Options.view_endWeight - this.weightData.max - 1) * this.scale.forWeight
        const wForAllDay = this.weightData.totalDayCount*this.scale.forDay
        const w1 = this.scale.forDay * 5
        const w2 = this.scale.forDay * 2
        const w = w1+w2
        const h = this.scale.forWeight
        let s = ''
        //- вертикальные линии
        for (let i = 0; i < 7; i++) {
            s += `<line x1="${i * this.scale.forDay}" y1="0" x2="${i * this.scale.forDay}" y2="${h}" stroke="${Options.supportLine_color}" stroke-width="${Options.supportLine_width}"/>`
        }        
        const svg = `             
            <rect x="${w1}" y="0" width="${w2}" height="${h}" fill="${Options.weedend_color}"/>
            ${s}            
        `;
        const dx = startDay.getDay() === 0 ? 6 : startDay.getDay()-1
        bgs[2] = {
            svgStr:svg,
            position:{dx:(dx-2) * this.scale.forDay,dy:0},
            size:{w:w,h:h},
            repeat:"repeat"
        }
        //- горизонтальные линии
        const svg2 = `      
            <line x1="0" y1="0" x2="${w}" y2="0" stroke="#00000023" stroke-width="1"/>   
        `;
        bgs[3] = {
            svgStr:svg2,
            position:{dx:0,dy:-this.dYY},
            size:{w:w,h:h},
            repeat:"repeat"
        }   
        
        //- цифры даты снизу
        s = ''
        const r = 9   
        const dd = new Date(startDay)    
        
        for (let i = 0; i < this.weightData.totalDayCount; i++) {
            const dx = i * this.scale.forDay - r          
            const d = dd.getDate() 
            s += `<circle cx="${dx}" cy="${r}" r="${r}" fill="white" />    
            <text 
                x="${dx}" 
                y="${r}" 
                fill="#00000090" 
                font-size="12" 
                font-family="Arial"
                text-anchor="middle" 
                dominant-baseline="central"
            >${d}</text>`
            dd.setDate(dd.getDate() + 1)

        }        
        bgs[0] = {
            svgStr:s,
            position:{dx:0,dy:-100},
            size:{w:wForAllDay,h:r*2},
            repeat:"no-repeat"
        }
        // - цифры веса ----------------
        s = ''        
        const r2 = 12
        for (let i = Options.view_startWeight; i < Options.view_endWeight; i++) {
            
            const dy = (i - Options.view_startWeight - 1) * this.scale.forWeight        
            
            s += `<circle cx="${r2}" cy="${dy}" r="${r2}" fill="#ffffffff" />    
            <text 
                x="${r2}" 
                y="${dy}" 
                fill="#00000090" 
                font-size="12" 
                font-family="Arial"
                text-anchor="middle" 
                dominant-baseline="central"
            >${Options.view_endWeight + Options.view_startWeight - i}</text>`  
        }
        
        
        bgs[1] = {
            svgStr:s,
            position:{dx:-100,dy:-this.dYY},
            size:{w:r2*2,h:(Options.view_endWeight-Options.view_startWeight)*this.scale.forWeight},
            repeat:"no-repeat"
        }

        //- коментарии -------------------
        const graph0 = this.graphs[0]
        if (graph0) {   
            let svgContent = ''    
            const maxChars = Math.max(...graph0.map(curr => (curr?.comment?.length || 0)));
            const padding = 20
            const estimatedHeight = maxChars * 7 + padding; // Примерный расчет: 7px на символ + отступ
            for (let i = 0; i < graph0.length; i++) {                 
                const curr = graph0[i];     
                if (curr && curr.comment) {                    
                    const x = (i)*this.scale.forDay - 30              
                    const y = estimatedHeight - padding; // Нижняя точка

                    // Формируем строку SVG
                    svgContent += `
                        <text 
                            x="${x}" 
                            y="${y}" 
                            fill="${Options.comment_color}"
                            font-size="12"
                            font-family="Arial"
                            text-anchor="start"
                            transform="rotate(-90, ${x}, ${y})"
                        >${curr.comment}</text>
                    `;       // Нижняя точка (базовая линия)                    
                }       
            }
            bgs[4] = {
                svgStr:svgContent,
                position:{dx:0,dy:-100},
                size:{w:wForAllDay,h:estimatedHeight},
                repeat:"no-repeat"
            }          
        }            

        //- заполнение бэкграундов в стили ---
        let bgStr = ''
        let bgSize = ''
       
        let bgRepeat = ''
        bgs.forEach((bg)=>{

            const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bg.size.w} ${bg.size.h}">${bg.svgStr}</svg>
            `;
            bgStr += `url("data:image/svg+xml,${encodeURIComponent(svg)}"),`
            bgSize += `${bg.size.w}px ${bg.size.h}px,`
           
            bgRepeat += `${bg.repeat},`
        })
        bgStr = bgStr.slice(0, -1)
        bgSize = bgSize.slice(0, -1)
        
        bgRepeat = bgRepeat.slice(0, -1)

        this.desk.style.backgroundImage = bgStr;
        this.desk.style.backgroundSize = bgSize;        
        this.desk.style.backgroundRepeat = bgRepeat;
        

        // ── SVG ─────────────────────────────
        
        

        this.svg.innerHTML = ''

        for (let ii = 0; ii < this.graphs.length; ii++) {
            const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");

            this.svg.appendChild(layer);
            const gr = this.graphs[ii]
            if (gr) {            
                for (let i = 0; i < gr.length-1; i++) {                 
                    const curr = gr[i];
                    const next = gr[i + 1];                 
                    
                    // берём значение: если null — берём соседнее для визуального соединения
                    if (curr && next) {
                        const y1 = (this.weightData.max - curr?.weight)*this.scale.forWeight
                        const y2 = (this.weightData.max - next?.weight)*this.scale.forWeight
                        
                        const x1 = (i-1)*this.scale.forDay
                        const x2 = i*this.scale.forDay

                        if (ii == 0) {
                            this.svg.appendChild(this.createPoint({x:x2,y:y2,weight:next.weight,ind:i+1,date:next.date || null}))
                        }
                        
                        

                        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        line.setAttribute("x1", String(x1));
                        line.setAttribute("y1", String(y1));
                        line.setAttribute("x2", String(x2));
                        line.setAttribute("y2", String(y2));
                        line.setAttribute("stroke", Options.paths_styles[ii]?.color || '#b42020ff');
                        line.setAttribute("stroke-width", Options.paths_styles[ii]?.strokeWidth + '' || '1');
                        
                        if (curr.isDashed) {
                            line.setAttribute("stroke-dasharray", "6 4");                       
                        }
                        
                        layer.appendChild(line);
                    }       
                }               

            }   
        }

                 

        this.setDestPosition()
    }
    setDestPosition() {
        const dx = this.destPosition.x
        const dy = this.destPosition.y
        let bgPosition = ''
        
        this.bgs.forEach((bg)=>{      
            let x:number|string
            if (bg.position.dx == -100) x = 'right'
            else x = bg.position.dx + dx  + 'px' 

            let y:number|string
            if (bg.position.dy == -100) y = ' bottom'
            else y = bg.position.dy + dy  + 'px'  
            bgPosition += `${x} ${y},`            
        })
        
        bgPosition = bgPosition.slice(0, -1)      

        this.desk.style.backgroundPosition = bgPosition;

        this.svg.style.transform = `translate(${dx}px, ${dy}px)`;

    }
    setStartPosition() {    

        let rect:DOMRect
        if (this.desk) {
            rect = this.desk.getBoundingClientRect();
        } else {
            rect = new DOMRect(0,0,0,0)
        }

        let totalDays = this.weightData.totalDayCount
        const dayInDesk = rect.width / this.scale.forDay
        
        
        const sDay = totalDays - dayInDesk    
        

        if (!this.graphs[0]) return
        let dd = Math.min(this.graphs[0].length,10)
        let sumW = 0
        for (let i = this.graphs[0].length - dd; i < this.graphs[0].length; i++) {
            sumW += this.graphs[0][i]?.weight || 0
        }
        const middleW = sumW/dd

        const weightInDest = rect.height / this.scale.forWeight

        this.destPosition.x = -sDay*this.scale.forDay
        this.destPosition.y = (- (this.weightData.max - middleW) + weightInDest/2)*this.scale.forWeight
        this.setDestPosition()
    }
    private initDrag() {
        // --- Мышь ---
        this.desk.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startDragging(e.clientX, e.clientY);
            this.desk.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.moveDragging(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', () => {
            this.stopDragging();
            this.desk.style.cursor = 'default';
        });

        // --- Скролл (Zoom) ---
        this.desk.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.handleWheel(e);
        }, { passive: false });

        // --- Тач (Мобилки) ---
        this.desk.addEventListener('touchstart', (e) => {
            // Предотвращаем скролл страницы при перетаскивании канваса
            if (e.touches.length > 0) {
                // e.preventDefault(); // Может блокировать клики, если неаккуратно
                const touch = e.touches[0];
                if (!touch) return
                this.startDragging(touch.clientX, touch.clientY);
            }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            if (e.touches.length > 0) {
                e.preventDefault(); // Обязательно для плавности и блокировки скролла
                const touch = e.touches[0];
                if (!touch) return
                this.moveDragging(touch.clientX, touch.clientY);
            }
        }, { passive: false });

        window.addEventListener('touchend', () => {
            this.stopDragging();
        });
    }

    private startDragging(clientX: number, clientY: number) {
        this.isDragging = true;
        this.startX = clientX;
        this.startY = clientY;
        this.initialLeft = this.destPosition.x;
        this.initialTop = this.destPosition.y;
    }

    private moveDragging(clientX: number, clientY: number) {
        const dx = clientX - this.startX;
        const dy = clientY - this.startY;

        const newLeft = this.initialLeft + dx;
        const newTop = this.initialTop + dy;

        
        
        this.destPosition.x = newLeft;
        this.destPosition.y = newTop;
        this.setDestPosition()
    }

    private stopDragging() {
        if (this.isDragging) {
            this.isDragging = false;

  
       

        

        }
    }

    private handleWheel(e: WheelEvent) {
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

        const rect = this.desk.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Позиция относительно канваса
        const canvasX = mouseX - this.destPosition.x;
        const canvasY = mouseY - this.destPosition.y;

        // Новые масштабы
        const oldScaleH = this.scale.forDay;
        const oldScaleV = this.scale.forWeight;

        this.scale.forDay *= zoomFactor;
        this.scale.forWeight *= zoomFactor;

        // Ограничения
        this.scale.forDay = Math.max(1, Math.min(1000, this.scale.forDay));
        this.scale.forWeight = Math.max(1, Math.min(1000, this.scale.forWeight));

        const actualZoomFactorH = this.scale.forDay / oldScaleH;
        const actualZoomFactorV = this.scale.forWeight / oldScaleV;
        
        // Новая позиция, чтобы точка под мышкой осталась на месте
        const newLeft = mouseX - canvasX * actualZoomFactorH;
        const newTop = mouseY - canvasY * actualZoomFactorV;

        this.destPosition.x = newLeft;
        this.destPosition.y = newTop;

        this.render();
    }

    private loess(y: TGraphPoint[], windowSize: number = 10): TGraphPoint[] {
        const n = y.length;
        if (n === 0) return [];

        const result:TGraphPoint[] = new Array<TGraphPoint>(n);
        const k = Math.max(2, Math.min(n, Math.floor(windowSize))); // фиксированный размер окна

        for (let i = 0; i < n; i++) {

            // 1. Определяем границы окна
            const left = Math.max(0, i - Math.floor(k / 2));
            const right = Math.min(n - 1, left + k - 1);

            // если окно вышло за границу — корректируем
            const adjustedLeft = Math.max(0, right - k + 1);
            const adjustedRight = Math.min(n - 1, adjustedLeft + k - 1);

            const x0 = i;

            // 2. Находим максимальное расстояние в окне
            let maxDist = 0;
            for (let j = adjustedLeft; j <= adjustedRight; j++) {
                const dist = Math.abs(j - x0);
                if (dist > maxDist) maxDist = dist;
            }
            if (maxDist === 0 && y[i]) {
                result[i] = y[i] || {weight:0};
                continue;
            }

            // 3. Считаем коэффициенты взвешенной линейной регрессии
            let sumW = 0;
            let sumWX = 0;
            let sumWY = 0;
            let sumWXX = 0;
            let sumWXY = 0;

            for (let j = adjustedLeft; j <= adjustedRight; j++) {
                const dist = Math.abs(j - x0) / maxDist;

                // tricube weight
                const w = Math.pow(1 - Math.pow(dist, 3), 3);

                const x = j;
                const yj = y[j]?.weight || 0;

                sumW += w;
                sumWX += w * x;
                sumWY += w * yj;
                sumWXX += w * x * x;
                sumWXY += w * x * yj;
            }

            // Решение weighted least squares для y = a + b*x
            const denom = (sumW * sumWXX - sumWX * sumWX);

            let a, b;

            if (denom === 0) {
                a = sumWY / sumW;
                b = 0;
            } else {
                b = (sumW * sumWXY - sumWX * sumWY) / denom;
                a = (sumWY - b * sumWX) / sumW;
            }

            // 4. Прогноз в точке x0
            result[i] = {weight:a + b * x0}
        }

        return result;
    }
}