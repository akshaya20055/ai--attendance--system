import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../state/AuthContext';

export function ProfilePage() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await api.post('/auth/change-password', form);
      setMessage(res.data.message);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not change password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="card">
        <ShieldCheck className="mb-4 text-teal-700 dark:text-mint" />
        <h1 className="text-2xl font-black">{user?.name}</h1>
        <p className="text-sm text-slate-500">{user?.email}</p>
        <p className="mt-4 inline-flex rounded-lg bg-mint/10 px-3 py-1 text-xs font-black uppercase text-teal-700">{user?.role}</p>
      </div>
      <form onSubmit={submit} className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">Change Password</h2>
          <button type="button" className="btn-soft" onClick={() => setShow((value) => !value)}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </div>
        {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((key) => (
          <input
            key={key}
            className="input mb-3"
            type={show ? 'text' : 'password'}
            placeholder={key === 'currentPassword' ? 'Current password' : key === 'newPassword' ? 'New password' : 'Confirm new password'}
            value={form[key]}
            onChange={(event) => setForm({ ...form, [key]: event.target.value })}
          />
        ))}
        {error && <p className="mb-3 rounded-lg bg-coral/10 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
        {message && <p className="mb-3 rounded-lg bg-mint/10 px-3 py-2 text-sm font-semibold text-teal-700">{message}</p>}
        <button className="btn-primary" disabled={loading}>{loading && <Loader2 className="animate-spin" size={17} />} Update password</button>
      </form>
    </div>
  );
}
