import type { Types } from 'mongoose';

declare global {
  namespace Express {
    interface User {
      id: string;
      role: 'student' | 'faculty' | 'admin';
      department?: Types.ObjectId;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
