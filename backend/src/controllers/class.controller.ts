import crypto from 'crypto';
import type { Request, Response } from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';
import { ClassRoom } from '../models/ClassRoom.js';
import { AppError } from '../utils/errors.js';

const classSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  subject: z.string().min(2),
  semester: z.number(),
  department: z.string(),
  faculty: z.string().optional(),
  students: z.array(z.string()).default([]),
  schedule: z
    .array(z.object({ day: z.string(), startTime: z.string(), endTime: z.string() }))
    .default([])
});

export async function listClasses(req: Request, res: Response) {
  const filter: Record<string, unknown> = {};
  if (req.user?.role === 'faculty') filter.faculty = req.user.id;
  const classes = await ClassRoom.find(filter)
    .populate('department', 'name code')
    .populate('faculty', 'name email')
    .populate('students', 'name email studentId')
    .sort('-createdAt');
  res.json({ classes });
}

export async function createClass(req: Request, res: Response) {
  const payload = classSchema.parse(req.body);
  const classRoom = await ClassRoom.create({
    ...payload,
    faculty: payload.faculty || req.user?.id,
    qrSecret: crypto.randomBytes(16).toString('hex')
  });
  res.status(201).json({ classRoom });
}

export async function updateClass(req: Request, res: Response) {
  const payload = classSchema.partial().parse(req.body);
  const classRoom = await ClassRoom.findByIdAndUpdate(req.params.id, payload, { new: true });
  if (!classRoom) throw new AppError('Class not found', 404);
  res.json({ classRoom });
}

export async function getClassQr(req: Request, res: Response) {
  const classRoom = await ClassRoom.findById(req.params.id);
  if (!classRoom) throw new AppError('Class not found', 404);
  const payload = JSON.stringify({
    classId: classRoom._id,
    code: classRoom.code,
    secret: classRoom.qrSecret,
    date: new Date().toISOString().slice(0, 10)
  });
  const qr = await QRCode.toDataURL(payload);
  res.json({ qr, payload });
}
