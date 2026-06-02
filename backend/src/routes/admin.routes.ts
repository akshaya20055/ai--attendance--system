import { Router } from 'express';
import { allUsers, approveUser, pendingUsers, rejectUser } from '../controllers/admin.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authorize, protect } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.use(protect, authorize('admin'));
adminRouter.get('/pending-users', asyncHandler(pendingUsers));
adminRouter.get('/all-users', asyncHandler(allUsers));
adminRouter.patch('/approve/:id', asyncHandler(approveUser));
adminRouter.patch('/reject/:id', asyncHandler(rejectUser));
