import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { attendanceRouter } from './routes/attendance.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { classRouter } from './routes/class.routes.js';
import { departmentRouter } from './routes/department.routes.js';
import { faceRouter } from './routes/face.routes.js';
import { subjectRouter } from './routes/subject.routes.js';
import { userRouter } from './routes/user.routes.js';
import { errorHandler, notFound } from './utils/errors.js';

export const app = express();

const allowedOrigins = new Set([
  env.frontendUrl,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
]);

function isAllowedOrigin(origin?: string) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1):517\d$/.test(origin);
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(morgan('dev'));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many local API requests. Please wait a moment and try again.' }
  })
);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ai-attendance-api' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/users', userRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/subjects', subjectRouter);
app.use('/api/classes', classRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/face', faceRouter);

app.use(notFound);
app.use(errorHandler);
