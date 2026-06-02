import { Router } from 'express';
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment
} from '../controllers/department.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authorize, protect } from '../middleware/auth.js';

export const departmentRouter = Router();

departmentRouter.use(protect);
departmentRouter.get('/', asyncHandler(listDepartments));
departmentRouter.post('/', authorize('admin'), asyncHandler(createDepartment));
departmentRouter.patch('/:id', authorize('admin'), asyncHandler(updateDepartment));
departmentRouter.delete('/:id', authorize('admin'), asyncHandler(deleteDepartment));
