export interface CarouselOdePreview {
  kind: "ode";
  states: number[][];
  index: number;
  params: Record<string, number>;
  expression?: string;
  hillProfile?: Array<{ x: number; y: number }>;
}

export interface CarouselVariationalPreview {
  kind: "variational";
  points: Array<{ x: number; y: number }>;
  referencePoints?: Array<{ x: number; y: number }>;
  beadProgress?: number;
}

export type CarouselPreview = CarouselOdePreview | CarouselVariationalPreview;
export type CarouselPreviewMap = Record<string, CarouselPreview>;
