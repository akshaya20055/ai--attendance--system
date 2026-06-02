import type { Request, Response } from 'express';
import { z } from 'zod';
import { Department } from '../models/Department.js';

const departmentSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  description: z.string().optional()
});

export async function listDepartments(_req: Request, res: Response) {
  const departments = await Department.find().sort('name');
  res.json({ departments });
}

export async function createDepartment(req: Request, res: Response) {
  const payload = departmentSchema.parse(req.body);
  const department = await Department.create(payload);
  res.status(201).json({ department });
}

export async function updateDepartment(req: Request, res: Response) {
  const payload = departmentSchema.partial().parse(req.body);
  const department = await Department.findByIdAndUpdate(req.params.id, payload, { new: true });
  res.json({ department });
}

export async function deleteDepartment(req: Request, res: Response) {
  await Department.findByIdAndDelete(req.params.id);
  res.json({ message: 'Department deleted' });
}
