import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Flame,
  LineChart as LineChartIcon,
  Moon,
  QrCode,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Upload,
  UserRound,
  XCircle
} from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import * as XLSX from 'xlsx';
import { StatCard } from '../components/StatCard';
import { api, type AttendanceRecord } from '../lib/api';
import { useAuth } from '../state/AuthContext';

type SubjectSummary = {
  subject: string;
  total: number;
  present: number;
  late?: number;
  percentage: number;
};

type Summary = {
  subjectWise: SubjectSummary[];
  overallPercentage: number;
  prediction: 'stable' | 'improving' | 'at-risk' | string;
};

const fallbackSubjects: SubjectSummary[] = [
  { subject: 'Machine Learning', total: 28, present: 24, late: 1, percentage: 89.3 },
  { subject: 'Cloud Systems', total: 26, present: 20, late: 1, percentage: 80.8 },
  { subject: 'Data Mining', total: 25, present: 23, late: 0, percentage: 92 },
  { subject: 'Computer Vision', total: 24, present: 17, late: 1, percentage: 75 }
];

const fallbackRecords: AttendanceRecord[] = fallbackSubjects.flatMap((subject, subjectIndex) =>
  Array.from({ length: 6 }, (_, index) => {
    const day = String(4 + index * 4 + subjectIndex).padStart(2, '0');
    const absent = index === subjectIndex % 5;
    const method = index % 2 === 0 ? 'face' : 'qr';
    return {
      _id: `${subject.subject}-${index}`,
      student: { name: 'Student', email: 'student@example.com', role: 'student' },
      classRoom: {
        _id: `${subject.subject}-room`,
        name: `${subject.subject} Lab`,
        code: subject.subject.slice(0, 3).toUpperCase(),
        subject: subject.subject,
        semester: 5,
        students: []
      },
      subject: subject.subject,
      date: `2026-05-${day}T09:00:00.000Z`,
      status: absent ? 'absent' : 'present',
      method,
      confidence: method === 'face' ? 94 - index : undefined
    };
  })
);

const timetable = [
  { day: 'Mon', time: '09:00', subject: 'Machine Learning', room: 'AI Lab 1' },
  { day: 'Tue', time: '11:00', subject: 'Cloud Systems', room: 'Room 204' },
  { day: 'Wed', time: '10:00', subject: 'Data Mining', room: 'Analytics Lab' },
  { day: 'Thu', time: '13:30', subject: 'Computer Vision', room: 'Vision Studio' },
  { day: 'Fri', time: '12:00', subject: 'Project Review', room: 'Seminar Hall' }
];

const assignments = [
  { title: 'CNN attendance model notes', subject: 'Computer Vision', due: 'Jun 03', status: 'In progress' },
  { title: 'Cloud deployment worksheet', subject: 'Cloud Systems', due: 'Jun 06', status: 'Pending' },
  { title: 'Association rules lab', subject: 'Data Mining', due: 'Jun 09', status: 'Submitted' }
];

const exams = [
  { subject: 'Machine Learning', date: 'Jun 14', type: 'Midterm' },
  { subject: 'Cloud Systems', date: 'Jun 18', type: 'Practical' },
  { subject: 'Data Mining', date: 'Jun 22', type: 'Theory' }
];

function percent(value: number) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
}

function formatDate(input: string) {
  return new Date(input).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildMonthlyData(records: AttendanceRecord[]) {
  const buckets = new Map<string, { month: string; total: number; present: number }>();
  records.forEach((record) => {
    const date = new Date(record.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const month = date.toLocaleDateString(undefined, { month: 'short' });
    const bucket = buckets.get(key) || { month, total: 0, present: 0 };
    bucket.total += 1;
    if (record.status === 'present' || record.status === 'late') bucket.present += 1;
    buckets.set(key, bucket);
  });
  return Array.from(buckets.values()).map((item) => ({
    month: item.month,
    percentage: percent((item.present / item.total) * 100),
    total: item.total
  }));
}

function CalendarGrid({ records }: { records: AttendanceRecord[] }) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const offset = monthStart.getDay();
  const byDate = new Map(records.map((record) => [new Date(record.date).getDate(), record]));
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];

  return (
    <div className="grid grid-cols-7 gap-1 text-center text-xs">
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
        <div key={`${day}-${index}`} className="py-1 font-black text-slate-500">{day}</div>
      ))}
      {cells.map((day, index) => {
        const record = day ? byDate.get(day) : undefined;
        const tone = record?.status === 'present' || record?.status === 'late'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200'
          : record?.status === 'absent'
            ? 'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200'
            : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400';
        return (
          <div key={`${day}-${index}`} className={`grid aspect-square min-h-9 place-items-center rounded-lg ${day ? tone : 'bg-transparent'}`}>
            {day || ''}
          </div>
        );
      })}
    </div>
  );
}

export function StudentDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary>({ subjectWise: [], overallPercentage: 0, prediction: 'stable' });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [photo, setPhoto] = useState('');
  const [goal, setGoal] = useState(85);

  useEffect(() => {
    const key = `student-photo-${user?.id || user?._id || user?.email || 'me'}`;
    setPhoto(localStorage.getItem(key) || '');
  }, [user?.id, user?._id, user?.email]);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        const [summaryRes, recordsRes] = await Promise.all([
          api.get('/attendance/summary/me'),
          api.get('/attendance')
        ]);
        if (!cancelled) {
          setSummary(summaryRes.data);
          setRecords(recordsRes.data.records || []);
          setLastUpdated(new Date());
        }
      } catch {
        if (!cancelled) setLastUpdated(new Date());
      }
    }
    loadDashboard();
    const timer = window.setInterval(loadDashboard, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const subjectRows = summary.subjectWise || [];
  const attendanceRecords = records || [];

  const metrics = useMemo(() => {
    const total = subjectRows.reduce((sum, item) => sum + item.total, 0);
    const present = subjectRows.reduce((sum, item) => sum + item.present + (item.late || 0), 0);
    const absent = Math.max(total - present, 0);
    const lowSubjects = subjectRows.filter((item) => item.percentage < 75);
    const classesNeeded = goal > summary.overallPercentage
      ? Math.ceil(((goal / 100) * total - present) / (1 - goal / 100))
      : 0;
    return {
      total,
      present,
      absent,
      leave: 0,
      overall: summary.overallPercentage || percent((present / total) * 100),
      lowSubjects,
      classesNeeded: Math.max(classesNeeded, 0)
    };
  }, [goal, subjectRows, summary.overallPercentage]);

  const monthlyData = useMemo(() => {
    return buildMonthlyData(attendanceRecords);
  }, [attendanceRecords]);

  const methodData = useMemo(() => [
    { name: 'QR', value: attendanceRecords.filter((record) => record.method === 'qr').length },
    { name: 'Face', value: attendanceRecords.filter((record) => record.method === 'face' || record.method === 'webcam').length },
    { name: 'Manual', value: attendanceRecords.filter((record) => record.method === 'manual').length }
  ].filter((item) => item.value > 0), [attendanceRecords]);

  const badges = [
    { label: 'Consistency Star', active: metrics.overall >= 85 },
    { label: 'Face Check Pro', active: attendanceRecords.some((record) => record.method === 'face' || record.method === 'webcam') },
    { label: 'QR Regular', active: attendanceRecords.filter((record) => record.method === 'qr').length >= 3 },
    { label: 'Goal Chaser', active: goal <= metrics.overall }
  ];

  const notifications = subjectRows.length > 0 ? [
    metrics.lowSubjects.length
      ? `${metrics.lowSubjects.length} subject needs attention below 75%.`
      : 'All subjects are above the low-attendance threshold.',
    metrics.classesNeeded
      ? `Attend the next ${metrics.classesNeeded} classes to reach ${goal}%.`
      : `Attendance goal of ${goal}% is currently on track.`,
    lastUpdated ? `Real-time sync checked at ${lastUpdated.toLocaleTimeString()}.` : 'Real-time sync is starting.'
  ] : [
    'No low attendance alerts.',
    `Set your attendance goal (currently ${goal}%) and start marking attendance.`,
    lastUpdated ? `Real-time sync checked at ${lastUpdated.toLocaleTimeString()}.` : 'Real-time sync is starting.'
  ];

  const insights = subjectRows.length > 0 ? [
    summary.prediction === 'at-risk'
      ? 'AI insight: recent attendance is trending downward. Prioritize the next two scheduled classes.'
      : summary.prediction === 'improving'
        ? 'AI insight: attendance is improving. Keep the current rhythm for the rest of the semester.'
        : 'AI insight: attendance is stable. Small gains in low subjects will improve the semester average.',
    metrics.lowSubjects[0]
      ? `${metrics.lowSubjects[0].subject} has the lowest score at ${metrics.lowSubjects[0].percentage}%.`
      : 'No critical subject gaps detected.',
    `Prediction: ${metrics.classesNeeded ? `${metrics.classesNeeded} consecutive presents needed for goal recovery.` : 'goal can be maintained with regular attendance.'}`
  ] : [
    'AI insight: No attendance history available to calculate trends.',
    'Start marking attendance via face recognition or QR codes.',
    'Prediction will be calculated after your first class.'
  ];

  function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      const key = `student-photo-${user?.id || user?._id || user?.email || 'me'}`;
      localStorage.setItem(key, value);
      setPhoto(value);
    };
    reader.readAsDataURL(file);
  }

  function setTheme(mode: 'light' | 'dark') {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    localStorage.setItem('theme', mode);
  }

  function exportPdf() {
    const doc = new jsPDF();
    doc.text(`${user?.name || 'Student'} Attendance Report`, 14, 16);
    doc.text(`Overall: ${metrics.overall}% | Present: ${metrics.present} | Absent: ${metrics.absent} | Leave: ${metrics.leave}`, 14, 25);
    autoTable(doc, {
      startY: 34,
      head: [['Subject', 'Total', 'Present', 'Absent', 'Attendance %']],
      body: subjectRows.map((row) => [
        row.subject,
        row.total,
        row.present + (row.late || 0),
        Math.max(row.total - row.present - (row.late || 0), 0),
        `${row.percentage}%`
      ])
    });
    doc.save('student-attendance-report.pdf');
  }

  function exportExcel() {
    const subjectSheet = XLSX.utils.json_to_sheet(subjectRows.map((row) => ({
      Subject: row.subject,
      Total: row.total,
      Present: row.present + (row.late || 0),
      Absent: Math.max(row.total - row.present - (row.late || 0), 0),
      Attendance: `${row.percentage}%`
    })));
    const recordSheet = XLSX.utils.json_to_sheet(attendanceRecords.map((record) => ({
      Subject: record.subject,
      Date: formatDate(record.date),
      Status: record.status,
      Method: record.method,
      Confidence: record.confidence || ''
    })));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, subjectSheet, 'Subject Attendance');
    XLSX.utils.book_append_sheet(book, recordSheet, 'History');
    XLSX.writeFile(book, 'student-attendance-report.xlsx');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-black">Student Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">Attendance overview, reports, predictions, profile, timetable, and academic planning.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-soft" onClick={() => setTheme('light')}><Sun size={17} /> Light</button>
          <button className="btn-soft" onClick={() => setTheme('dark')}><Moon size={17} /> Dark</button>
          <button className="btn-soft" onClick={exportExcel}><FileSpreadsheet size={17} /> Excel</button>
          <button className="btn-primary" onClick={exportPdf}><Download size={17} /> PDF</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Attendance %" value={`${metrics.overall}%`} icon={CalendarCheck} accent="bg-mint/20 text-teal-700" />
        <StatCard title="Present Count" value={metrics.present} icon={CheckCircle2} accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15" />
        <StatCard title="Absent Count" value={metrics.absent} icon={XCircle} accent="bg-coral/15 text-rose-600" />
        <StatCard title="Leave Count" value={metrics.leave} icon={Clock} accent="bg-gold/20 text-amber-700" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Attendance Overview</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Semester performance analytics and goal progress.</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold dark:bg-white/5">
              <Target size={17} />
              <input
                className="w-16 bg-transparent font-black outline-none"
                type="number"
                min="60"
                max="100"
                value={goal}
                onChange={(event) => setGoal(Number(event.target.value))}
                aria-label="Attendance goal"
              />
              <span>% goal</span>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="grid place-items-center">
              <div className="relative grid h-48 w-48 place-items-center rounded-full bg-slate-100 dark:bg-white/5">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: `conic-gradient(#2dd4bf ${metrics.overall * 3.6}deg, rgba(148,163,184,.25) 0deg)` }}
                />
                <div className="relative grid h-36 w-36 place-items-center rounded-full bg-white text-center dark:bg-slate-950">
                  <span className="text-4xl font-black">{metrics.overall}%</span>
                  <span className="text-xs font-bold uppercase text-slate-500">overall</span>
                </div>
              </div>
            </div>
            {subjectRows.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={subjectRows}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
                    {subjectRows.map((row) => <Cell key={row.subject} fill={row.percentage < 75 ? '#fb7185' : '#2dd4bf'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[240px] flex-col items-center justify-center text-slate-400">
                <AlertTriangle size={36} className="mb-2 text-slate-500" />
                <p className="text-sm font-bold">No Subject Data Available</p>
                <p className="text-xs text-slate-500">Your subject-wise attendance breakdown will appear here.</p>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <h2 className="mb-4 text-xl font-black">Student Profile</h2>
          <div className="flex items-center gap-4">
            <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
              {photo ? <img src={photo} alt={user?.name || 'Student'} className="h-full w-full object-cover" /> : <UserRound size={38} className="text-slate-400" />}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-black">{user?.name || 'Student'}</h3>
              <p className="truncate text-sm text-slate-500">{user?.email}</p>
              <p className="mt-2 text-sm font-semibold">Semester {user?.semester || 5} | Year {user?.year || 3}</p>
            </div>
          </div>
          <label className="btn-soft mt-4 w-full cursor-pointer">
            <Upload size={17} /> Profile Photo Upload
            <input className="hidden" type="file" accept="image/*" onChange={uploadPhoto} />
          </label>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card h-80">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="text-teal-700 dark:text-mint" size={20} />
            <h2 className="text-xl font-black">Monthly Attendance Charts</h2>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="percentage" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.18} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[75%] flex-col items-center justify-center text-slate-400">
              <BarChart3 size={36} className="mb-2 text-slate-500" />
              <p className="text-sm font-bold">No Monthly Data Available</p>
              <p className="text-xs text-slate-500">Your monthly charts will appear here.</p>
            </div>
          )}
        </section>

        <section className="card h-80">
          <div className="mb-4 flex items-center gap-2">
            <LineChartIcon className="text-rose-600" size={20} />
            <h2 className="text-xl font-black">Attendance Trends</h2>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="percentage" stroke="#fb7185" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[75%] flex-col items-center justify-center text-slate-400">
              <LineChartIcon size={36} className="mb-2 text-slate-500" />
              <p className="text-sm font-bold">No Attendance Trends</p>
              <p className="text-xs text-slate-500">Attendance trend analytics will appear here.</p>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="card">
          <div className="mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-teal-700 dark:text-mint" />
            <h2 className="text-xl font-black">Attendance Calendar</h2>
          </div>
          <CalendarGrid records={attendanceRecords} />
        </section>

        <section className="card">
          <h2 className="mb-4 text-xl font-black">Subject-wise Attendance</h2>
          <div className="space-y-3">
            {subjectRows.length > 0 ? (
              subjectRows.map((row) => (
                <div key={row.subject}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold">{row.subject}</span>
                    <span className={row.percentage < 75 ? 'font-black text-rose-600' : 'font-black text-teal-700 dark:text-mint'}>{row.percentage}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div className={`h-full rounded-full ${row.percentage < 75 ? 'bg-coral' : 'bg-mint'}`} style={{ width: `${Math.min(row.percentage, 100)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm text-center py-6 font-semibold">No subject-wise attendance recorded yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="card">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-amber-600" />
            <h2 className="text-xl font-black">AI Attendance Insights</h2>
          </div>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {insights.map((item) => <p key={item} className="rounded-lg bg-white/70 p-3 dark:bg-white/5">{item}</p>)}
          </div>
        </section>

        <section className="card">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-teal-700 dark:text-mint" />
            <h2 className="text-xl font-black">Attendance Prediction</h2>
          </div>
          <p className="text-4xl font-black capitalize">{summary.prediction || 'stable'}</p>
          <p className="mt-2 text-sm text-slate-500">Goal tracker predicts {metrics.classesNeeded ? `${metrics.classesNeeded} perfect classes to recover.` : 'you are meeting the current target.'}</p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
            <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min((metrics.overall / goal) * 100, 100)}%` }} />
          </div>
        </section>

        <section className="card">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-rose-600" />
            <h2 className="text-xl font-black">Low Attendance Alerts</h2>
          </div>
          {metrics.lowSubjects.length ? (
            <div className="space-y-2">
              {metrics.lowSubjects.map((subject) => (
                <p key={subject.subject} className="rounded-lg bg-coral/10 p-3 text-sm font-semibold text-rose-700 dark:text-rose-200">
                  {subject.subject}: {subject.percentage}% attendance
                </p>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-mint/10 p-3 text-sm font-semibold text-teal-700 dark:text-mint">No low attendance alerts.</p>
          )}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="card">
          <div className="mb-4 flex items-center gap-2">
            <Bell size={20} className="text-teal-700 dark:text-mint" />
            <h2 className="text-xl font-black">Notifications</h2>
          </div>
          <div className="space-y-3">
            {notifications.map((item) => <p key={item} className="rounded-lg bg-white/70 p-3 text-sm dark:bg-white/5">{item}</p>)}
          </div>
        </section>

        <section className="card">
          <h2 className="mb-4 text-xl font-black">Upcoming Classes</h2>
          <div className="space-y-3">
            {timetable.slice(0, 3).map((item) => (
              <div key={`${item.day}-${item.subject}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 p-3 text-sm dark:bg-white/5">
                <span className="font-bold">{item.subject}</span>
                <span className="text-slate-500">{item.day} {item.time}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="mb-4 text-xl font-black">Achievement Badges</h2>
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge) => (
              <div key={badge.label} className={`rounded-lg p-3 text-sm font-black ${badge.active ? 'bg-gold/20 text-amber-700 dark:text-amber-200' : 'bg-slate-100 text-slate-400 dark:bg-white/5'}`}>
                <Award size={18} className="mb-2" />
                {badge.label}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 text-xl font-black">Timetable</h2>
          <div className="overflow-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-slate-500"><tr><th className="py-2">Day</th><th>Time</th><th>Subject</th><th>Room</th></tr></thead>
              <tbody>
                {timetable.map((item) => (
                  <tr key={`${item.day}-${item.time}`} className="border-t border-slate-200 dark:border-white/10">
                    <td className="py-3 font-bold">{item.day}</td>
                    <td>{item.time}</td>
                    <td>{item.subject}</td>
                    <td>{item.room}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-4 text-xl font-black">Assignment Tracker</h2>
          <div className="space-y-3">
            {assignments.map((item) => (
              <div key={item.title} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black">{item.title}</span>
                  <span className="text-slate-500">{item.due}</span>
                </div>
                <p className="mt-1 text-slate-500">{item.subject} | {item.status}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="card">
          <h2 className="mb-4 text-xl font-black">Exam Schedule</h2>
          <div className="space-y-3">
            {exams.map((exam) => (
              <div key={exam.subject} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 p-3 text-sm dark:bg-white/5">
                <span className="font-bold">{exam.subject}</span>
                <span>{exam.type} | {exam.date}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="mb-4 flex items-center gap-2">
            <QrCode size={20} className="text-teal-700 dark:text-mint" />
            <h2 className="text-xl font-black">QR Attendance History</h2>
          </div>
          <div className="space-y-2">
            {attendanceRecords.filter((record) => record.method === 'qr').length > 0 ? (
              attendanceRecords.filter((record) => record.method === 'qr').slice(0, 5).map((record) => (
                <p key={record._id} className="rounded-lg bg-white/70 p-3 text-sm dark:bg-white/5">{record.subject} | {formatDate(record.date)} | {record.status}</p>
              ))
            ) : (
              <p className="text-slate-500 text-sm text-center py-4 font-semibold">No QR records found.</p>
            )}
          </div>
        </section>

        <section className="card">
          <div className="mb-4 flex items-center gap-2">
            <Camera size={20} className="text-rose-600" />
            <h2 className="text-xl font-black">Face Attendance History</h2>
          </div>
          <div className="space-y-2">
            {attendanceRecords.filter((record) => record.method === 'face' || record.method === 'webcam').length > 0 ? (
              attendanceRecords.filter((record) => record.method === 'face' || record.method === 'webcam').slice(0, 5).map((record) => (
                <p key={record._id} className="rounded-lg bg-white/70 p-3 text-sm dark:bg-white/5">{record.subject} | {formatDate(record.date)} | {record.confidence || 0}%</p>
              ))
            ) : (
              <p className="text-slate-500 text-sm text-center py-4 font-semibold">No face recognition records found.</p>
            )}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Semester Performance Analytics</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Attendance method mix and full history used by the dashboard.</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Flame size={17} /> Real-time updates every 15s
          </div>
        </div>
        <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
          {methodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={methodData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {methodData.map((item, index) => <Cell key={item.name} fill={['#2dd4bf', '#fb7185', '#fbbf24'][index % 3]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] flex-col items-center justify-center text-slate-400">
              <Sparkles size={36} className="mb-2 text-slate-500" />
              <p className="text-sm font-bold">No Method Mix Data</p>
              <p className="text-xs text-slate-500">Method distribution will appear here.</p>
            </div>
          )}
          <div className="overflow-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-slate-500"><tr><th className="py-2">Date</th><th>Subject</th><th>Status</th><th>Method</th><th>Confidence</th></tr></thead>
              <tbody>
                {attendanceRecords.length > 0 ? (
                  attendanceRecords.slice(0, 12).map((record) => (
                    <tr key={record._id} className="border-t border-slate-200 dark:border-white/10">
                      <td className="py-3">{formatDate(record.date)}</td>
                      <td className="font-semibold">{record.subject}</td>
                      <td className="capitalize">{record.status}</td>
                      <td className="capitalize">{record.method}</td>
                      <td>{record.confidence ? `${record.confidence}%` : '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 font-semibold">
                      No attendance history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
