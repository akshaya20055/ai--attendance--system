import { CheckCircle2, Eye, Loader2, ShieldX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, type User } from '../lib/api';

function departmentName(user: User) {
  if (!user.department) return 'Not assigned';
  return typeof user.department === 'string' ? user.department : `${user.department.name} (${user.department.code})`;
}

function statusOf(user: User) {
  return user.status || user.approvalStatus || 'pending';
}

function UserTable({
  title,
  users,
  onApprove,
  onReject,
  onView,
  loadingId
}: {
  title: string;
  users: User[];
  onApprove: (user: User) => void;
  onReject: (user: User) => void;
  onView: (user: User) => void;
  loadingId: string;
}) {
  return (
    <div className="card overflow-auto">
      <h2 className="mb-4 text-xl font-black">{title}</h2>
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="py-2">Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Registration Date</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const id = user._id || user.id || '';
            return (
              <tr key={id} className="border-t border-slate-200 dark:border-white/10">
                <td className="py-3 font-semibold">{user.name}</td>
                <td>{user.email}</td>
                <td>{departmentName(user)}</td>
                <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</td>
                <td>
                  <span className="rounded-lg bg-gold/15 px-3 py-1 text-xs font-black uppercase text-amber-700">
                    {statusOf(user)}
                  </span>
                </td>
                <td>
                  <div className="flex justify-end gap-2">
                    <button className="btn-soft" onClick={() => onView(user)} title="View details">
                      <Eye size={16} />
                    </button>
                    <button className="btn-primary" onClick={() => onApprove(user)} disabled={loadingId === id}>
                      {loadingId === id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Approve
                    </button>
                    <button className="btn-soft" onClick={() => onReject(user)} disabled={loadingId === id}>
                      <ShieldX size={16} /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {!users.length && (
            <tr>
              <td className="py-6 text-center text-slate-500" colSpan={6}>No pending users.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function UserApprovals() {
  const [pendingStudents, setPendingStudents] = useState<User[]>([]);
  const [pendingFaculty, setPendingFaculty] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [loadingId, setLoadingId] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function load() {
    const res = await api.get('/admin/pending-users');
    setPendingStudents(res.data.pendingStudents || []);
    setPendingFaculty(res.data.pendingFaculty || []);
  }

  useEffect(() => {
    load().catch(() => setNotice({ type: 'error', text: 'Could not load pending users.' }));
  }, []);

  async function decide(user: User, action: 'approve' | 'reject') {
    const id = user._id || user.id;
    if (!id) return;
    setLoadingId(id);
    setNotice(null);
    try {
      const res = await api.patch(`/admin/${action}/${id}`);
      setNotice({ type: 'success', text: res.data.message });
      await load();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.response?.data?.message || `Could not ${action} user.` });
    } finally {
      setLoadingId('');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">User Approvals</h1>
        <p className="text-slate-500">Review pending student and faculty registration requests.</p>
      </div>
      {notice && (
        <div className={`rounded-lg px-4 py-3 text-sm font-bold ${notice.type === 'success' ? 'bg-mint/10 text-teal-700' : 'bg-coral/10 text-rose-700'}`}>
          {notice.text}
        </div>
      )}
      <UserTable
        title="Pending Students"
        users={pendingStudents}
        onApprove={(user) => decide(user, 'approve')}
        onReject={(user) => decide(user, 'reject')}
        onView={setSelected}
        loadingId={loadingId}
      />
      <UserTable
        title="Pending Faculty"
        users={pendingFaculty}
        onApprove={(user) => decide(user, 'approve')}
        onReject={(user) => decide(user, 'reject')}
        onView={setSelected}
        loadingId={loadingId}
      />
      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <div className="glass w-full max-w-lg rounded-lg p-6">
            <h2 className="text-2xl font-black">{selected.name}</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <p><b>Email:</b> {selected.email}</p>
              <p><b>Role:</b> {selected.role}</p>
              <p><b>Department:</b> {departmentName(selected)}</p>
              <p><b>Status:</b> {statusOf(selected)}</p>
              <p><b>Registered:</b> {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '-'}</p>
              {selected.studentId && <p><b>Roll Number:</b> {selected.studentId}</p>}
              {selected.employeeId && <p><b>Employee ID:</b> {selected.employeeId}</p>}
              {selected.phone && <p><b>Phone:</b> {selected.phone}</p>}
            </div>
            <button className="btn-primary mt-6" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
