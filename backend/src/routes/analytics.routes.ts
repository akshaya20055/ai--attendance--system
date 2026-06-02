import { Router } from 'express';
import { analytics } from '../controllers/analytics.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authorize, protect } from '../middleware/auth.js';

export const analyticsRouter = Router();

analyticsRouter.get('/', protect, authorize('admin'), asyncHandler(analytics));
