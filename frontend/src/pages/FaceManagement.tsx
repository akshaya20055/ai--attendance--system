import { AlertCircle, Calendar, CheckCircle2, GraduationCap, RefreshCw, Search, Trash2, UserCheck, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, type User } from '../lib/api';

function departmentName(student: User) {
  if (!student.department) return 'General';
  return typeof student.department === 'string' ? student.department : `${student.department.name} (${student.department.code})`;
}

export function FaceManagement() {
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function loadStudents() {
    setLoading(true);
    setNotice(null);
    try {
      const res = await api.get('/users?role=student');
      setStudents(res.data.users || []);
    } catch {
      setNotice({ type: 'error', text: 'Failed to load students list.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  async function deleteFace(studentId: string) {
    setActionLoading(true);
    setNotice(null);
    try {
      await api.delete(`/face/enrollment/${studentId}`);
      setNotice({ type: 'success', text: 'Face enrollment deleted successfully.' });
      setConfirmDeleteId(null);
      await loadStudents();
    } catch (error: any) {
      setNotice({
        type: 'error',
        text: error.response?.data?.message || 'Failed to delete face enrollment.'
      });
    } finally {
      setActionLoading(false);
    }
  }

  const departments = Array.from(
    new Set(
      students.map((student) => {
        if (!student.department) return '';
        return typeof student.department === 'string' ? student.department : student.department.code;
      }).filter(Boolean)
    )
  );

  const filteredStudents = students.filter((student) => {
    const term = search.toLowerCase();
    const nameMatch = student.name.toLowerCase().includes(term);
    const rollMatch = student.studentId?.toLowerCase().includes(term) || false;
    const emailMatch = student.email.toLowerCase().includes(term);
    const matchesSearch = nameMatch || rollMatch || emailMatch;

    const studentDept = !student.department
      ? ''
      : typeof student.department === 'string'
        ? student.department
        : student.department.code;
    const matchesDept = deptFilter === 'all' || studentDept === deptFilter;

    const hasEnrollment = Boolean(student.faceImages?.length || student.faceEmbeddings?.length);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'enrolled' && hasEnrollment) ||
      (statusFilter === 'not-enrolled' && !hasEnrollment);

    return matchesSearch && matchesDept && matchesStatus;
  });

  const enrolledCount = students.filter((student) => Boolean(student.faceImages?.length)).length;
  const pendingCount = students.length - enrolledCount;
  const enrollmentRate = students.length ? Math.round((enrolledCount / students.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Admin Face Management</h1>
          <p className="text-slate-500">Monitor enrollment status, preview face samples, and reset enrollments.</p>
        </div>
        <button className="btn-soft" onClick={loadStudents} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : ''} size={17} /> Refresh
        </button>
      </div>

      {notice && (
        <div className={`rounded-lg px-4 py-3 text-sm font-bold flex items-center gap-2 ${notice.type === 'success' ? 'bg-mint/10 text-teal-700' : 'bg-coral/10 text-rose-700'}`}>
          <AlertCircle size={17} />
          {notice.text}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-4">
          <div className="rounded-lg bg-mint/20 p-3 text-teal-700">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-sm uppercase text-slate-500">Enrolled Students</p>
            <p className="text-3xl font-black">{enrolledCount} <span className="text-sm font-semibold text-slate-400">/ {students.length}</span></p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="rounded-lg bg-gold/15 p-3 text-amber-700">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-sm uppercase text-slate-500">Pending Enrollment</p>
            <p className="text-3xl font-black">{pendingCount}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="rounded-lg bg-emerald-100 dark:bg-emerald-400/15 p-3 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm uppercase text-slate-500">Completion Rate</p>
            <p className="text-3xl font-black">{enrollmentRate}%</p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="card grid gap-4 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="input pl-10"
            placeholder="Search by student name, email, or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="input" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="all">All Departments</option>
          {departments.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>

        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Enrollment Statuses</option>
          <option value="enrolled">Enrolled</option>
          <option value="not-enrolled">Not Enrolled</option>
        </select>
      </div>

      {/* Student Face Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredStudents.map((student) => {
          const id = student._id || student.id || '';
          const hasFace = Boolean(student.faceImages?.length);
          const previewImage = hasFace ? student.faceImages?.[0] : null;

          return (
            <div key={id} className="card flex flex-col justify-between overflow-hidden border border-slate-200 dark:border-white/10">
              <div className="space-y-4">
                {/* Face Preview Frame */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-900 flex items-center justify-center">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={student.name}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <XCircle className="mx-auto mb-2 text-slate-600" size={36} />
                      <p className="text-xs font-bold uppercase text-slate-500">No Face Enrolled</p>
                    </div>
                  )}
                  <span className={`absolute right-3 top-3 rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider ${hasFace ? 'bg-mint text-teal-800' : 'bg-slate-800 text-slate-400'}`}>
                    {hasFace ? 'Enrolled' : 'Pending'}
                  </span>
                </div>

                {/* Details */}
                <div>
                  <h3 className="text-lg font-black truncate" title={student.name}>{student.name}</h3>
                  <p className="text-xs text-slate-400 font-semibold truncate">{student.email}</p>
                  
                  <div className="mt-3 space-y-1.5 text-sm">
                    <p className="flex justify-between">
                      <span className="text-slate-500">Roll No:</span>
                      <span className="font-bold">{student.studentId || 'N/A'}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Dept:</span>
                      <span className="font-bold truncate max-w-[150px]">{departmentName(student)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Year / Sem:</span>
                      <span className="font-bold">Year {student.year || 'N/A'} / Sem {student.semester || 'N/A'}</span>
                    </p>
                    {hasFace && student.updatedAt && (
                      <p className="flex justify-between text-xs text-slate-500 mt-2 border-t border-slate-200 dark:border-white/5 pt-2">
                        <span className="flex items-center gap-1"><Calendar size={12} /> Enrolled:</span>
                        <span>{new Date(student.updatedAt).toLocaleDateString()}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-3 border-t border-slate-200 dark:border-white/5">
                {confirmDeleteId === id ? (
                  <div className="flex gap-2">
                    <button
                      className="btn-primary flex-1 !bg-rose-600 hover:!bg-rose-700 text-xs py-2"
                      onClick={() => deleteFace(id)}
                      disabled={actionLoading}
                    >
                      Confirm
                    </button>
                    <button
                      className="btn-soft flex-1 text-xs py-2"
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={actionLoading}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-soft w-full flex items-center justify-center gap-2 !text-rose-600 hover:!bg-rose-500/10"
                    disabled={!hasFace || loading}
                    onClick={() => setConfirmDeleteId(id)}
                  >
                    <Trash2 size={15} /> Delete Enrollment
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {!filteredStudents.length && (
          <div className="col-span-full card py-12 text-center text-slate-500">
            No students found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}
