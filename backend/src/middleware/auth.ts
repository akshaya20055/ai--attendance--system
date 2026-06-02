import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors.js';
import { verifyToken } from '../utils/tokens.js';
import { User } from '../models/User.js';

type TokenPayload = {
  id: string;
  role: 'student' | 'faculty' | 'admin';
};

export async function protect(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) return next(new AppError('Authentication token is required', 401));

  try {
    const decoded = verifyToken<TokenPayload>(token);
    const user = await User.findById(decoded.id).select('_id role department isActive status approvalStatus');
    const status = user?.status || user?.approvalStatus;
    if (!user || !user.isActive || status !== 'approved') {
      return next(new AppError('User account is inactive or pending approval', 401));
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      department: user.department
    };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

export function authorize(...roles: Array<'student' | 'faculty' | 'admin'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to access this resource', 403));
    }
    next();
  };
}
