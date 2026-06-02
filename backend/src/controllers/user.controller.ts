import type { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { sendApprovalEmail } from '../services/mail.js';

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).default('Password@123'),
  role: z.enum(['student', 'faculty', 'admin']),
  department: z.string().optional(),
  studentId: z.string().optional(),
  employeeId: z.string().optional(),
  phone: z.string().optional(),
  semester: z.number().optional(),
  faceDescriptor: z.array(z.number()).optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional()
});

export async function listUsers(req: Request, res: Response) {
  const filter: Record<string, unknown> = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;

  const users = await User.find(filter).select('-password').populate('department', 'name code').sort('name');
  res.json({ users });
}

export async function createUser(req: Request, res: Response) {
  const payload = createUserSchema.parse(req.body);
  const exists = await User.findOne({ email: payload.email });
  if (exists) throw new AppError('Email already exists', 409);
  const user = await User.create(payload);
  res.status(201).json({ user });
}

export async function updateUser(req: Request, res: Response) {
  const payload = createUserSchema.partial().parse(req.body);
  if ('password' in payload) delete payload.password;
  const user = await User.findByIdAndUpdate(req.params.id, payload, { new: true }).select('-password');
  if (!user) throw new AppError('User not found', 404);
  res.json({ user });
}

export async function removeUser(req: Request, res: Response) {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) throw new AppError('User not found', 404);
  res.json({ message: 'User deactivated' });
}

export async function approveUser(req: Request, res: Response) {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: 'approved', approvalStatus: 'approved', rejectionReason: '', isActive: true },
    { new: true }
  ).select('-password');
  if (!user) throw new AppError('User not found', 404);
  await sendApprovalEmail(user.email, user.name, true);
  res.json({ message: 'User approved', user });
}

export async function rejectUser(req: Request, res: Response) {
  const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: 'rejected', approvalStatus: 'rejected', rejectionReason: reason || 'Not approved by admin' },
    { new: true }
  ).select('-password');
  if (!user) throw new AppError('User not found', 404);
  await sendApprovalEmail(user.email, user.name, false, user.rejectionReason);
  res.json({ message: 'User rejected', user });
}
