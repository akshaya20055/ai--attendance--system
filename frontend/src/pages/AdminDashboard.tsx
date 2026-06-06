import { CheckCircle2, Clock, ClipboardList, GraduationCap, LibraryBig, Moon, ScanFace, ShieldX, Sun, Users, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { api } from '../lib/api';

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<any>({ totals: {}, methodBreakdown: [] });
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    api.get('/analytics').then((res) => setAnalytics(res.data)).catch(() => undefined);
    api.get('/admin/all-users').then((res) => setStats(res.data.stats)).catch(() => undefined);
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
