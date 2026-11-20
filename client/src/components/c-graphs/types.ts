export interface TGraphPoint {
  value: number;
  date: number;
  title?: string | undefined;
  comment?: string | undefined;
  isDashed?: boolean | undefined;
}

export interface GraphSettings {
  color?: string | undefined;
  strokeWidth?: number | undefined;
  pointRadius?: number | undefined;
  interactiveRadius?: number | undefined;
  enableTangent?: boolean | undefined;
  isTrend?: boolean | undefined;
  onHoverPoint?: ((info: {
    point: TGraphPoint;
    index: number;
    prev?: TGraphPoint | null | undefined;
    prevWeek?: TGraphPoint | null | undefined;
    tangent?: { dValPerDay: number } | null | undefined;
  }) => string | void) | undefined;
}

export interface IGraphSeries {
  settings?: GraphSettings | undefined;
  points: Map<number, TGraphPoint> | TGraphPoint[];
}

export interface IGraphsConstructorParams {
  title?: string | undefined;
}

export interface IGraphsBounds {
  minValue: number;
  maxValue: number;
  minDate: number;
  maxDate: number;
  dayCount: number;
}
