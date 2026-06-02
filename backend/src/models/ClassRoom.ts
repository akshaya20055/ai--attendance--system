import { Schema, model } from 'mongoose';

const classRoomSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    subject: { type: String, required: true, trim: true },
    semester: { type: Number, required: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    faculty: { type: Schema.Types.ObjectId, ref: 'User' },
    students: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    schedule: [
      {
        day: String,
        startTime: String,
        endTime: String
      }
    ],
    qrSecret: { type: String, required: true }
  },
  { timestamps: true }
);

classRoomSchema.index({ faculty: 1, department: 1 });

export const ClassRoom = model('ClassRoom', classRoomSchema);
