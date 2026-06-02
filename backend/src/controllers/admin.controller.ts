import type { Request, Response } from 'express';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { sendApprovalEmail } from '../services/mail.js';

const publicFields = '-password -resetPasswordToken -resetPasswordExpires';

function statusFilter(status?: string) {
  return {
    $or: [{ status }, { approvalStatus: status }]
  };
}

async function buildStats() {
  const [totalStudents, totalFaculty, pendingApprovals, approvedUsers, rejectedUsers] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'faculty' }),
    User.countDocuments({ role: { $in: ['student', 'faculty'] }, ...statusFilter('pending') }),
    User.countDocuments(statusFilter('approved')),
    User.countDocuments(statusFilter('rejected'))
  ]);

  return {
    totalStudents,
    totalFaculty,
    pendingApprovals,
    approvedUsers,
    rejectedUsers
  };
}

export async function pendingUsers(_req: Request, res: Response) {
  const users = await User.find({
    role: { $in: ['student', 'faculty'] },
    ...statusFilter('pending')
  })
    .select(publicFields)
    .populate('department', 'name code')
    .sort({ createdAt: -1 });

  res.json({
    pendingStudents: users.filter((user) => user.role === 'student'),
    pendingFaculty: users.filter((user) => user.role === 'faculty'),
    users
  });
}

export async function allUsers(_req: Request, res: Response) {
  const users = await User.find()
    .select(publicFields)
    .populate('department', 'name code')
    .sort({ createdAt: -1 });
  res.json({ users, stats: await buildStats() });
}

export async function approveUser(req: Request, res: Response) {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: 'approved', approvalStatus: 'approved', rejectionReason: '', isActive: true },
    { new: true }
  )
    .select(publicFields)
    .populate('department', 'name code');

  if (!user) throw new AppError('User not found', 404);
  await sendApprovalEmail(user.email, user.name, true);
  res.json({ message: 'User approved successfully', user });
}

export async function rejectUser(req: Request, res: Response) {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      status: 'rejected',
      approvalStatus: 'rejected',
      rejectionReason: 'Rejected by administrator',
      isActive: true
    },
    { new: true }
  )
    .select(publicFields)
    .populate('department', 'name code');

  if (!user) throw new AppError('User not found', 404);
  await sendApprovalEmail(user.email, user.name, false, user.rejectionReason);
  res.json({ message: 'User rejected successfully', user });
}
