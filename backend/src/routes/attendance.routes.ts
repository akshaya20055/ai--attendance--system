import { Router } from 'express';
import {
  exportAttendance,
  listAttendance,
  markAttendance,
  studentSummary,
  updateAttendance
} from '../controllers/attendance.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authorize, protect } from '../middleware/auth.js';

export const attendanceRouter = Router();

attendanceRouter.use(protect);
attendanceRouter.get('/', asyncHandler(listAttendance));
attendanceRouter.post('/mark', authorize('student', 'faculty', 'admin'), asyncHandler(markAttendance));
attendanceRouter.patch('/:id', authorize('faculty', 'admin'), asyncHandler(updateAttendance));
attendanceRouter.get('/summary/me', authorize('student'), asyncHandler(studentSummary));
attendanceRouter.get('/summary/:studentId', authorize('faculty', 'admin'), asyncHandler(studentSummary));
attendanceRouter.get('/export/:format', authorize('faculty', 'admin'), asyncHandler(exportAttendance));
