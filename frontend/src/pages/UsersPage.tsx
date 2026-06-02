import { Plus, UserRoundCheck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api, type Role, type User } from '../lib/api';
import { useAuth } from '../state/AuthContext';

export function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: '', email: '', role: 'student' as Role, password: 'Password@123' });

  function load() {
    api.get('/users').then((res) => setUsers(res.data.users)).catch(() => undefined);
  }

  useEffect(load, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api.post('/users', form);
    setForm({ name: '', email: '', role: 'student', password: 'Password@123' });
    load();
  }

  async function approve(id?: string) {
    if (!id) return;
    await api.patch(`/users/${id}/approve`);
    load();
  }

  async function reject(id?: string) {
    if (!id) return;
    await api.patch(`/users/${id}/reject`, { reason: 'Rejected by administrator' });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">User Management</h1>
        <p className="text-slate-500">Manage students, faculty, admins, and department assignments.</p>
      </div>
      {user?.role === 'admin' && (
        <form onSubmit={submit} className="card grid gap-3 md:grid-cols-5">
          <input className="input" placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input className="input" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <select className="input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Admin</option>
          </select>
          <input className="input" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <button className="btn-primary"><Plus size={17} /> Add user</button>
        </form>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {users.map((item) => (
          <div className="card" key={item._id || item.id}>
            <UserRoundCheck className="mb-3 text-teal-700 dark:text-mint" />
            <h2 className="text-lg font-black">{item.name}</h2>
            <p className="text-sm text-slate-500">{item.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <p className="inline-flex rounded-lg bg-slate-100 px-3 py-1 text-xs font-black uppercase dark:bg-white/10">{item.role}</p>
              <p className="inline-flex rounded-lg bg-mint/10 px-3 py-1 text-xs font-black uppercase text-teal-700">{item.approvalStatus || 'approved'}</p>
            </div>
            {user?.role === 'admin' && item.approvalStatus === 'pending' && (
              <div className="mt-4 flex gap-2">
                <button className="btn-primary" onClick={() => approve(item._id || item.id)}>Approve</button>
                <button className="btn-soft" onClick={() => reject(item._id || item.id)}>Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
