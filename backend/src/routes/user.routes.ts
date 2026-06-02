import { Router } from 'express';
import { approveUser, createUser, listUsers, rejectUser, removeUser, updateUser } from '../controllers/user.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authorize, protect } from '../middleware/auth.js';

export const userRouter = Router();

userRouter.use(protect);
userRouter.get('/', authorize('admin', 'faculty'), asyncHandler(listUsers));
userRouter.post('/', authorize('admin'), asyncHandler(createUser));
userRouter.patch('/:id/approve', authorize('admin'), asyncHandler(approveUser));
userRouter.patch('/:id/reject', authorize('admin'), asyncHandler(rejectUser));
userRouter.patch('/:id', authorize('admin'), asyncHandler(updateUser));
userRouter.delete('/:id', authorize('admin'), asyncHandler(removeUser));
