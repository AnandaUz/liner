import { Request, Response } from 'express';
import { WeightLog } from '../models/WeightLog.js';

export const getWeightLogByUserId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const logs = await WeightLog
      .find({ userId: id as string })
      .select('date weight comment -_id')  // только нужные поля, без _id
      .sort({ date: 1 })
      .lean();

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error });
  }
};