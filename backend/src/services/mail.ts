import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

type MailPayload = {
  to: string;
  subject: string;
  html: string;
  fallback: string;
};

async function sendMail({ to, subject, html, fallback }: MailPayload) {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    console.log(fallback);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass }
  });

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject,
    html
  });
}

const shell = (title: string, body: string) => `
  <div style="font-family:Inter,Arial,sans-serif;background:#f6f8fb;padding:28px">
    <div style="max-width:560px;margin:auto;background:white;border-radius:12px;padding:28px;border:1px solid #e5e7eb">
      <h1 style="margin:0 0 12px;color:#101828">${title}</h1>
      <div style="color:#475467;font-size:15px;line-height:1.6">${body}</div>
    </div>
  </div>`;

export async function sendPasswordReset(email: string, resetUrl: string) {
  await sendMail({
    to: email,
    subject: 'Reset your AI Attendance password',
    html: shell('Reset your password', `<p>Use this secure link within 15 minutes:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`),
    fallback: `Password reset for ${email}: ${resetUrl}`
  });
}

export async function sendWelcomeEmail(email: string, name: string) {
  await sendMail({
    to: email,
    subject: 'Welcome to AI Attendance',
    html: shell('Welcome to AI Attendance', `<p>Hello ${name}, your registration was received.</p><p>You will be notified after approval.</p>`),
    fallback: `Welcome email for ${email}`
  });
}

export async function sendApprovalEmail(email: string, name: string, approved: boolean, reason = '') {
  await sendMail({
    to: email,
    subject: approved ? 'Account Approved' : 'Account Rejected',
    html: shell(
      approved ? 'Account approved' : 'Account rejected',
      approved
        ? `<p>Hello ${name}, your account has been approved. You can now login.</p>`
        : `<p>Hello ${name}, your account has been rejected by the administrator.</p><p>${reason}</p>`
    ),
    fallback: `${approved ? 'Approved' : 'Rejected'} account email for ${email}`
  });
}
