import { Attendance } from '../models/Attendance.js';
import { ClassRoom } from '../models/ClassRoom.js';
import { User } from '../models/User.js';

export async function getAttendanceSummary(studentId?: string) {
  const match = studentId ? { student: studentId } : {};
  const records = await Attendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$subject',
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } }
      }
    },
    {
      $project: {
        subject: '$_id',
        total: 1,
        present: 1,
        late: 1,
        percentage: {
          $round: [{ $multiply: [{ $divide: [{ $add: ['$present', '$late'] }, '$total'] }, 100] }, 1]
        },
        _id: 0
      }
    }
  ]);

  const totals = records.reduce(
    (acc, row) => {
      acc.total += row.total;
      acc.present += row.present + row.late;
      return acc;
    },
    { total: 0, present: 0 }
  );

  return {
    subjectWise: records,
    overallPercentage: totals.total ? Math.round((totals.present / totals.total) * 1000) / 10 : 0
  };
}

export async function getSystemAnalytics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    studentsCount,
    facultyCount,
    adminsCount,
    classesCount,
    attendanceCount,
    presentTodayStudents,
    faceEnrolledCount
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'faculty' }),
    User.countDocuments({ role: 'admin' }),
    ClassRoom.countDocuments(),
    Attendance.countDocuments(),
    Attendance.distinct('student', { date: today, status: { $in: ['present', 'late'] } }),
    User.countDocuments({ role: 'student', faceEmbeddings: { $exists: true, $not: { $size: 0 } } })
  ]);

  const presentToday = presentTodayStudents.length;
  const absentToday = Math.max(0, studentsCount - presentToday);

  const methodBreakdown = await Attendance.aggregate([
    { $group: { _id: '$method', count: { $sum: 1 } } },
    { $project: { method: '$_id', count: 1, _id: 0 } }
  ]);

  return {
    totals: {
      students: studentsCount,
      faculty: facultyCount,
      admins: adminsCount,
      classes: classesCount,
      attendance: attendanceCount,
      presentToday,
      absentToday,
      faceEnrolled: faceEnrolledCount,
      faceNotEnrolled: Math.max(0, studentsCount - faceEnrolledCount)
    },
    methodBreakdown
  };
}

export function predictAttendanceTrend(percentages: number[]) {
  if (percentages.length < 2) return 'stable';
  const first = percentages[0];
  const last = percentages[percentages.length - 1];
  if (last - first > 5) return 'improving';
  if (first - last > 5) return 'at-risk';
  return 'stable';
}
