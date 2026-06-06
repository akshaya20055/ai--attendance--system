import { Router } from 'express';
import { deleteFaceEnrollment, getFaceEnrollment, matchFace, saveFaceEnrollment } from '../controllers/face.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authorize, protect } from '../middleware/auth.js';

export const faceRouter = Router();

faceRouter.use(protect);
faceRouter.get('/enrollment', asyncHandler(getFaceEnrollment));
faceRouter.post('/enrollment', asyncHandler(saveFaceEnrollment));
faceRouter.delete('/enrollment/:userId', authorize('admin'), asyncHandler(deleteFaceEnrollment));
faceRouter.post('/match', asyncHandler(matchFace));
