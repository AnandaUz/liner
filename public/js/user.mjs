document.addEventListener('DOMContentLoaded', async () => {
    const userId = document.getElementById('target-user-id').value;
    if (!userId) return;

    try {
        const response = await fetch(`/api/user-data/${userId}`);
        if (!response.ok) {
            throw new Error('Ошибка при загрузке данных');
        }

        const data = await response.json();
        renderUserData(data);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('user-name').textContent = 'Ошибка загрузки';
        document.getElementById('weight-history').innerHTML = `<tr><td colspan="3" class="text-center text-danger">${error.message}</td></tr>`;
    }
});

let ctx = 0
let widthCanvas = 0
let heightCanvas = 0

const canvasOptions = {
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

function renderUserData(data) {
    const { user, weightLogs } = data;

    document.getElementById('user-name').textContent = user.name || 'Пользователь';
    document.getElementById('weight-start').textContent = user.weightStart || '-';
    document.getElementById('weight-goal').textContent = user.goal || '-';
    
    if (user.targetDate) {
        const date = new Date(user.targetDate);
        document.getElementById('target-date').textContent = date.toLocaleDateString('ru-RU');
    }
    
    //canvas
    const canvas = document.getElementById('weight-chart');

    ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.strokeStyle = 'blue'; // цвет линии
    ctx.lineWidth = 1;        // толщина в пикселях
    ctx.lineCap = 'round';    // закругленные края

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.offsetHeight;

    widthCanvas = canvas.width;
    heightCanvas = canvas.height;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, widthCanvas, heightCanvas);



    // const startDate = new Date('2025-08-01');
    // const startDate = new Date('2026-01-01');
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()-45)

    const filteredLogs = weightLogs.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
    });

    const wLogs = filteredLogs.map(log => log.weight)
    const max = Math.max(...wLogs);
    const min = Math.min(...wLogs);


    const scaleY = (heightCanvas-canvasOptions.paddingV) / (max - min);

    const dayCount = (endDate - startDate) / (1000 * 60 * 60 * 24);

    const step = (widthCanvas-canvasOptions.paddingH) / dayCount;

    const dispD = {
        step,
        minValue:min,
        scaleY
    }

    drawDayLine({
        data:weightLogs,
        startDate,
        endDate,
        dispD,
        minWeight:min,
        maxWeight:max
    })

    ctx.lineCap = 'round';    // закругленные края


    let mm = []
    filteredLogs.forEach((log,i)=> {
        mm.push(log.weight)
    });

    let mV1 = []
    // const col = "#bc07b9"
    // for (let i = 0; i < 6; i++) {
    //     mV1 = loess(mm,0.1+i*0.1)
    //
    //     drawLine({
    //         mas:mV1,
    //         strokeStyle:col+(i+1)*10
    //         ,lineWidth:1
    //         ,step,
    //         minValue:min,
    //         scaleY
    //     })
    // }

    mV1 = loess(mm,0.15)
    const lWidth = 3
    const opacity = 0.1
    drawLine({
        mas:mV1,
        strokeStyle:`rgba(188,7,185,${opacity})`
        ,lineWidth:lWidth
        ,step,
        minValue:min,
        scaleY
    })
    mV1 = loess(mm,0.5)

    drawLine({
        mas:mV1,
        strokeStyle:`rgba(8,95,251,${opacity})`
        ,lineWidth:lWidth
        ,step,
        minValue:min,
        scaleY
    })

    //линия веса
    drawLine({
        mas:mm,
        strokeStyle:"#02a14c"
        ,lineWidth:1
        ,step,
        minValue:min,
        scaleY
    })
    drawInfo({
            mas: mm,
            step,
            minValue: min,
            scaleY
        }
    )

}

function drawDayLine({
                         data,
                         startDate,
                         endDate,
    dispD,
    minWeight=0,
    maxWeight=0,
                     }) {

    const step = dispD.step;
    const minValue = dispD.minValue;
    const scaleY = dispD.scaleY;

    const dayCount = (endDate - startDate) / (1000 * 60 * 60 * 24);

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

    const sW = Math.ceil(minWeight * st) / st
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
        const y = (heightCanvas - (i - sW + dH)*scaleY)-canvasOptions.padding.bottom;


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
                      scaleY=1}) {



    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let vv = 0

    mas.forEach((v,i)=> {

        const x = i*step + canvasOptions.padding.left

        let y
        if (v === '') {

        } else {
            y = heightCanvas - (v-minValue)*scaleY;
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
 * @param scaleY
 */

function drawLine({
                      mas,
                      strokeStyle,
                      lineWidth,
                      step,
                  minValue=0,
                  scaleY=1}) {
    ctx.beginPath();

    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = lineWidth

    mas.forEach((v,i)=> {

        const x = i*step + canvasOptions.padding.left

        let y
        if (v === '') {

        } else {
            y = heightCanvas - (v-minValue)*scaleY - canvasOptions.padding.bottom;
        }

        if (i === 0) {
            ctx.moveTo(x,y);
        } else {
            ctx.lineTo(x,y);
        }
    });
    ctx.stroke();
}
function loess(y, span = 0.3) {
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

