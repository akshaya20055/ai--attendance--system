import axios from 'axios';

export const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
export const API_BASE_URL = BACKEND_URL.endsWith('/api') ? BACKEND_URL : `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ai-attendance-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export type Role = 'student' | 'faculty' | 'admin';

export type User = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: Role;
  studentId?: string;
  employeeId?: string;
  semester?: number;
  year?: number;
  phone?: string;
  status?: 'pending' | 'approved' | 'rejected';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  department?: { _id: string; name: string; code: string } | string;
  createdAt?: string;
  updatedAt?: string;
  faceImages?: string[];
  faceEmbeddings?: number[][];
  faceEnrollmentCount?: number;
  hasFaceEnrollment?: boolean;
};

export type ClassRoom = {
  _id: string;
  name: string;
  code: string;
  subject: string;
  semester: number;
  students: User[];
};

export type Subject = {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
};

export type AttendanceRecord = {
  _id: string;
  student: User;
  studentId?: string;
  studentName?: string;
  classRoom: ClassRoom;
  subjectId?: Subject | string;
  subject: string;
  subjectName?: string;
  date: string;
  time?: string;
  status: 'present' | 'absent' | 'late';
  method: 'face' | 'webcam' | 'manual' | 'qr';
  confidence?: number;
};
