import crypto from 'crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { signToken } from '../utils/tokens.js';
import { sendPasswordReset, sendWelcomeEmail } from '../services/mail.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['student', 'faculty', 'admin'])
});

const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number');

const baseRegisterShape = {
  name: z.string().min(2),
  email: z.string().email(),
  password: strongPassword,
  confirmPassword: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  semester: z.coerce.number().optional(),
  year: z.coerce.number().optional()
};

function publicUser(user: any) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    studentId: user.studentId,
    employeeId: user.employeeId,
    semester: user.semester,
    year: user.year,
    phone: user.phone,
    status: user.status || user.approvalStatus,
    approvalStatus: user.approvalStatus,
    avatar: user.avatar,
    faceEnrollmentCount: user.faceEmbeddings?.length || 0,
    hasFaceEnrollment: Boolean(user.faceEmbeddings?.length)
  };
}

async function resolveDepartment(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  const conditions: Array<Record<string, string>> = [{ code: trimmed.toUpperCase() }, { name: trimmed }];
  if (/^[0-9a-fA-F]{24}$/.test(trimmed)) conditions.push({ _id: trimmed });
  const existing = await Department.findOne({ $or: conditions });
  if (existing) return existing._id;
  const created = await Department.create({
    name: trimmed,
    code: trimmed.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() || 'DEPT'
  });
  return created._id;
}

async function createAccount(role: 'student' | 'faculty' | 'admin', req: Request, res: Response) {
  const payload = z
    .object({
      ...baseRegisterShape,
      rollNumber: z.string().optional(),
      studentId: z.string().optional(),
      employeeId: z.string().optional(),
      adminCode: z.string().optional()
    })
    .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword']
    })
    .parse(req.body);

  if (role === 'admin' && payload.adminCode !== env.adminRegistrationCode) {
    throw new AppError('Invalid admin registration code', 403);
  }

  const exists = await User.findOne({ email: payload.email });
  if (exists) throw new AppError('Email already exists', 409);

  const department = await resolveDepartment(payload.department);
  const user = await User.create({
    name: payload.name,
    email: payload.email,
    password: payload.password,
    role,
    department,
    phone: payload.phone,
    semester: payload.semester,
    year: payload.year,
    studentId: payload.studentId || payload.rollNumber,
    employeeId: payload.employeeId,
    status: role === 'admin' ? 'approved' : 'pending',
    approvalStatus: role === 'admin' ? 'approved' : 'pending',
    isActive: true
  });

  await sendWelcomeEmail(user.email, user.name);

  res.status(201).json({
    message:
      (user.status || user.approvalStatus) === 'approved'
        ? 'Registration successful. You can now log in.'
        : 'Registration submitted. An admin must approve your account before login.',
    user: publicUser(user)
  });
}

export async function register(req: Request, res: Response) {
  const role = z.enum(['student', 'faculty', 'admin']).parse(req.body.role);
  return createAccount(role, req, res);
}

export async function registerStudent(req: Request, res: Response) {
  return createAccount('student', req, res);
}

export async function registerFaculty(req: Request, res: Response) {
  return createAccount('faculty', req, res);
}

export async function registerAdmin(req: Request, res: Response) {
  return createAccount('admin', req, res);
}

export async function login(req: Request, res: Response) {
  const payload = loginSchema.parse(req.body);
  const account = await User.findOne({ email: payload.email });
  if (!account) {
    throw new AppError('Account does not exist.', 404);
  }
  if (account.role !== payload.role) {
    throw new AppError(`No ${payload.role} account exists for this email.`, 404);
  }

  const user = await User.findOne({ email: payload.email, role: payload.role }).select('+password');
  if (!user || !(await user.comparePassword(payload.password))) {
    throw new AppError('Password mismatch.', 401);
  }
  const status = user.status || user.approvalStatus;
  if (!user.isActive) throw new AppError('Account is inactive. Contact an administrator.', 403);
  if (status === 'pending') throw new AppError('Your account is awaiting admin approval.', 403);
  if (status === 'rejected') throw new AppError('Your account has been rejected.', 403);

  const token = signToken({ id: user._id, role: user.role });
  res.json({ token, user: publicUser(user) });
}

export async function logout(_req: Request, res: Response) {
  res.json({ message: 'Logged out successfully' });
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user?.id).populate('department', 'name code');
  res.json({ user: publicUser(user) });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const user = await User.findOne({ email });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 15);
    await user.save();
    await sendPasswordReset(email, `${env.frontendUrl}/reset-password/${rawToken}`);
  }

  res.json({ message: 'If the email exists, a reset link has been sent.' });
}

export async function resetPassword(req: Request, res: Response) {
  const token = req.params.token || req.body.token;
  if (!token) throw new AppError('Reset token is required', 400);
  const { password } = z.object({ password: z.string().min(8) }).parse(req.body);
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hash,
    resetPasswordExpires: { $gt: new Date() }
  });

  if (!user) throw new AppError('Reset token is invalid or expired', 400);
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: 'Password updated successfully' });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword, confirmPassword } = z
    .object({
      currentPassword: z.string().min(8),
      newPassword: strongPassword,
      confirmPassword: z.string().min(8)
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword']
    })
    .parse(req.body);

  const user = await User.findById(req.user?.id).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 400);
  }

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password changed successfully' });
}
