import { Router } from 'express';
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  me,
  register,
  registerAdmin,
  registerFaculty,
  registerStudent,
  resetPassword
} from '../controllers/auth.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(register));
authRouter.post('/student/register', asyncHandler(registerStudent));
authRouter.post('/faculty/register', asyncHandler(registerFaculty));
authRouter.post('/admin/register', asyncHandler(registerAdmin));
authRouter.post('/login', asyncHandler(login));
authRouter.post('/logout', protect, asyncHandler(logout));
authRouter.get('/me', protect, asyncHandler(me));
authRouter.post('/change-password', protect, asyncHandler(changePassword));
authRouter.post('/forgot-password', asyncHandler(forgotPassword));
authRouter.post('/reset-password/:token', asyncHandler(resetPassword));
authRouter.post('/reset-password', asyncHandler(resetPassword));
