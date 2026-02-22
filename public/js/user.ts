document.addEventListener('DOMContentLoaded', async () => {
    const targetUserIdEl = document.getElementById('target-user-id') as HTMLInputElement;
    const userId = targetUserIdEl?.value;
    if (!userId) return;

    try {
        const response = await fetch(`/api/user-data/${userId}`);
        if (!response.ok) {
            throw new Error('Ошибка при загрузке данных');
        }

        const data = await response.json();
        renderUserData(data);
    } catch (error: any) {
        console.error('Error:', error);
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) userNameEl.textContent = 'Ошибка загрузки';
        const weightHistoryEl = document.getElementById('weight-history');
        if (weightHistoryEl) weightHistoryEl.innerHTML = `<tr><td colspan="3" class="text-center text-danger">${error.message}</td></tr>`;
    }
});

let ctx: CanvasRenderingContext2D;
let widthCanvas = 0;
let heightCanvas = 0;

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

const canvasOptions: CanvasOptions = {
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
    }
}
let scale = {
    vert:20,
    horiz:30,// пикселей на день
}

interface UserData {
    user: {
        id: string;
        name?: string;
        weightStart?: number;
        goal?: number;
        targetDate?: string;
    };
    weightLogs: {
        date: string;
        weight: number;
    }[];
}

function renderUserData(data: UserData) {
    const { user, weightLogs } = data;

    const userNameEl = document.getElementById('user-name');
    if (userNameEl) userNameEl.textContent = user.name || 'Пользователь';
    
    if (weightLogs.length === 0) return;
    
    //canvas
    const canvas = document.getElementById('weight-chart') as HTMLCanvasElement;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;
    ctx = context;

    // Оптимальный поиск min/max дат (так как weightLogs уже отсортированы API)
    const toDay = new Date();
    const minT = new Date(weightLogs[0].date)

    const totalDayCount = (toDay.getTime() - minT.getTime()) / (1000 * 60 * 60 * 24);

    ctx.beginPath();
    ctx.strokeStyle = 'blue'; // цвет линии
    ctx.lineWidth = 1;        // толщина в пикселях
    ctx.lineCap = 'round';    // закругленные края

    canvas.width = totalDayCount*scale.horiz//canvas.parentElement.clientWidth;
    const parent = canvas.parentElement;
    if (parent) canvas.height = parent.offsetHeight;

    widthCanvas = canvas.width;
    heightCanvas = canvas.height;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, widthCanvas, heightCanvas);

    // Оптимальный поиск min/max веса без риска переполнения стека
    let minW = Infinity;
    let maxW = -Infinity;
    
    weightLogs.forEach(log => {
        if (log.weight < minW) minW = log.weight;
        if (log.weight > maxW) maxW = log.weight;
    });

    if (minW === Infinity) {
        minW = 0;
        maxW = 200;
    }

    const step = (widthCanvas-canvasOptions.paddingH) / totalDayCount;

    const dispD = {
        step,
        minWeight: minW,
        maxWeight: maxW,
        scaleH:scale.horiz,
    }

    drawDayLine({
        data:weightLogs,
        startDate:minT,
        endDate:toDay,
        dispD,
    })

    ctx.lineCap = 'round';    // закругленные края

    let mm: number[] = []
    weightLogs.forEach((log)=> {
        mm.push(log.weight)
    });

    let mV1: number[] = []

    mV1 = loess(mm,0.15)
    const lWidth = 3
    const opacity = 0.1
    drawLine({
        mas:mV1,
        strokeStyle:`rgba(188,7,185,${opacity})`
        ,lineWidth:lWidth
        ,step,
        minValue:minW,
        scaleH:scale.horiz,
    })
    mV1 = loess(mm,0.5)

    drawLine({
        mas:mV1,
        strokeStyle:`rgba(8,95,251,${opacity})`
        ,lineWidth:lWidth
        ,step,
        minValue:minW,
        scaleH:scale.horiz,
    })

    //линия веса
    drawLine({
        mas:mm,
        strokeStyle:"#02a14c"
        ,lineWidth:1
        ,step,
        minValue:minW,
        scaleH:scale.horiz,
    })
    drawInfo({
            mas: mm,
            step,
            minValue: minW,
            scaleH:scale.horiz,
        }
    )

}

interface DispD {
    step: number;
    minWeight: number;
    maxWeight: number;
    scaleH: number;
}

function drawDayLine({
                         data,
                         startDate,
                         endDate,
    dispD,
                     }: {
    data: any[];
    startDate: Date;
    endDate: Date;
    dispD: DispD;
}) {

    const step = dispD.step;
    const minWeight = dispD.minWeight;
    const maxWeight = dispD.maxWeight;
    const scaleH = dispD.scaleH;

    const dayCount = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    ctx.beginPath();
    ctx.strokeStyle = '#00005005';

    const linePadding = 20

    ctx.font = '10px Arial';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let day = new Date(startDate)

    for (let i = 0; i <= dayCount; i++) {
        ctx.fillStyle = 'rgba(159,159,159,0.65)';

        const x = i*step + canvasOptions.padding.left

        const dayStr = day.getDate()
        const monthStr = day.getMonth()+1
        const dStr = day.getDay()

        day.setDate(day.getDate() + 1)

        ctx.fillText(`${dayStr}`, x,10);
        // ctx.fillText(`${dStr}`, x,20);

        if (dStr===0 || dStr===6) {
            ctx.fillStyle = 'rgba(235,253,251,0.65)';
            ctx.fillRect(x, linePadding, step, heightCanvas - linePadding);
        }
    }

    for (let i = 0; i <= dayCount; i++) {

        const x = i*step + canvasOptions.padding.left
        ctx.moveTo(x, linePadding);
        ctx.lineTo(x, heightCanvas);
    }
    ctx.stroke()


    const st = 0.5

    const sW = Math.ceil(minWeight / st)*st
    const dH = sW-minWeight


    ctx.font = '10px Arial';

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';


    ctx.fillStyle = 'rgba(166,126,126,0.65)';
    for (let i = sW; i <= maxWeight; i+=st) {
        ctx.beginPath();
        ctx.strokeStyle = '#00005002';

        const x = canvasOptions.padding.left
        const x2 = x + (widthCanvas-canvasOptions.paddingH)
        const y = (heightCanvas - (i - sW + dH)*scaleH)-canvasOptions.padding.bottom;


        const ii = Math.round(i*100)/100
        if (ii % 1 === 0) {
            ctx.fillText(`${i.toFixed(0)}`, x2+10,y);
            ctx.strokeStyle = '#00005020';
        } else {
            ctx.strokeStyle = '#00005010';
        }


        ctx.moveTo(x, y);
        ctx.lineTo(x2 , y);
        ctx.stroke()
    }







}


function drawInfo({
                      mas,
                      step,
                      minValue=0,
                      scaleH=1}: {
    mas: number[];
    step: number;
    minValue?: number;
    scaleH?: number;
}) {



    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let vv = 0

    mas.forEach((v,i)=> {

        const x = i*step + canvasOptions.padding.left

        let y: number = 0;
        if ((v as any) === '') {

        } else {
            y = heightCanvas - (v-minValue)*scaleH;
        }




        ctx.font = '11px Arial';
        const ex = v-vv
        let strV = Math.abs(ex).toFixed(2).replace(/0$/,'')

        let dy = 0
        const DY = 10
        ctx.fillStyle = 'rgba(159,159,159,0.65)';
        if (ex < 0) {
            dy = DY
        } else {
            // ctx.fillStyle = 'rgba(255,102,102,0.65)';
            dy = -DY
        }
        ctx.fillText(strV, x,y + dy-canvasOptions.padding.bottom);

        vv = v


    });
    ctx.stroke();
}
/**
 *
 * @param mas
 * @param strokeStyle
 * @param lineWidth
 * @param step
 * @param minValue
 * @param scaleH
 */

function drawLine({
                      mas,
                      strokeStyle,
                      lineWidth,
                      step,
                  minValue=0,
                  scaleH=1}: {
    mas: number[];
    strokeStyle: string;
    lineWidth: number;
    step: number;
    minValue?: number;
    scaleH?: number;
}) {
    ctx.beginPath();

    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = lineWidth

    mas.forEach((v,i)=> {

        const x = i*step + canvasOptions.padding.left

        let y: number = 0;
        if ((v as any) === '') {

        } else {
            y = heightCanvas - (v-minValue)*scaleH - canvasOptions.padding.bottom;
        }

        if (i === 0) {
            ctx.moveTo(x,y);
        } else {
            ctx.lineTo(x,y);
        }
    });
    ctx.stroke();
}
function loess(y: number[], span: number = 0.3): number[] {
    const n = y.length;
    if (n === 0) return [];

    const result = new Array(n);
    const k = Math.max(2, Math.floor(span * n)); // размер окна

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

