import { Router } from 'express';
import { getFaceEnrollment, matchFace, saveFaceEnrollment } from '../controllers/face.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect } from '../middleware/auth.js';

export const faceRouter = Router();

faceRouter.use(protect);
faceRouter.get('/enrollment', asyncHandler(getFaceEnrollment));
faceRouter.post('/enrollment', asyncHandler(saveFaceEnrollment));
faceRouter.post('/match', asyncHandler(matchFace));
