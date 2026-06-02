import type { Request, Response } from 'express';
import { z } from 'zod';
import { Subject } from '../models/Subject.js';

const subjectSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

export async function listSubjects(_req: Request, res: Response) {
  const subjects = await Subject.find().sort('name');
  res.json({ subjects });
}

export async function createSubject(req: Request, res: Response) {
  const payload = subjectSchema.parse(req.body);
  const subject = await Subject.create(payload);
  res.status(201).json({ subject });
}

export async function updateSubject(req: Request, res: Response) {
  const payload = subjectSchema.partial().parse(req.body);
  const subject = await Subject.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  res.json({ subject });
}

export async function deleteSubject(req: Request, res: Response) {
  await Subject.findByIdAndDelete(req.params.id);
  res.json({ message: 'Subject deleted' });
}
