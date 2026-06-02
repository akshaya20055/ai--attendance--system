import type { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';

const threshold = Number.isFinite(env.faceMatchThreshold)
  ? Math.min(Math.max(env.faceMatchThreshold, 0.1), 0.99)
  : 0.62;
const visualThreshold = Number.isFinite(env.visualFaceMatchThreshold)
  ? Math.min(Math.max(env.visualFaceMatchThreshold, -0.5), 0.99)
  : -0.25;

const embeddingSchema = z.array(z.number()).min(20);
const enrollmentSchema = z.object({
  embeddings: z.array(embeddingSchema).min(5),
  images: z.array(z.string().startsWith('data:image/').max(1_500_000)).min(5).optional()
});
const matchSchema = z.object({
  embedding: embeddingSchema,
  studentId: z.string().optional()
});

function cosineSimilarity(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function isVisualEmbedding(embedding: number[]) {
  return embedding.length === 144;
}

export async function getFaceEnrollment(req: Request, res: Response) {
  const user = await User.findById(req.user?.id).select('name role status approvalStatus isActive faceEmbeddings faceImages updatedAt');
  if (!user) throw new AppError('Student account was not found', 404);
  if (user.role !== 'student') throw new AppError('Only students have face enrollment records', 403);

  console.log('[FaceEnrollment] Student enrollment loaded', {
    userId: String(user._id),
    name: user.name,
    count: user.faceEmbeddings?.length || 0,
    images: user.faceImages?.length || 0
  });

  res.json({
    enrolled: Boolean(user?.faceEmbeddings?.length),
    count: user?.faceEmbeddings?.length || 0,
    imageCount: user?.faceImages?.length || 0,
    userId: user._id,
    studentId: user._id,
    updatedAt: (user as any).updatedAt
  });
}

export async function saveFaceEnrollment(req: Request, res: Response) {
  if (req.user?.role !== 'student') throw new AppError('Only students can enroll their own face', 403);
  const payload = enrollmentSchema.parse(req.body);
  const student = await User.findById(req.user.id).select('name role status approvalStatus isActive');
  if (!student) throw new AppError('Student account was not found', 404);
  if (student.role !== 'student') throw new AppError('Only students can enroll their own face', 403);
  if (!student.isActive || (student.status || student.approvalStatus) !== 'approved') {
    throw new AppError('Student account is inactive or pending approval', 403);
  }

  console.log('[FaceEnrollment] Saving embeddings', {
    userId: req.user.id,
    studentName: student.name,
    count: payload.embeddings.length,
    dimensions: payload.embeddings.map((embedding) => embedding.length),
    images: payload.images?.length || 0
  });
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { faceEmbeddings: payload.embeddings, faceImages: payload.images || [] },
    { new: true, runValidators: true }
  ).select('faceEmbeddings faceImages');
  if (!user) throw new AppError('Student account was not found while saving enrollment', 404);
  console.log('[FaceEnrollment] Enrollment saved', {
    userId: req.user.id,
    count: user.faceEmbeddings?.length || 0,
    images: user.faceImages?.length || 0
  });
  res.json({
    message: 'Face enrollment saved',
    enrolled: true,
    count: user?.faceEmbeddings?.length || 0,
    imageCount: user?.faceImages?.length || 0,
    userId: user._id,
    studentId: user._id
  });
}

export async function matchFace(req: Request, res: Response) {
  const payload = matchSchema.parse(req.body);
  const studentId = req.user?.role === 'student' ? req.user.id : payload.studentId;
  if (!studentId) throw new AppError('Student is required for face match', 400);

  const student = await User.findById(studentId).select('name role status approvalStatus isActive faceEmbeddings');
  if (!student) throw new AppError('Invalid student for face match', 404);
  if (student.role !== 'student') throw new AppError('Face match target must be a student', 400);
  if (!student.isActive || (student.status || student.approvalStatus) !== 'approved') {
    throw new AppError('Student account is inactive or pending approval', 403);
  }

  console.log('[FaceRecognition] Student loaded for match', {
    requestedStudentId: studentId,
    userId: String(student._id),
    name: student.name,
    enrolledSamples: student.faceEmbeddings?.length || 0,
    probeDimensions: payload.embedding.length
  });

  if (!student.faceEmbeddings?.length) {
    throw new AppError('No face enrollment found for this student', 400);
  }

  const scores = student.faceEmbeddings.map((stored) => cosineSimilarity(payload.embedding, stored));
  const score = Math.max(...scores);
  const effectiveThreshold = isVisualEmbedding(payload.embedding) ? visualThreshold : threshold;
  const matched = score >= effectiveThreshold;
  console.log('[FaceRecognition] Match result', {
    studentId,
    studentName: student.name,
    score: Math.round(score * 1000) / 1000,
    threshold: effectiveThreshold,
    strictThreshold: threshold,
    visualThreshold,
    matched,
    probeDimensions: payload.embedding.length,
    enrolledSamples: student.faceEmbeddings.length
  });
  res.json({
    matched,
    score: Math.round(score * 1000) / 1000,
    threshold: effectiveThreshold,
    strictThreshold: threshold,
    visualThreshold,
    enrolledSamples: student.faceEmbeddings.length,
    userId: student._id,
    studentId: student._id,
    student: { id: student._id, name: student.name }
  });
}
