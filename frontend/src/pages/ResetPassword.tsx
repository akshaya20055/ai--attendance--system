import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';

export function ResetPassword() {
  const { token } = useParams();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(`/auth/reset-password/${token}`, { password });
      setMessage(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-lg p-6">
        <h1 className="text-3xl font-black">Create new password</h1>
        <div className="relative my-4">
          <input className="input pr-11" type={show ? 'text' : 'password'} placeholder="New password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" onClick={() => setShow((value) => !value)}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <input className="input mb-4" type={show ? 'text' : 'password'} placeholder="Confirm password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        {error && <p className="mb-3 rounded-lg bg-coral/10 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
        {message && <p className="mb-3 rounded-lg bg-mint/10 px-3 py-2 text-sm font-semibold text-teal-700">{message}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" size={17} />} Update password</button>
        <Link className="mt-4 block text-center text-sm font-semibold" to="/login">Back to login</Link>
      </form>
    </main>
  );
}
