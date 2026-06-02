import { Router } from 'express';
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject
} from '../controllers/subject.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authorize, protect } from '../middleware/auth.js';

export const subjectRouter = Router();

subjectRouter.use(protect);
subjectRouter.get('/', asyncHandler(listSubjects));
subjectRouter.post('/', authorize('admin'), asyncHandler(createSubject));
subjectRouter.patch('/:id', authorize('admin'), asyncHandler(updateSubject));
subjectRouter.delete('/:id', authorize('admin'), asyncHandler(deleteSubject));
