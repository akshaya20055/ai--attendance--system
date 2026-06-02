# AI Attendance Management System

A complete full-stack attendance platform built with React, TypeScript, Node.js, Express, MongoDB, Tailwind CSS, JWT auth, QR attendance, webcam attendance, TensorFlow.js face-detection hooks, reports, analytics, and role-based dashboards.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Recharts, TensorFlow.js, jsPDF, XLSX
- Backend: Node.js, Express, TypeScript, MongoDB, Mongoose, JWT, Zod, PDFKit, ExcelJS
- Roles: Student, Faculty, Admin

## Folder Structure

```text
frontend/   React + TypeScript UI
backend/    Express + MongoDB REST API
```

## Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Create environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Update `backend/.env` with your MongoDB connection string and JWT secret.

4. Start MongoDB locally. With Docker:

```bash
docker compose up -d
```

Or use any local/cloud MongoDB URI in `backend/.env`.

5. Seed demo users:

```bash
npm run seed --prefix backend
```

6. Run both apps:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000`

## Demo Users

Password for all seeded users: `Password@123`

- Admin: `admin@campus.ai`
- Faculty: `faculty@campus.ai`
- Student: `student@campus.ai`

## Notes

Face attendance uses TensorFlow.js webcam detection in the frontend. Students must save 5 face samples on the Face Enrollment page; the backend stores those embeddings against the logged-in MongoDB user id and uses them for `/api/face/match`. `FACE_MATCH_THRESHOLD` controls the cosine-similarity threshold. The attendance API prevents duplicate attendance by student, subject, and date.

## API Highlights

- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `GET /api/classes`
- `POST /api/attendance/mark`
- `GET /api/attendance/summary/me`
- `GET /api/attendance/export/pdf`
- `GET /api/attendance/export/xlsx`
- `GET /api/analytics`
