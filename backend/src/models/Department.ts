import { Schema, model } from 'mongoose';

const departmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    description: { type: String, default: '' }
  },
  { timestamps: true }
);

export const Department = model('Department', departmentSchema);
