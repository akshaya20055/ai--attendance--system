import { Schema, model } from 'mongoose';

const attendanceSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    classRoom: { type: Schema.Types.ObjectId, ref: 'ClassRoom', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    subject: { type: String, required: true },
    subjectName: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: ['present', 'absent', 'late'], required: true },
    method: { type: String, enum: ['face', 'webcam', 'manual', 'qr'], required: true },
    confidence: { type: Number, default: 0 },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

attendanceSchema.index(
  { student: 1, classRoom: 1, subject: 1, date: 1 },
  { unique: true }
);
attendanceSchema.index(
  { student: 1, subject: 1, date: 1 },
  { unique: true }
);

export const Attendance = model('Attendance', attendanceSchema);
