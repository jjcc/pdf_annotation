export interface Annotation {
  id: string;
  name: string;
  regex: string;
  anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  width: number; // normalized 0-1
  height: number; // normalized 0-1
  page: number;
}