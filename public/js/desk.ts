import {WeightLog} from "./types.js";

interface CanvasOptions {
    padding: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    readonly paddingV: number;
    readonly paddingH: number;
}

interface WeightData {
    min: number;
    max: number;
    arr: any[]; // Замените any на ваш тип данных (например, WeightLog[])
    totalDayCount: number;
    startDay?: Date;
    endDay?: Date;
}
const enum drawLineMode {
    start,
    notStart,
    propusk,
}
export class Desk {

    private ctx!: CanvasRenderingContext2D;
    // private widthCanvas = 0;
    // private heightCanvas = 0;
    private canvasMain!:HTMLCanvasElement
    private canvasH!:HTMLCanvasElement
    private canvasV!:HTMLCanvasElement
    private ctxH!: CanvasRenderingContext2D;
    private ctxV!: CanvasRenderingContext2D;
    private canvasBl!: HTMLElement;

    private isDragging = false;
    private startX = 0;
    private startY = 0;
    private initialLeft = 0;
    private initialTop = 0;

    weightLogs: WeightLog[] = []
    private weightData:WeightData = {
        min: 0,
        max: 300,
        arr: [],
        totalDayCount:0,
    }
    scale = {
        vert:50,
        horiz:30,// пикселей на день
    }
    private canvasOptions: CanvasOptions = {
        padding:{
            top:30,
            bottom:30,
            left:15,
            right:15
        },
        get paddingV() {
            return this.padding.top + this.padding.bottom
        },
        get paddingH() {
            return this.padding.left + this.padding.right
        },
    }
    constructor() {
        const canvas = document.getElementById('canvas0') as HTMLCanvasElement;
        if (!canvas) {
            console.error('Canvas #weight-chart not found');
            return;
        }
        const context = canvas.getContext('2d');
        if (!context) {
            console.error('Context 2D not found');
            return;
        }
        this.ctx = context;
        this.canvasMain = canvas;

        this.canvasH = document.getElementById('canvasH') as HTMLCanvasElement;
        this.canvasV = document.getElementById('canvasV') as HTMLCanvasElement;

        const contextH = this.canvasH?.getContext('2d');
        const contextV = this.canvasV?.getContext('2d');

        if (!contextH || !contextV) {
            console.error('Context 2D for H or V not found');
            return;
        }

        this.ctxH = contextH;
        this.ctxV = contextV;

        const canvasBl = document.querySelector('.canvasBl') as HTMLElement;
        if (canvasBl) {
            this.canvasBl = canvasBl;
            this.initDrag();
        }

    }
    init(weightLogs: WeightLog[] = []) {
        //canvas
        this.weightLogs = weightLogs;
        const ctx = this.ctx;

        ctx.strokeStyle = 'blue'; // цвет линии
        ctx.lineWidth = 1;        // толщина в пикселях
        ctx.lineCap = 'round';    // закругленные края

        // Оптимальный поиск min/max дат (так как weightLogs уже отсортированы API)
        if (weightLogs.length === 0) return;

        const toDay = new Date();
        const minT = new Date(weightLogs[0].date)

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

        this.setScaleForPeriod(30)

        this.render()

    }
    private render() {
        this.ctx.clearRect(0, 0, this.canvasMain.width, this.canvasMain.height);
        this.ctxH.clearRect(0, 0, this.canvasH.width, this.canvasH.height);
        this.ctxV.clearRect(0, 0, this.canvasV.width, this.canvasV.height);

        this.reDrawSupportLine()

        this.drawLine({
            mas:this.weightLogs,
            lineWidth:1,
            strokeStyle:"rgba(13,60,0,0.84)",
            showDiff: true
        })

        // Подготавливаем массив mm (вес для каждого дня) для LOESS
        const mm: number[] = [];
        const dayMap = new Map<string, number>();
        this.weightLogs.forEach(log => {
            const d = new Date(log.date);
            d.setHours(10,0,0,0);
            dayMap.set(d.getTime().toString(), log.weight);
        });

        const tempDay = new Date();
        for (let i = 0; i <= this.weightData.totalDayCount; i++) {
            tempDay.setHours(10,0,0,0);
            const val = dayMap.get(tempDay.getTime().toString());
            // Если данных за день нет, берем предыдущее известное значение или интерполируем?
            // LOESS лучше работает с заполненными данными. Для простоты возьмем последнее известное.
            if (val !== undefined) {
                mm.unshift(val); // добавляем в начало, так как идем от сегодня в прошлое
            } else {
                mm.unshift(mm[0] || this.weightLogs[0].weight);
            }
            tempDay.setDate(tempDay.getDate() - 1);
        }

        let mV1: number[]

        // windowSize теперь в днях (точках), а не в процентах от общего количества
        mV1 = this.loess(mm, 15) // сглаживание за 15 дней
        const lWidth = 3
        const opacity = 0.1
        this.drawLine({
            mas:mV1,
            strokeStyle:`rgba(188,7,185,${opacity})`,
            lineWidth:lWidth
        })
        mV1 = this.loess(mm, 45) // сглаживание за 45 дней

        this.drawLine({
            mas:mV1,
            strokeStyle:`rgba(8,95,251,${opacity})`,
            lineWidth:lWidth
        })
    }
    setScaleForPeriod(period:number=1) {


        let rect:DOMRect
        if (this.canvasMain.parentElement) {
            rect = this.canvasMain.parentElement?.getBoundingClientRect();
        } else {
            rect = new DOMRect(0,0,0,0)
        }
        const cBody = this.canvasMain

        this.scale.horiz = rect.width/period
        cBody.width = this.scale.horiz*this.weightData.totalDayCount + this.canvasOptions.paddingH

        // Определяем период
        const endDate = new Date();

        const startDate = new Date(endDate.getTime() - period * 24 * 60 * 60 * 1000);
        //
        const filteredData = this.weightLogs.filter(item => {
            const d = new Date(item.date)
            return d >= startDate && d <= endDate
        });

        // 2. Находим min и max веса
        // Используем reduce, чтобы не создавать лишних промежуточных массивов
        const stats = filteredData.reduce(
            (acc: { min: number; max: number }, item: WeightLog) => ({
                min: Math.min(acc.min, item.weight),
                max: Math.max(acc.max, item.weight),
            }),
            { min: Infinity, max: -Infinity }
        );
        const dw = stats.max - stats.min;
        this.scale.vert = (rect.height - this.canvasOptions.paddingV)/dw;

        const dwT = this.weightData.max - this.weightData.min
        cBody.height = dwT*this.scale.vert + this.canvasOptions.paddingV

        cBody.style.top = -(this.weightData.max - stats.max)*this.scale.vert + 'px'
        cBody.style.left = - (cBody.width - rect.width) + 'px'

        this.canvasH.width = cBody.width
        this.canvasH.height = rect.height
        this.canvasH.style.top = 0 + 'px'
        this.canvasH.style.left = cBody.style.left

        this.canvasV.width = rect.width
        this.canvasV.height = cBody.height
        this.canvasV.style.top = cBody.style.top
        this.canvasV.style.left = 0 + 'px'
    }
    setScaleAndPosition() {

    }
    private reDrawSupportLine() {

        // const ctx = this.ctx;
        const ctxH = this.ctxH;
        const ctxV = this.ctxV;
        ctxH.beginPath();
        ctxH.strokeStyle = '#00005005';

        const linePadding = 20

        ctxH.font = '10px Arial';
        ctxH.textAlign = 'center';
        ctxH.textBaseline = 'middle';

        // const startDate = this.weightData.startDay || new Date()
        let day = this.weightData.endDay || new Date()


        const padding = this.canvasOptions.padding
        const scale = this.scale
        for (let i = 0; i <= this.weightData.totalDayCount; i++) {
            ctxH.fillStyle = 'rgba(159,159,159,0.65)';

            const x = this.canvasMain.width-padding.right - i*scale.horiz

            const dayStr = day.getDate()
            // const monthStr = day.getMonth()+1
            const dStr = day.getDay()

            day.setDate(day.getDate() - 1)

            ctxH.fillText(`${dayStr}`, x,10);
            // ctxH.fillText(`${dStr}`, x,20);99 +

            if (dStr===0 || dStr===6) {
                ctxH.fillStyle = 'rgba(235,253,251,0.65)';
                ctxH.fillRect(x-scale.horiz, linePadding, scale.horiz, this.canvasMain.height - linePadding);
            }
            ctxH.fillStyle = 'rgba(166,126,126,1)';
            ctxH.moveTo(x, linePadding);
            ctxH.lineTo(x, this.canvasMain.height);
        }
        ctxH.stroke()

        ctxV.font = '10px Arial';
        ctxV.textAlign = 'right';
        ctxV.textBaseline = 'middle';

        const st = 0.5

        const widthD = this.weightData


        const sW = Math.ceil(widthD.min / st)*st
        const dH = sW - widthD.min

        ctxV.beginPath();

        ctxV.fillStyle = 'rgba(166,126,126,0.65)';
        for (let i = sW; i <= widthD.max; i+=st) {
            ctxV.beginPath();
            ctxV.strokeStyle = '#00005002';

            const x = padding.left
            const x2 = x + (this.canvasV.width-this.canvasOptions.paddingH)
            const y = (this.canvasV.height - (i - sW + dH)*scale.vert)-padding.bottom;

            const ii = Math.round(i*100)/100
            if (ii % 1 === 0) {
                ctxV.fillText(`${i.toFixed(0)}`, x2+10,y);
                ctxV.strokeStyle = '#00005020';
            } else {
                ctxV.strokeStyle = '#00005010';
            }
            ctxV.moveTo(x, y);
            ctxV.lineTo(x2 , y);
            ctxV.stroke()
        }
    }
    private drawLine({
                 mas,
                 strokeStyle,
                 lineWidth,
                 showDiff = false,
                 }: {
        mas: (WeightLog | number)[];
        strokeStyle: string;
        lineWidth: number;
        showDiff?: boolean;
    }) {
        const ctx = this.ctx;
        ctx.beginPath();


        ctx.lineWidth = lineWidth

        const padding = this.canvasOptions.padding
        const scale = this.scale

        const day = new Date()



        let masInd = mas.length-1
        let x0=-1,
            y0=-1,
            mode = drawLineMode.notStart,
            v0 = 0
        for (let i = 0; i <= this.weightData.totalDayCount; i++) {
            const dayValueRaw = mas[masInd]
            if (dayValueRaw === undefined) break;

            let dayWeight: number;
            let dayDate: Date;

            if (typeof dayValueRaw === 'number') {
                dayWeight = dayValueRaw;
                // Для простого массива чисел предполагаем, что каждое число соответствует дню от конца
                // Но LOESS обычно считается на весь период.
                // Если мы передаем результат loess(mm), то mm был подготовлен для каждого дня.
                // Значит i-й индекс (от конца) соответствует masInd.
                // Чтобы не усложнять, если это число, мы считаем что оно ЕСТЬ для этого дня 'i'.
                dayDate = new Date(day);
            } else {
                dayWeight = dayValueRaw.weight;
                dayDate = new Date(dayValueRaw.date);
            }

            dayDate.setHours(10,0,0,0)
            day.setHours(10,0,0,0)

            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (dayDate.getTime() === day.getTime()) {
                const x = this.canvasMain.width-padding.right - i*scale.horiz
                masInd--
                const x1 = x,
                    y1 = this.canvasMain.height - (dayWeight - this.weightData.min)*scale.vert - padding.bottom;

                if (mode === drawLineMode.propusk) {
                    ctx.setLineDash([10, 5]);
                    ctx.strokeStyle = 'rgb(84,84,255)';
                } else {
                    ctx.setLineDash([]);
                    ctx.strokeStyle = strokeStyle
                }
                if (x0 !== -1) {
                    ctx.beginPath()
                    ctx.moveTo(x0,y0);

                    ctx.lineTo(x1,y1);
                    ctx.stroke()


                    if (showDiff) {
                        const DY = 10
                        const dV = dayWeight - v0
                        let dy = 0
                        let strV = Math.abs(dV).toFixed(2).replace(/0$/,'')
                        ctx.fillStyle = 'rgba(159,159,159,0.65)';
                        if (dV > 0) {
                            dy = DY
                        } else {
                            dy = -DY
                        }
                        ctx.fillText(strV, x0,y0 + dy);
                    }
                }
                x0 = x
                y0 = y1
                v0 = dayWeight

                mode = drawLineMode.start
            } else {
                if (mode !== drawLineMode.notStart) mode = drawLineMode.propusk
            }
            day.setDate(day.getDate() - 1)
        }

    }
    private initDrag() {
        // --- Мышь ---
        this.canvasBl.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startDragging(e.clientX, e.clientY);
            this.canvasBl.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.moveDragging(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', () => {
            this.stopDragging();
            this.canvasBl.style.cursor = 'default';
        });

        // --- Скролл (Zoom) ---
        this.canvasBl.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.handleWheel(e);
        }, { passive: false });

        // --- Тач (Мобилки) ---
        this.canvasBl.addEventListener('touchstart', (e) => {
            // Предотвращаем скролл страницы при перетаскивании канваса
            if (e.touches.length > 0) {
                // e.preventDefault(); // Может блокировать клики, если неаккуратно
                const touch = e.touches[0];
                this.startDragging(touch.clientX, touch.clientY);
            }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            if (e.touches.length > 0) {
                e.preventDefault(); // Обязательно для плавности и блокировки скролла
                const touch = e.touches[0];
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
        this.initialLeft = parseFloat(this.canvasMain.style.left) || 0;
        this.initialTop = parseFloat(this.canvasMain.style.top) || 0;
    }

    private moveDragging(clientX: number, clientY: number) {
        const dx = clientX - this.startX;
        const dy = clientY - this.startY;

        const newLeft = this.initialLeft + dx;
        const newTop = this.initialTop + dy;

        this.canvasMain.style.left = `${newLeft}px`;
        this.canvasMain.style.top = `${newTop}px`;

        this.canvasH.style.left = `${newLeft}px`;
        this.canvasV.style.top = `${newTop}px`;
    }

    private stopDragging() {
        if (this.isDragging) {
            this.isDragging = false;
        }
    }

    private handleWheel(e: WheelEvent) {
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

        const rect = this.canvasBl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Позиция относительно канваса
        const canvasX = mouseX - parseFloat(this.canvasMain.style.left || '0');
        const canvasY = mouseY - parseFloat(this.canvasMain.style.top || '0');

        // Новые масштабы
        const oldScaleH = this.scale.horiz;
        const oldScaleV = this.scale.vert;

        this.scale.horiz *= zoomFactor;
        this.scale.vert *= zoomFactor;

        // Ограничения
        this.scale.horiz = Math.max(1, Math.min(1000, this.scale.horiz));
        this.scale.vert = Math.max(1, Math.min(1000, this.scale.vert));

        const actualZoomFactorH = this.scale.horiz / oldScaleH;
        const actualZoomFactorV = this.scale.vert / oldScaleV;

        // Корректировка размеров канвасов
        this.canvasMain.width = this.scale.horiz * this.weightData.totalDayCount + this.canvasOptions.paddingH;
        const dwT = this.weightData.max - this.weightData.min;
        this.canvasMain.height = dwT * this.scale.vert + this.canvasOptions.paddingV;

        this.canvasH.width = this.canvasMain.width;
        this.canvasV.height = this.canvasMain.height;

        // Новая позиция, чтобы точка под мышкой осталась на месте
        const newLeft = mouseX - canvasX * actualZoomFactorH;
        const newTop = mouseY - canvasY * actualZoomFactorV;

        this.canvasMain.style.left = `${newLeft}px`;
        this.canvasMain.style.top = `${newTop}px`;

        this.canvasH.style.left = `${newLeft}px`;
        this.canvasV.style.top = `${newTop}px`;

        this.render();
    }

    private loess(y: number[], windowSize: number = 10): number[] {
        const n = y.length;
        if (n === 0) return [];

        const result = new Array(n);
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
            if (maxDist === 0) {
                result[i] = y[i];
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
                const yj = y[j];

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
            result[i] = a + b * x0;
        }

        return result;
    }
}