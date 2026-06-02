import { Loader2, Mail } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-lg p-6">
        <div className="mb-5 grid h-12 w-12 place-items-center rounded-lg bg-ink text-white dark:bg-mint dark:text-slate-950">
          <Mail />
        </div>
        <h1 className="text-3xl font-black">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-500">A secure reset link will be emailed if the account exists.</p>
        <input className="input my-5" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} />
        {error && <p className="mb-3 rounded-lg bg-coral/10 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
        {message && <p className="mb-3 rounded-lg bg-mint/10 px-3 py-2 text-sm font-semibold text-teal-700">{message}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" size={17} />} Send reset link</button>
        <Link className="mt-4 block text-center text-sm font-semibold" to="/login">Back to login</Link>
      </form>
    </main>
  );
}
