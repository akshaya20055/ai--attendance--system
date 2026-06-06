import { CheckCircle2, Clock, ClipboardList, GraduationCap, LibraryBig, Moon, ScanFace, ShieldX, Sun, Users, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { api } from '../lib/api';

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<any>({ totals: {}, methodBreakdown: [] });
  const [stats, setStats] = useState<any>({});
  const [todayRecords, setTodayRecords] = useState<any[]>([]);

  useEffect(() => {
    function loadAdminData() {
      api.get('/analytics').then((res) => setAnalytics(res.data)).catch(() => undefined);
      api.get('/admin/all-users').then((res) => setStats(res.data.stats)).catch(() => undefined);
      api.get('/attendance').then((res) => {
        const records = res.data.records || [];
        const todayStr = new Date().toLocaleDateString();
        const filtered = records.filter((record: any) => {
          const isPresent = record.status === 'present' || record.status === 'late';
          const isToday = new Date(record.date).toLocaleDateString() === todayStr;
          return isPresent && isToday;
        });
        setTodayRecords(filtered);
      }).catch((error) => console.error('[AdminDashboard] Live feed fetch failed', error));
    }

    loadAdminData();
    const timer = setInterval(loadAdminData, 15000);
    return () => clearInterval(timer);
  }, []);

  const totals = analytics.totals || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Admin Dashboard</h1>
        <p className="text-slate-500">Manage departments, faculty, students, users, and system analytics.</p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-black text-slate-700 dark:text-slate-200">System Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Students" value={stats.totalStudents ?? totals.students ?? 0} icon={GraduationCap} accent="bg-mint/20 text-teal-700" />
          <StatCard title="Total Faculty" value={stats.totalFaculty ?? totals.faculty ?? 0} icon={Users} accent="bg-coral/15 text-rose-600" />
          <StatCard title="Pending Approvals" value={stats.pendingApprovals ?? 0} icon={Clock} accent="bg-gold/20 text-amber-700" />
          <StatCard title="Total Records" value={totals.attendance ?? 0} icon={ClipboardList} accent="bg-slate-200 text-slate-700 dark:bg-white/10" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 text-lg font-black">Today's Attendance</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard title="Present Today" value={totals.presentToday ?? 0} icon={CheckCircle2} accent="bg-mint/20 text-teal-700" />
            <StatCard title="Absent Today" value={totals.absentToday ?? 0} icon={XCircle} accent="bg-coral/15 text-rose-600" />
          </div>
        </section>

        <section className="card">
          <h2 className="mb-4 text-lg font-black">Face Enrollment Statistics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard title="Enrolled Faces" value={totals.faceEnrolled ?? 0} icon={ScanFace} accent="bg-emerald-100 dark:bg-emerald-400/15 text-teal-700" />
            <StatCard title="Pending Faces" value={totals.faceNotEnrolled ?? 0} icon={ShieldX} accent="bg-gold/20 text-amber-700" />
          </div>
        </section>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-black flex items-center gap-2">
          <Clock className="text-teal-700 dark:text-mint" size={20} />
          Live Attendance Activity Feed
        </h2>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {todayRecords.length > 0 ? (
            todayRecords.map((record: any) => {
              const studentName = record.student?.name || record.studentName || 'Student';
              const dept = record.student?.department;
              const branch = dept && typeof dept === 'object'
                ? (dept as any).code || (dept as any).name || 'GEN'
                : 'GEN';
              const year = record.student?.year ? `${record.student.year} Year` : '1st Year';
              const subjectName = record.subject || record.classRoom?.subject || 'Subject';
              
              return (
                <div key={record._id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-teal-500/5 border border-teal-500/10 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{studentName}</span>{' '}
                      <span className="text-sm font-semibold opacity-85">({branch}, {year})</span> has attended today for{' '}
                      <span className="font-bold text-teal-700 dark:text-mint">{subjectName}</span>.
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {record.time || new Date(record.createdAt || record.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-slate-500 text-sm text-center py-6 font-semibold">No attendance marked today yet.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-black">Attendance Methods</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {(analytics.methodBreakdown?.length ? analytics.methodBreakdown : [{ method: 'face', count: 0 }, { method: 'qr', count: 0 }, { method: 'manual', count: 0 }, { method: 'webcam', count: 0 }]).map((item: any) => (
            <div className="rounded-lg border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5" key={item.method}>
              <p className="text-sm uppercase text-slate-500">{item.method}</p>
              <p className="text-2xl font-black">{item.count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black">Subject Management</h2>
          <p className="text-sm text-slate-500">Create and maintain subjects used in attendance dropdowns.</p>
        </div>
        <Link to="/subjects" className="btn-primary">
          <LibraryBig size={17} /> Manage Subjects
        </Link>
      </div>
    </div>
  );
}
