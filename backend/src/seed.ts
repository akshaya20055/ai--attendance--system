import { connectDb } from './config/db.js';
import { ClassRoom } from './models/ClassRoom.js';
import { Department } from './models/Department.js';
import { Subject } from './models/Subject.js';
import { User } from './models/User.js';
import { ensureDefaultSubjects } from './services/subjects.js';

async function seed() {
  await connectDb();
  await Promise.all([User.deleteMany({}), Department.deleteMany({}), ClassRoom.deleteMany({}), Subject.deleteMany({})]);

  const cse = await Department.create({
    name: 'Computer Science Engineering',
    code: 'CSE',
    description: 'AI, data systems, software engineering'
  });

  const [admin, faculty, student] = await User.create([
    {
      name: 'Campus Admin',
      email: 'admin@campus.ai',
      password: 'Password@123',
      role: 'admin',
      department: cse._id,
      employeeId: 'ADM-001',
      status: 'approved',
      approvalStatus: 'approved',
      isActive: true
    },
    {
      name: 'Dr. Asha Mehta',
      email: 'faculty@campus.ai',
      password: 'Password@123',
      role: 'faculty',
      department: cse._id,
      employeeId: 'FAC-101',
      status: 'approved',
      approvalStatus: 'approved',
      isActive: true
    },
    {
      name: 'Riya Sharma',
      email: 'student@campus.ai',
      password: 'Password@123',
      role: 'student',
      department: cse._id,
      studentId: 'CSE-2026-001',
      semester: 6,
      year: 3,
      faceDescriptor: [0.13, 0.22, 0.41, 0.19],
      status: 'approved',
      approvalStatus: 'approved',
      isActive: true
    }
  ]);

  await ClassRoom.create({
    name: 'CSE VI - Machine Learning',
    code: 'CSE-ML-601',
    subject: 'Machine Learning',
    semester: 6,
    department: cse._id,
    faculty: faculty._id,
    students: [student._id],
    schedule: [{ day: 'Monday', startTime: '10:00', endTime: '11:00' }],
    qrSecret: 'demo-secret'
  });

  await ensureDefaultSubjects();

  console.log('Seeded demo data');
  console.log('Admin:', admin.email);
  console.log('Faculty:', faculty.email);
  console.log('Student:', student.email);
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
