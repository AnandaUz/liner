import "./c-graphs.scss";
import html from "./c-graphs.html?raw";
import type {
  GraphSettings,
  IGraphsBounds,
  IGraphsConstructorParams,
  IGraphSeries,
  TGraphPoint,
} from "./types";
import { calculateTangent, type TangentResult } from "./math";

export type * from "./types";
export * from "./math";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

const Options = {
  scale: {
    forDay: 20,
    forValue: 1,
    scaleStep: 0.2,
  },
  weekend_color: "#89cc983b",
  supportLine_color: "#00000023",
  comment_color: "#00771eff",
  supportLine_width: 1,
} as const;

export class GraphData implements IGraphSeries {
  points = new Map<number, TGraphPoint>();
  settings: GraphSettings = {
    color: "#ff8181ff",
    strokeWidth: 1,
    pointRadius: 1,
  };

  constructor(settings?: GraphSettings) {
    if (settings) {
      this.settings = { ...this.settings, ...settings };
    }
  }

  /** Вспомогательный метод для добавления точек из массива */
  setPointsArray(points: TGraphPoint[]) {
    this.points.clear();
    points.forEach((p) => {
      this.points.set(p.date, p);
    });
  }
}

export class CGraphs extends HTMLElement {
  private static instanceCounter = 0;
  private uid = ++CGraphs.instanceCounter;

  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private initialLeft = 0;
  private initialTop = 0;

  private initialPinchDistance: number | null = null;
  private initialPinchScaleX = 0;
  private initialPinchScaleY = 0;
  private initialMidX = 0;
  private initialMidY = 0;

  private desk!: HTMLDivElement;
  private chartSvg!: SVGSVGElement;
  private axisXGroup!: SVGGElement;
  private axisYGroup!: SVGGElement;

  // Алиас для обратной совместимости
  svg!: SVGSVGElement;

  private destPosition = { x: 0, y: 0 };
  private graphs: GraphData[] = [];
  private tooltip!: HTMLDivElement;
  private resizeObserver: ResizeObserver | null = null;
  title: string = "";

  optionsFromGraphs: IGraphsBounds = {
    minValue: 0,
    maxValue: 0,
    minDate: 0,
    maxDate: 0,
    dayCount: 0,
  };

  scale: { forDay: number; forValue: number } = {
    forDay: Options.scale.forDay,
    forValue: Options.scale.forValue,
  };

  // Слушатели для корректной очистки
  private onMouseMoveBound = (e: MouseEvent) => this.onMouseMove(e);
  private onMouseUpBound = () => this.onMouseUp();
  private onTouchMoveBound = (e: TouchEvent) => this.onTouchMove(e);
  private onTouchEndBound = (e: TouchEvent) => this.onTouchEnd(e);
  private onDeskMouseDownBound = (e: MouseEvent) => this.onDeskMouseDown(e);
  private onDeskTouchStartBound = (e: TouchEvent) => this.onDeskTouchStart(e);
  private onDeskWheelBound = (e: WheelEvent) => this.handleWheel(e);
  private onDeskMouseOverBound = (e: MouseEvent) => this.onDeskMouseOver(e);
  private onDeskMouseOutBound = (e: MouseEvent) => this.onDeskMouseOut(e);
  private onDeskMouseLeaveBound = () => this.hideTooltip();

  constructor(params?: IGraphsConstructorParams) {
    super();
    this.title = params?.title ?? "";
  }

  addGraph(graph: GraphData) {
    this.graphs.push(graph);
  }

  setData(graphs: GraphData[]) {
    this.graphs = [...graphs];
    if (!this.desk) {
      this.init();
    }
    this.refreshOptionsFromGraphs();
    this.setStartPosition();
    this.render();
  }

  refreshData() {
    this.refreshOptionsFromGraphs();
    this.render();
    this.setDeskPosition();
  }

  // Алиас для обратной совместимости со старыми вызовами
  refresthOptionsFromGraphs() {
    this.refreshOptionsFromGraphs();
  }

  init() {
    if (this.desk) return;
    this.innerHTML = html;
    this.desk = this.querySelector(".desk")!;
    this.initSvgs();
    this.initDrag();
    this.initTooltip();
    this.initResizeObserver();
    const titleEl = this.querySelector(".title");
    if (titleEl) {
      titleEl.textContent = this.title;
    }
  }

  private initSvgs() {
    const svgNS = "http://www.w3.org/2000/svg";

    const chartSvg = document.createElementNS(svgNS, "svg");
    chartSvg.classList.add("chart-svg");
    this.desk.appendChild(chartSvg);
    this.chartSvg = chartSvg;
    this.svg = chartSvg;

    const axisXSvg = document.createElementNS(svgNS, "svg");
    axisXSvg.classList.add("axis-x-svg");
    const axisXGroup = document.createElementNS(svgNS, "g");
    axisXSvg.appendChild(axisXGroup);
    this.desk.appendChild(axisXSvg);
    this.axisXGroup = axisXGroup;

    const axisYSvg = document.createElementNS(svgNS, "svg");
    axisYSvg.classList.add("axis-y-svg");
    const axisYGroup = document.createElementNS(svgNS, "g");
    axisYSvg.appendChild(axisYGroup);
    this.desk.appendChild(axisYSvg);
    this.axisYGroup = axisYGroup;
  }

  private initTooltip() {
    const tooltip = document.createElement("div");
    tooltip.classList.add("tooltip");
    this.appendChild(tooltip);
    this.tooltip = tooltip;
  }

  private showTooltip(x: number, y: number, innerHTML: string) {
    if (!this.tooltip) return;
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
    this.tooltip.innerHTML = innerHTML;
    this.tooltip.classList.add("active");
  }

  private hideTooltip() {
    if (this.tooltip) {
      this.tooltip.classList.remove("active");
    }
  }

  refreshOptionsFromGraphs() {
    let minValue = Infinity;
    let maxValue = -Infinity;
    let minDate = Infinity;
    let maxDate = -Infinity;

    this.graphs.forEach((graph) => {
      graph.points.forEach((point) => {
        if (point.value < minValue) minValue = point.value;
        if (point.value > maxValue) maxValue = point.value;
        if (point.date < minDate) minDate = point.date;
        if (point.date > maxDate) maxDate = point.date;
      });
    });

    if (minValue === Infinity) minValue = 0;
    if (maxValue === -Infinity) maxValue = 10;
    if (minDate === Infinity) minDate = Date.now();
    if (maxDate === -Infinity) maxDate = Date.now();

    this.optionsFromGraphs.minValue = minValue;
    this.optionsFromGraphs.maxValue = maxValue;
    this.optionsFromGraphs.minDate = minDate;
    this.optionsFromGraphs.maxDate = maxDate;

    this.optionsFromGraphs.dayCount = Math.max(
      1,
      Math.ceil((maxDate - minDate) / DAY_IN_MS),
    );
  }

  // Метод для обратной совместимости
  renderBgs() {
    this.render();
  }

  private calculateAxisStep(range: number): number {
    if (range <= 0) return 1;
    const roughStep = Math.max(1, range / 6);
    const power = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const norm = roughStep / power;
    let factor = 1;
    if (norm > 5) factor = 10;
    else if (norm > 2) factor = 5;
    else if (norm > 1) factor = 2;
    return Math.max(1, factor * power);
  }

  /**
   * Отрисовка касательной линии к серии графика
   */
  drawTangent(
    graphIndex: number,
    pointIndex: number,
    length: number = 300,
  ): TangentResult | null {
    const graph = this.graphs[graphIndex];
    if (!graph || graph.points.size < 3) return null;

    const sortedPoints = [...graph.points.entries()]
      .sort((a, b) => a[0] - b[0])
      .map((entry) => entry[1]);

    const res = calculateTangent({
      points: sortedPoints,
      pointIndex,
      scale: this.scale,
      maxValue: Math.max(1, this.optionsFromGraphs.maxValue),
      topPadding: 20,
      length,
    });

    if (!res) return null;

    this.chartSvg.querySelector("#tangent-line")?.remove();

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("id", "tangent-line");
    line.setAttribute("x1", String(res.line.x1));
    line.setAttribute("y1", String(res.line.y1));
    line.setAttribute("x2", String(res.line.x2));
    line.setAttribute("y2", String(res.line.y2));
    line.setAttribute("stroke", "#000e2c6c");
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("stroke-dasharray", "6 3");
    this.chartSvg.appendChild(line);

    return res;
  }

  render() {
    if (!this.chartSvg || !this.axisXGroup || !this.axisYGroup) return;

    const grOptions = this.optionsFromGraphs;
    const deskH =
      (this.desk && this.desk.getBoundingClientRect().height) || 500;
    const topPadding = 20;
    const bottomPadding = 35;
    const availableH = Math.max(50, deskH - topPadding - bottomPadding);

    const maxVal = Math.max(1, grOptions.maxValue);
    const minVal = Math.min(0, grOptions.minValue);
    const valRange = maxVal - minVal;

    if (!this.scale.forValue || this.scale.forValue <= 0) {
      this.scale.forValue = availableH / (valRange || 1);
    }

    const W = (grOptions.dayCount + 3) * this.scale.forDay;
    const contentH =
      topPadding + valRange * this.scale.forValue + bottomPadding;
    const H = Math.max(deskH, contentH);

    this.chartSvg.setAttribute("width", `${W + 5}px`);
    this.chartSvg.setAttribute("height", `${H}px`);
    this.chartSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    // --- 1. Сетка и выходные через SVG pattern ---
    const weekW = this.scale.forDay * 7;
    const workW = this.scale.forDay * 5;
    const weekendW = this.scale.forDay * 2;
    const minD = new Date(grOptions.minDate);
    const dayOfWeek = (minD.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const patternOffsetX = -dayOfWeek * this.scale.forDay;

    let dayLines = "";
    if (this.scale.forDay >= 15) {
      for (let i = 0; i < 7; i++) {
        dayLines += `<line x1="${i * this.scale.forDay}" y1="0" x2="${i * this.scale.forDay}" y2="100%" stroke="${Options.supportLine_color}" stroke-width="${Options.supportLine_width}" />`;
      }
    }

    let monthLinesSvg = "";
    const ddMonth = new Date(grOptions.minDate);
    for (let i = 0; i <= grOptions.dayCount; i++) {
      if (ddMonth.getDate() === 1) {
        const monthX = i * this.scale.forDay;
        monthLinesSvg += `<line x1="${monthX}" y1="0" x2="${monthX}" y2="${H}" stroke="#00000045" stroke-width="1.5" />`;
      }
      ddMonth.setDate(ddMonth.getDate() + 1);
    }

    const step = this.calculateAxisStep(valRange);
    const startVal = Math.floor(minVal / step) * step;

    let gridLinesSvg = "";
    let valuesSvg = "";

    for (let val = startVal; val <= maxVal + step * 0.5; val += step) {
      if (val < minVal || val > maxVal) continue;
      const y = topPadding + (maxVal - val) * this.scale.forValue;
      gridLinesSvg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${Options.supportLine_color}" stroke-width="${Options.supportLine_width}" stroke-dasharray="2 4"/>`;

      valuesSvg += `
        <rect x="2" y="${y - 9}" width="42" height="18" rx="9" fill="#fffffff2" stroke="#00000015" stroke-width="1" />
        <text x="23" y="${y}" fill="#4e7940" font-size="11" font-weight="bold" font-family="Arial" text-anchor="middle" dominant-baseline="central">${val}</text>
      `;
    }

    // --- Отрисовка комментариев по дням ---
    let commentsSvg = "";
    const minDate = grOptions.minDate;
    const dxOffset = this.scale.forDay * 0.5;

    this.graphs.forEach((graph) => {
      graph.points.forEach((p) => {
        if (!p.comment) return;
        const dayIdx = Math.floor((p.date - minDate) / DAY_IN_MS);
        const cx = dayIdx * this.scale.forDay + dxOffset;
        const cy = topPadding + 14;
        const escaped = p.comment
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        commentsSvg += `
          <g class="chart-comment-group" transform="translate(${cx}, ${cy})">
            <line x1="0" y1="0" x2="0" y2="${H - cy - bottomPadding}" stroke="${Options.comment_color}" stroke-width="1" stroke-dasharray="2 3" opacity="0.4" />
            <text 
              x="0" 
              y="0" 
              fill="${Options.comment_color}" 
              font-size="12" 
              font-family="Arial" 
              text-anchor="start" 
              transform="rotate(-90)"
            >${escaped}</text>
          </g>
        `;
      });
    });

    const patternId = `week-pattern-${this.uid}`;
    this.chartSvg.innerHTML = `
      <defs>
        <pattern id="${patternId}" width="${weekW}" height="100%" patternUnits="userSpaceOnUse" x="${patternOffsetX}">
          <rect x="${workW}" y="0" width="${weekendW}" height="100%" fill="${Options.weekend_color}" />
          ${dayLines}
        </pattern>
      </defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#${patternId})" />
      <g class="month-lines">${monthLinesSvg}</g>
      <g class="horizontal-grid">${gridLinesSvg}</g>
      <g class="chart-comments">${commentsSvg}</g>
    `;

    // --- 2. Серии графиков (Path + интерактивные точки) ---
    for (let ii = 0; ii < this.graphs.length; ii++) {
      const graph = this.graphs[ii];
      if (!graph || graph.points.size === 0) continue;

      const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      this.chartSvg.appendChild(layer);

      const settings = graph.settings;
      const strokeColor = settings?.color || "#ff8181ff";
      const strokeWidth = settings?.strokeWidth ?? 1;
      const pointRadius = settings?.pointRadius ?? 0;
      const interactiveRadius = settings?.interactiveRadius ?? 10;
      const dYForGraph = ii * 2;

      const sorted = [...graph.points.entries()].sort((a, b) => a[0] - b[0]);

      let pathD = "";
      let dashedPathD = "";

      for (let idx = 0; idx < sorted.length; idx++) {
        const curr = sorted[idx]![1];
        const prev = idx > 0 ? sorted[idx - 1]![1] : null;

        const x =
          Math.floor((curr.date - minDate) / DAY_IN_MS) * this.scale.forDay +
          dxOffset;
        const y =
          topPadding + (maxVal - curr.value) * this.scale.forValue + dYForGraph;

        if (idx === 0) {
          pathD += `M ${x} ${y}`;
        } else if (curr.isDashed) {
          if (prev) {
            const prevX =
              Math.floor((prev.date - minDate) / DAY_IN_MS) *
                this.scale.forDay +
              dxOffset;
            const prevY =
              topPadding +
              (maxVal - prev.value) * this.scale.forValue +
              dYForGraph;
            dashedPathD += ` M ${prevX} ${prevY} L ${x} ${y}`;
          }
          pathD += ` M ${x} ${y}`;
        } else {
          pathD += ` L ${x} ${y}`;
        }

        const isInteractive =
          pointRadius > 0 ||
          curr.title ||
          settings?.enableTangent ||
          settings?.onHoverPoint;

        if (isInteractive) {
          const circle = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle",
          );
          circle.setAttribute("cx", String(x));
          circle.setAttribute("cy", String(y));
          circle.setAttribute(
            "r",
            String(Math.max(pointRadius, interactiveRadius)),
          );
          circle.setAttribute(
            "fill",
            pointRadius > 0 ? strokeColor : "transparent",
          );
          circle.classList.add("chart-point");
          circle.setAttribute("data-graph-index", String(ii));
          circle.setAttribute("data-point-index", String(idx));
          if (curr.title) {
            circle.setAttribute("data-tooltip", curr.title);
          }
          layer.appendChild(circle);
        }
      }

      if (pathD) {
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        path.setAttribute("d", pathD);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", strokeColor);
        path.setAttribute("stroke-width", String(strokeWidth));
        layer.insertBefore(path, layer.firstChild);
      }

      if (dashedPathD) {
        const dashedPath = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        dashedPath.setAttribute("d", dashedPathD);
        dashedPath.setAttribute("fill", "none");
        dashedPath.setAttribute("stroke", strokeColor);
        dashedPath.setAttribute("stroke-width", String(strokeWidth));
        dashedPath.setAttribute("stroke-dasharray", "6 4");
        layer.insertBefore(dashedPath, layer.firstChild);
      }
    }

    // --- 3. Шкала X (даты) в SVG ---
    let dateSvg = "";
    const isSmallScale = this.scale.forDay < 15;
    const MONTH_GENITIVE = [
      "янв",
      "фев",
      "мар",
      "апр",
      "мая",
      "июн",
      "июл",
      "авг",
      "сен",
      "окт",
      "ноя",
      "дек",
    ];

    const dd = new Date(grOptions.minDate);
    for (let i = 0; i <= grOptions.dayCount; i++) {
      const isFirstDayOfMonth = dd.getDate() === 1;

      if (isFirstDayOfMonth || (isSmallScale && i === 0)) {
        const monthX = i * this.scale.forDay;
        const label = isFirstDayOfMonth
          ? `1 ${MONTH_GENITIVE[dd.getMonth()]}`
          : `${MONTH_GENITIVE[dd.getMonth()]}`;
        const badgeW = 44;
        dateSvg += `
          <rect x="${monthX - badgeW / 2}" y="2" width="${badgeW}" height="20" rx="10" fill="#fffffff0" stroke="#00000025" stroke-width="1" />
          <text x="${monthX}" y="12" fill="#000000c0" font-size="11" font-weight="bold" font-family="Arial" text-anchor="middle" dominant-baseline="central">${label}</text>
        `;
      } else if (!isSmallScale) {
        const dayStep =
          this.scale.forDay >= 25 ? 1 : this.scale.forDay >= 18 ? 2 : 3;
        if (i % dayStep === 0) {
          const posX = (i + 0.5) * this.scale.forDay;
          const d = dd.getDate();
          dateSvg += `
            <circle cx="${posX}" cy="13" r="9" fill="#ffffff95" />
            <text x="${posX}" y="13" fill="#000000a0" font-size="11" font-family="Arial" text-anchor="middle" dominant-baseline="central">${d}</text>
          `;
        }
      }
      dd.setDate(dd.getDate() + 1);
    }
    this.axisXGroup.innerHTML = dateSvg;
    this.axisYGroup.innerHTML = valuesSvg;
  }

  setDeskPosition() {
    this.clampPosition();
    const dx = this.destPosition.x;
    const dy = this.destPosition.y;

    if (this.chartSvg) {
      this.chartSvg.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    if (this.axisXGroup) {
      this.axisXGroup.setAttribute("transform", `translate(${dx}, 0)`);
    }
    if (this.axisYGroup) {
      this.axisYGroup.setAttribute("transform", `translate(0, ${dy})`);
    }
  }

  // Алиас для обратной совместимости
  setDestPosition() {
    this.setDeskPosition();
  }

  private clampPosition() {
    const rect = this.desk ? this.desk.getBoundingClientRect() : null;
    const deskW = rect?.width || 800;
    const deskH = rect?.height || 500;

    const grOptions = this.optionsFromGraphs;
    const totalW = (grOptions.dayCount + 1) * this.scale.forDay;

    const minX = Math.min(60 - totalW, deskW - totalW);
    const maxX = Math.max(deskW - 60, 60);
    this.destPosition.x = Math.max(minX, Math.min(maxX, this.destPosition.x));

    const topPadding = 20;
    const bottomPadding = 35;
    const valRange =
      Math.max(1, grOptions.maxValue) - Math.min(0, grOptions.minValue);
    const totalH = topPadding + valRange * this.scale.forValue + bottomPadding;

    const minY = Math.min(60 - totalH, deskH - totalH);
    const maxY = Math.max(deskH - 60, 60);
    this.destPosition.y = Math.max(minY, Math.min(maxY, this.destPosition.y));
  }

  autoScaleY() {
    const deskH =
      (this.desk && this.desk.getBoundingClientRect().height) || 500;
    const topPadding = 20;
    const bottomPadding = 35;
    const availableH = Math.max(50, deskH - topPadding - bottomPadding);
    const maxVal = Math.max(1, this.optionsFromGraphs.maxValue);
    const minVal = Math.min(0, this.optionsFromGraphs.minValue);
    const valRange = maxVal - minVal;
    this.scale.forValue = availableH / (valRange || 1);
    this.destPosition.y = 0;
  }

  setStartPosition() {
    const rect = this.desk
      ? this.desk.getBoundingClientRect()
      : new DOMRect(0, 0, 0, 0);
    const deskW = rect.width || 800;

    const grOptions = this.optionsFromGraphs;
    const totalW = (grOptions.dayCount + 1) * this.scale.forDay;

    // Позиционируем на последние даты
    if (totalW > deskW) {
      this.destPosition.x = deskW - totalW - 20;
    } else {
      this.destPosition.x = 20;
    }
    this.autoScaleY();

    this.clampPosition();
    this.render();
    this.setDeskPosition();
  }

  private initDrag() {
    this.desk.addEventListener("mousedown", this.onDeskMouseDownBound);
    this.desk.addEventListener("touchstart", this.onDeskTouchStartBound, {
      passive: false,
    });
    this.desk.addEventListener("wheel", this.onDeskWheelBound, {
      passive: false,
    });
    this.desk.addEventListener("mouseover", this.onDeskMouseOverBound);
    this.desk.addEventListener("mouseout", this.onDeskMouseOutBound);
    this.desk.addEventListener("mouseleave", this.onDeskMouseLeaveBound);

    window.addEventListener("mousemove", this.onMouseMoveBound);
    window.addEventListener("mouseup", this.onMouseUpBound);
    window.addEventListener("touchmove", this.onTouchMoveBound, {
      passive: false,
    });
    window.addEventListener("touchend", this.onTouchEndBound);
    window.addEventListener("touchcancel", this.onTouchEndBound);
  }

  private cleanupListeners() {
    window.removeEventListener("mousemove", this.onMouseMoveBound);
    window.removeEventListener("mouseup", this.onMouseUpBound);
    window.removeEventListener("touchmove", this.onTouchMoveBound);
    window.removeEventListener("touchend", this.onTouchEndBound);
    window.removeEventListener("touchcancel", this.onTouchEndBound);

    if (this.desk) {
      this.desk.removeEventListener("mousedown", this.onDeskMouseDownBound);
      this.desk.removeEventListener("touchstart", this.onDeskTouchStartBound);
      this.desk.removeEventListener("wheel", this.onDeskWheelBound);
      this.desk.removeEventListener("mouseover", this.onDeskMouseOverBound);
      this.desk.removeEventListener("mouseout", this.onDeskMouseOutBound);
      this.desk.removeEventListener("mouseleave", this.onDeskMouseLeaveBound);
    }
  }

  private onDeskMouseDown(e: MouseEvent) {
    e.preventDefault();
    this.startDragging(e.clientX, e.clientY);
  }

  private onDeskTouchStart(e: TouchEvent) {
    if (e.touches.length >= 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      if (!t1 || !t2) return;
      this.isDragging = false;
      this.desk.classList.remove("dragging");
      this.initialPinchDistance = Math.hypot(
        t2.clientX - t1.clientX,
        t2.clientY - t1.clientY,
      );
      this.initialPinchScaleX = this.scale.forDay;
      this.initialPinchScaleY = this.scale.forValue;
      this.initialMidX = (t1.clientX + t2.clientX) / 2;
      this.initialMidY = (t1.clientY + t2.clientY) / 2;
      this.initialLeft = this.destPosition.x;
      this.initialTop = this.destPosition.y;
    } else if (e.touches.length === 1 && !this.initialPinchDistance) {
      const touch = e.touches[0];
      if (touch) this.startDragging(touch.clientX, touch.clientY);
    }
  }

  private onDeskMouseOver(e: MouseEvent) {
    const target = e.target as SVGElement | null;
    const pointEl = target?.closest(".chart-point") as SVGElement | null;
    if (!pointEl) return;

    const grIdx = Number(pointEl.getAttribute("data-graph-index"));
    const ptIdx = Number(pointEl.getAttribute("data-point-index"));
    const graph = this.graphs[grIdx];

    const rect = pointEl.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    let contentHtml = pointEl.getAttribute("data-tooltip") || "";

    if (graph) {
      const sorted = [...graph.points.entries()].sort((a, b) => a[0] - b[0]);
      const curr = sorted[ptIdx]?.[1];

      let tangentRes: TangentResult | null = null;
      if (graph.settings?.enableTangent) {
        tangentRes = this.drawTangent(grIdx, ptIdx);
      }

      if (graph.settings?.onHoverPoint && curr) {
        const prev = ptIdx > 0 ? sorted[ptIdx - 1]?.[1] : null;
        const prevWeek = ptIdx >= 7 ? sorted[ptIdx - 7]?.[1] : null;
        const customContent = graph.settings.onHoverPoint({
          point: curr,
          index: ptIdx,
          prev,
          prevWeek,
          tangent: tangentRes
            ? { dValPerDay: tangentRes.dValPerDay }
            : null,
        });
        if (typeof customContent === "string") {
          contentHtml = customContent;
        }
      }
    }

    if (contentHtml) {
      this.showTooltip(x, y, contentHtml);
    }
  }

  private onDeskMouseOut(e: MouseEvent) {
    const target = e.target as SVGElement | null;
    if (target?.closest(".chart-point")) {
      this.chartSvg.querySelector("#tangent-line")?.remove();
      this.hideTooltip();
    }
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;
    this.moveDragging(e.clientX, e.clientY);
  }

  private onMouseUp() {
    this.stopDragging();
  }

  private onTouchMove(e: TouchEvent) {
    if (e.touches.length >= 2 && this.initialPinchDistance) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      if (!t1 || !t2) return;

      const currentDist = Math.hypot(
        t2.clientX - t1.clientX,
        t2.clientY - t1.clientY,
      );
      if (currentDist <= 0 || this.initialPinchDistance <= 0) return;

      const zoomFactor = currentDist / this.initialPinchDistance;
      const newScaleX = Math.max(
        3,
        Math.min(100, this.initialPinchScaleX * zoomFactor),
      );
      const newScaleY = Math.max(
        0.05,
        Math.min(50, this.initialPinchScaleY * zoomFactor),
      );

      const rect = this.desk.getBoundingClientRect();
      const midDeskX = this.initialMidX - rect.left;
      const midDeskY = this.initialMidY - rect.top;

      const contentX = midDeskX - this.initialLeft;
      const contentY = midDeskY - this.initialTop;

      const currentMidX = (t1.clientX + t2.clientX) / 2;
      const currentMidY = (t1.clientY + t2.clientY) / 2;

      this.scale.forDay = newScaleX;
      this.scale.forValue = newScaleY;

      this.destPosition.x =
        midDeskX -
        contentX * (newScaleX / this.initialPinchScaleX) +
        (currentMidX - this.initialMidX);
      this.destPosition.y =
        midDeskY -
        contentY * (newScaleY / this.initialPinchScaleY) +
        (currentMidY - this.initialMidY);

      this.clampPosition();
      this.render();
      this.setDeskPosition();
    } else if (this.isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      if (touch) this.moveDragging(touch.clientX, touch.clientY);
    }
  }

  private onTouchEnd(e?: TouchEvent) {
    if (e && e.touches.length === 1 && this.initialPinchDistance) {
      this.initialPinchDistance = null;
      const touch = e.touches[0];
      if (touch) {
        this.startDragging(touch.clientX, touch.clientY);
      }
    } else if (!e || e.touches.length === 0) {
      this.initialPinchDistance = null;
      this.stopDragging();
    }
  }

  private startDragging(clientX: number, clientY: number) {
    this.isDragging = true;
    this.startX = clientX;
    this.startY = clientY;
    this.initialLeft = this.destPosition.x;
    this.initialTop = this.destPosition.y;
    this.desk.classList.add("dragging");
  }

  private moveDragging(clientX: number, clientY: number) {
    const dx = clientX - this.startX;
    const dy = clientY - this.startY;
    this.destPosition.x = this.initialLeft + dx;
    this.destPosition.y = this.initialTop + dy;
    this.setDeskPosition();
  }

  private stopDragging() {
    if (this.isDragging) {
      this.isDragging = false;
      this.desk.classList.remove("dragging");
    }
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = this.desk.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const contentX = mouseX - this.destPosition.x;
    const contentY = mouseY - this.destPosition.y;

    const oldScaleX = this.scale.forDay;
    const oldScaleY = this.scale.forValue;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;

    // Zoom по X при Shift или обычном скролле
    if (e.shiftKey || !e.ctrlKey) {
      const newScaleX = Math.max(3, Math.min(100, oldScaleX * zoomFactor));
      this.scale.forDay = newScaleX;
      this.destPosition.x = mouseX - contentX * (newScaleX / oldScaleX);
    }

    // Zoom по Y при Ctrl или обычном скролле
    if (e.ctrlKey || !e.shiftKey) {
      const newScaleY = Math.max(0.05, Math.min(50, oldScaleY * zoomFactor));
      this.scale.forValue = newScaleY;
      this.destPosition.y = mouseY - contentY * (newScaleY / oldScaleY);
    }

    this.clampPosition();
    this.render();
    this.setDeskPosition();
  }

  private initResizeObserver() {
    if (typeof ResizeObserver === "undefined") return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.graphs.length > 0) {
        this.clampPosition();
        this.render();
        this.setDeskPosition();
      }
    });
    this.resizeObserver.observe(this.desk);
  }

  connectedCallback() {
    if (!this.desk) {
      this.init();
    }
    if (this.graphs.length > 0) {
      this.refreshOptionsFromGraphs();
      if (
        !this.scale.forValue ||
        this.scale.forValue === Options.scale.forValue
      ) {
        this.autoScaleY();
      }
      this.render();
      this.setDeskPosition();
    }
  }

  disconnectedCallback() {
    this.cleanupListeners();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.tooltip) {
      this.tooltip.remove();
    }
  }
}

customElements.define("c-graphs", CGraphs);
