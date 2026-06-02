import { Router } from 'express';
import { createClass, getClassQr, listClasses, updateClass } from '../controllers/class.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authorize, protect } from '../middleware/auth.js';

export const classRouter = Router();

classRouter.use(protect);
classRouter.get('/', asyncHandler(listClasses));
classRouter.post('/', authorize('faculty', 'admin'), asyncHandler(createClass));
classRouter.patch('/:id', authorize('faculty', 'admin'), asyncHandler(updateClass));
classRouter.get('/:id/qr', authorize('faculty', 'admin'), asyncHandler(getClassQr));
