import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_attendance',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  faceMatchThreshold: Number(process.env.FACE_MATCH_THRESHOLD || 0.62),
  visualFaceMatchThreshold: Number(process.env.VISUAL_FACE_MATCH_THRESHOLD ?? -0.25),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  adminRegistrationCode: process.env.ADMIN_REGISTRATION_CODE || 'CAMPUS-ADMIN-2026',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'AI Attendance <no-reply@campus.ai>'
  }
};
