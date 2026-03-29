import type { IWeightLog } from '@shared/types';
import { fetchWithAuth } from './api';

const cache = new Map<string, IWeightLog[]>();

export async function getWeightLog(userId: string): Promise<IWeightLog[]> {
  if (cache.has(userId)) return cache.get(userId)!;

  const response = await fetchWithAuth(`/api/weightLog/${userId}`);
  if (!response.ok) throw new Error(`Ошибка: ${response.status}`);

  const data = await response.json() as IWeightLog[];
  cache.set(userId, data);
  return data;
}