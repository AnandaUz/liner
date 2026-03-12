// src/types.ts

export type Page = () => {
  html: string;
  init?: () => void;
};

export type Routes = Record<string, Page>;