import { ClipboardCheck, FileSpreadsheet, GraduationCap, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { api, type ClassRoom } from '../lib/api';

export function FacultyDashboard() {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/classes'), api.get('/attendance')])
      .then(([classRes, attendanceRes]) => {
        setClasses(classRes.data.classes);
        setRecords(attendanceRes.data.records);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Faculty Dashboard</h1>
          <p className="text-slate-500">Create classes, mark attendance, edit records, and generate reports.</p>
        </div>
        <Link to="/attendance" className="btn-primary">Mark attendance</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active Classes" value={classes.length} icon={GraduationCap} accent="bg-mint/20 text-teal-700" />
        <StatCard title="Attendance Logs" value={records.length} icon={ClipboardCheck} accent="bg-coral/15 text-rose-600" />
        <StatCard title="Students Managed" value={classes.reduce((sum, item) => sum + (item.students?.length || 0), 0)} icon={Users} accent="bg-gold/20 text-amber-700" />
        <StatCard title="Exports Ready" value="PDF/XLSX" icon={FileSpreadsheet} accent="bg-slate-200 text-slate-700 dark:bg-white/10" />
      </div>
      <div className="card">
        <h2 className="mb-4 text-lg font-black">Classes</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((item) => (
            <div key={item._id} className="rounded-lg border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-bold text-teal-700 dark:text-mint">{item.code}</p>
              <h3 className="text-lg font-black">{item.name}</h3>
              <p className="text-sm text-slate-500">{item.subject} | Semester {item.semester}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
