import { ClassRoom } from '../models/ClassRoom.js';
import { Department } from '../models/Department.js';
import { Attendance } from '../models/Attendance.js';
import { Subject } from '../models/Subject.js';
import { User } from '../models/User.js';
import { defaultSubjects, ensureDefaultSubjects } from './subjects.js';

function startOfDay(input = new Date()) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function ensureDemoData() {
  const cse = await Department.findOneAndUpdate(
    { code: 'CSE' },
    {
      name: 'Computer Science Engineering',
      code: 'CSE',
      description: 'Default department for demo accounts'
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const admin =
    (await User.findOne({ email: 'admin@campus.ai' })) ||
    (await User.create({
      name: 'Campus Admin',
      email: 'admin@campus.ai',
      password: 'Password@123',
      role: 'admin',
      department: cse._id,
      employeeId: 'ADM-001',
      status: 'approved',
      approvalStatus: 'approved',
      isActive: true
    }));

  const faculty =
    (await User.findOne({ email: 'faculty@campus.ai' })) ||
    (await User.create({
      name: 'Dr. Asha Mehta',
      email: 'faculty@campus.ai',
      password: 'Password@123',
      role: 'faculty',
      department: cse._id,
      employeeId: 'FAC-101',
      phone: '9876543210',
      status: 'approved',
      approvalStatus: 'approved',
      isActive: true
    }));

  const student =
    (await User.findOne({ email: 'student@campus.ai' })) ||
    (await User.create({
      name: 'Riya Sharma',
      email: 'student@campus.ai',
      password: 'Password@123',
      role: 'student',
      department: cse._id,
      studentId: 'CSE-2026-001',
      phone: '9876501234',
      semester: 6,
      year: 3,
      status: 'approved',
      approvalStatus: 'approved',
      isActive: true
    }));

  await User.updateMany(
    { email: { $in: ['admin@campus.ai', 'faculty@campus.ai', 'student@campus.ai'] } },
    { status: 'approved', approvalStatus: 'approved', isActive: true }
  );

  await ensureDefaultSubjects();
  const subjects = await Subject.find({ code: { $in: defaultSubjects.map((subject) => subject.code) } }).sort('name');

  await Promise.all(
    subjects.map((subject, index) =>
      ClassRoom.findOneAndUpdate(
        { code: `CSE-${subject.code}-601` },
        {
          name: `CSE VI - ${subject.name}`,
          code: `CSE-${subject.code}-601`,
          subject: subject.name,
          semester: 6,
          department: cse._id,
          faculty: faculty._id,
          students: [student._id],
          schedule: [{ day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][index % 5], startTime: '10:00', endTime: '11:00' }],
          qrSecret: `demo-secret-${subject.code}`
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
    )
  );

  if ((await Attendance.countDocuments({ student: student._id })) === 0) {
    const classes = await ClassRoom.find({ students: student._id }).limit(5);
    await Promise.all(
      classes.map((classRoom, index) =>
        Attendance.create({
          student: student._id,
          studentId: student.studentId || String(student._id),
          studentName: student.name,
          classRoom: classRoom._id,
          subject: classRoom.subject,
          subjectName: classRoom.subject,
          subjectId: subjects.find((subject) => subject.name === classRoom.subject)?._id,
          date: startOfDay(new Date(Date.now() - (index + 1) * 86400000)),
          time: '10:00:00',
          status: index === 3 ? 'absent' : 'present',
          method: index % 2 === 0 ? 'manual' : 'qr',
          confidence: index % 2 === 0 ? 1 : 0.96,
          markedBy: faculty._id
        })
      )
    );
  }

  console.log(`Demo accounts ready. Admin: ${admin.email}, Faculty: ${faculty.email}, Student: ${student.email}`);
}
