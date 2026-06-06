import type { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import { Attendance } from '../models/Attendance.js';
import { ClassRoom } from '../models/ClassRoom.js';
import { Department } from '../models/Department.js';
import { Subject } from '../models/Subject.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { getAttendanceSummary, predictAttendanceTrend } from '../services/analytics.js';

const markSchema = z.object({
  student: z.string().optional(),
  classRoom: z.string().optional(),
  subjectId: z.string().optional(),
  subject: z.string().optional(),
  status: z.enum(['present', 'absent', 'late']).default('present'),
  method: z.enum(['face', 'webcam', 'manual', 'qr']),
  confidence: z.number().optional(),
  notes: z.string().optional(),
  qrPayload: z.string().optional()
});

function openClassCode(subjectName: string) {
  const slug = subjectName.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 18) || 'SUBJECT';
  return `OPEN-${slug}`;
}

async function getOpenAttendanceClass(subjectName: string, departmentId?: unknown) {
  const department = departmentId
    || (await Department.findOne().select('_id'))?._id
    || (await Department.create({ name: 'General Department', code: 'GEN', description: 'Default department for open attendance' }))._id;

  return ClassRoom.findOneAndUpdate(
    { code: openClassCode(subjectName) },
    {
      name: `Open Attendance - ${subjectName}`,
      code: openClassCode(subjectName),
      subject: subjectName,
      semester: 1,
      department,
      qrSecret: `open-${openClassCode(subjectName).toLowerCase()}`
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

function startOfDay(input = new Date()) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

function currentTime(input = new Date()) {
  return input.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

async function populateAttendance(record: any) {
  return Attendance.findById(record._id)
    .populate('student', 'name email studentId')
    .populate('classRoom', 'name code subject')
    .populate('subjectId', 'name code')
    .populate('markedBy', 'name');
}

export async function markAttendance(req: Request, res: Response) {
  const payload = markSchema.parse(req.body);
  const subjectDoc = payload.subjectId
    ? await Subject.findById(payload.subjectId)
    : payload.subject
      ? await Subject.findOne({ name: payload.subject })
      : null;

  const initialClassRoom = payload.classRoom ? await ClassRoom.findById(payload.classRoom) : null;
  const subjectName = subjectDoc?.name || payload.subject || initialClassRoom?.subject;
  if (!subjectName) throw new AppError('Subject is required', 400);

  const classRoom = initialClassRoom || await getOpenAttendanceClass(subjectName, req.user?.department);

  if (payload.method === 'qr') {
    const parsed = payload.qrPayload ? JSON.parse(payload.qrPayload) : {};
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.secret !== classRoom.qrSecret || parsed.date !== today) {
      throw new AppError('QR code is invalid or expired', 400);
    }
  }

  const student = payload.student || req.user?.id;
  if (!student) throw new AppError('Student is required', 400);
  const studentDoc = await User.findById(student).select('name studentId email');
  if (!studentDoc) throw new AppError('Student not found', 404);
  const today = startOfDay();

  const existing = await Attendance.findOne({
    student,
    subjectName,
    date: today
  });

  if (existing) {
    console.log('[Attendance] Duplicate attendance prevented', {
      student,
      subjectName,
      date: today.toISOString(),
      method: payload.method
    });
    return res.json({
      attendance: await populateAttendance(existing),
      duplicatePrevented: true,
      message: 'Attendance already saved for this subject today'
    });
  }

  let record;
  try {
    record = await Attendance.create({
      student,
      studentId: studentDoc.studentId || String(studentDoc._id),
      studentName: studentDoc.name,
      classRoom: classRoom._id,
      subjectId: subjectDoc?._id,
      subject: subjectName,
      subjectName,
      date: today,
      time: currentTime(),
      status: payload.status,
      method: payload.method,
      confidence: payload.confidence || 0,
      notes: payload.notes,
      markedBy: req.user?.id
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      const duplicate = await Attendance.findOne({ student, subjectName, date: today });
      if (duplicate) {
        console.log('[Attendance] Duplicate attendance prevented after write race', {
          student,
          subjectName,
          date: today.toISOString(),
          method: payload.method
        });
        return res.json({
          attendance: await populateAttendance(duplicate),
          duplicatePrevented: true,
          message: 'Attendance already saved for this subject today'
        });
      }
    }
    throw error;
  }

  console.log('[Attendance] Attendance created', {
    attendanceId: String(record._id),
    student,
    studentName: studentDoc.name,
    subjectName,
    classRoom: String(classRoom._id),
    method: payload.method,
    confidence: payload.confidence || 0
  });

  res.status(201).json({ attendance: await populateAttendance(record), duplicatePrevented: false, message: 'Attendance marked successfully' });
}

export async function listAttendance(req: Request, res: Response) {
  const filter: Record<string, unknown> = {};
  if (req.user?.role === 'student') {
    filter.student = req.user.id;
  } else if (req.query.student) {
    filter.student = req.query.student;
  }
  if (req.query.classRoom) filter.classRoom = req.query.classRoom;

  const records = await Attendance.find(filter)
    .populate('student', 'name email studentId')
    .populate('classRoom', 'name code subject')
    .populate('subjectId', 'name code')
    .populate('markedBy', 'name')
    .sort('-date');
  res.json({ records });
}

export async function updateAttendance(req: Request, res: Response) {
  const payload = z
    .object({ status: z.enum(['present', 'absent', 'late']), notes: z.string().optional() })
    .parse(req.body);
  const attendance = await Attendance.findByIdAndUpdate(req.params.id, payload, { new: true });
  if (!attendance) throw new AppError('Attendance not found', 404);
  res.json({ attendance });
}

export async function studentSummary(req: Request, res: Response) {
  const studentId = req.params.studentId || req.user?.id;
  const summary = await getAttendanceSummary(studentId);
  const trend = predictAttendanceTrend(summary.subjectWise.map((item: any) => item.percentage));
  res.json({ ...summary, prediction: trend });
}

export async function exportAttendance(req: Request, res: Response) {
  const format = req.params.format;
  const records = await Attendance.find()
    .populate('student', 'name email studentId')
    .populate('classRoom', 'name code subject')
    .sort('-date')
    .limit(1000);

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance');
    sheet.columns = [
      { header: 'Student', key: 'student', width: 28 },
      { header: 'Subject', key: 'subject', width: 24 },
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Method', key: 'method', width: 12 }
    ];
    records.forEach((record: any) =>
      sheet.addRow({
        student: record.student?.name,
        subject: record.subject,
        date: record.date.toISOString().slice(0, 10),
        status: record.status,
        method: record.method
      })
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');
    await workbook.xlsx.write(res);
    return res.end();
  }

  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=attendance.pdf');
  doc.pipe(res);
  doc.fontSize(18).text('Attendance Report');
  doc.moveDown();
  records.forEach((record: any) => {
    doc.fontSize(10).text(`${record.student?.name || '-'} | ${record.subject} | ${record.status} | ${record.date.toISOString().slice(0, 10)}`);
  });
  doc.end();
}
