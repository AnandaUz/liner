import type { TGraphPoint } from "./types";

/**
 * Локальное взвешенное сглаживание (LOESS / LOWESS) с весовой функцией Tricube.
 * Рассчитывает сглаженный тренд ряда точек без привязки к конкретной предметной области.
 */
export function loess(
  points: TGraphPoint[],
  windowSize: number = 10,
): TGraphPoint[] {
  const n = points.length;
  if (n === 0) return [];

  const result: TGraphPoint[] = new Array<TGraphPoint>(n);
  const k = Math.max(2, Math.min(n, Math.floor(windowSize)));

  for (let i = 0; i < n; i++) {
    const left = Math.max(0, i - Math.floor(k / 2));
    const right = Math.min(n - 1, left + k - 1);

    const adjustedLeft = Math.max(0, right - k + 1);
    const adjustedRight = Math.min(n - 1, adjustedLeft + k - 1);

    const x0 = i;

    let maxDist = 0;
    for (let j = adjustedLeft; j <= adjustedRight; j++) {
      const dist = Math.abs(j - x0);
      if (dist > maxDist) maxDist = dist;
    }

    const currentPoint = points[i];
    if (maxDist === 0 && currentPoint) {
      result[i] = { ...currentPoint };
      continue;
    }

    let sumW = 0;
    let sumWX = 0;
    let sumWY = 0;
    let sumWXX = 0;
    let sumWXY = 0;

    for (let j = adjustedLeft; j <= adjustedRight; j++) {
      const p = points[j];
      const dist = Math.abs(j - x0) / maxDist;
      // Tricube weight function
      const w = Math.pow(1 - Math.pow(dist, 3), 3);
      const x = j;
      const yj = p?.value ?? 0;

      sumW += w;
      sumWX += w * x;
      sumWY += w * yj;
      sumWXX += w * x * x;
      sumWXY += w * x * yj;
    }

    const denom = sumW * sumWXX - sumWX * sumWX;
    let a: number;
    let b: number;

    if (denom === 0) {
      a = sumWY / (sumW || 1);
      b = 0;
    } else {
      b = (sumW * sumWXY - sumWX * sumWY) / denom;
      a = (sumWY - b * sumWX) / sumW;
    }

    result[i] = {
      value: a + b * x0,
      date: currentPoint?.date ?? 0,
      title: currentPoint?.title,
      comment: currentPoint?.comment,
    };
  }

  return result;
}

export interface TangentResult {
  /** Скорость изменения значения за день (численная производная) */
  dValPerDay: number;
  /** Координаты линии касательной в системе координат SVG */
  line: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  /** Координаты точки касания */
  point: {
    x: number;
    y: number;
  };
}

/**
 * Расчёт численной производной и геометрической линии касательной в заданной точке серии.
 */
export function calculateTangent({
  points,
  pointIndex,
  scale,
  maxValue,
  topPadding,
  length = 300,
}: {
  points: TGraphPoint[];
  pointIndex: number;
  scale: { forDay: number; forValue: number };
  maxValue: number;
  topPadding: number;
  length?: number;
}): TangentResult | null {
  if (!points || points.length < 3) return null;

  const iClamped = Math.max(1, Math.min(points.length - 2, pointIndex));

  const prev = points[iClamped - 1]?.value ?? 0;
  const next = points[iClamped + 1]?.value ?? 0;
  const curr = points[iClamped]?.value ?? 0;

  // Центральная разность: скорость в единицу (день)
  const dValPerDay = (next - prev) / 2;

  // Координаты точки в SVG
  const px = iClamped * scale.forDay + scale.forDay * 0.5;
  const py = topPadding + (maxValue - curr) * scale.forValue;

  // Наклон в SVG-пикселях: ось Y направлена вниз
  const slopeSvg = (-dValPerDay * scale.forValue) / (scale.forDay || 1);

  const mag = Math.sqrt(1 + slopeSvg * slopeSvg);
  const dx = length / mag;
  const dy = slopeSvg * dx;

  return {
    dValPerDay,
    line: {
      x1: px - dx,
      y1: py - dy,
      x2: px + dx,
      y2: py + dy,
    },
    point: {
      x: px,
      y: py,
    },
  };
}
