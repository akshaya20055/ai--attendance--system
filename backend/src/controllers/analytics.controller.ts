import type { Request, Response } from 'express';
import { getSystemAnalytics } from '../services/analytics.js';

export async function analytics(_req: Request, res: Response) {
  const data = await getSystemAnalytics();
  res.json(data);
}
