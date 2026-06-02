import bcrypt from 'bcryptjs';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export type UserRole = 'student' | 'faculty' | 'admin';

export type IUser = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: Types.ObjectId;
  studentId?: string;
  employeeId?: string;
  phone?: string;
  semester?: number;
  year?: number;
  status: 'pending' | 'approved' | 'rejected';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  avatar?: string;
  faceDescriptor?: number[];
  faceEmbeddings?: number[][];
  faceImages?: string[];
  isActive: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  comparePassword(candidate: string): Promise<boolean>;
};

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['student', 'faculty', 'admin'], required: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    studentId: { type: String, trim: true },
    employeeId: { type: String, trim: true },
    phone: { type: String, trim: true },
    semester: { type: Number, min: 1, max: 12 },
    year: { type: Number, min: 1, max: 6 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: '' },
    avatar: { type: String },
    faceDescriptor: [{ type: Number }],
    faceEmbeddings: [[{ type: Number }]],
    faceImages: [{ type: String }],
    isActive: { type: Boolean, default: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);

userSchema.pre('save', async function hash(next) {
  if (this.isModified('status')) this.approvalStatus = this.status;
  if (this.isModified('approvalStatus')) this.status = this.approvalStatus;
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.index({ role: 1, department: 1 });
userSchema.index({ role: 1, status: 1 });

export type UserDocument = HydratedDocument<IUser>;
export const User = model<IUser>('User', userSchema);
