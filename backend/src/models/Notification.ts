import { Schema, model } from 'mongoose';

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'warning', 'success'], default: 'info' },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Notification = model('Notification', notificationSchema);
