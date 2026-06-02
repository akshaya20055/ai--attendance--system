import { Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL, type Role } from '../lib/api';
import { useAuth } from '../state/AuthContext';

const demoEmails: Record<Role, string> = {
  student: 'student@campus.ai',
  faculty: 'faculty@campus.ai',
  admin: 'admin@campus.ai'
};

function extractApiError(err: any) {
  const data = err?.response?.data;
  if (typeof data?.message === 'string') return data.message;
  const fieldErrors = data?.issues?.fieldErrors;
  if (fieldErrors) {
    const first = Object.values(fieldErrors).flat().find(Boolean);
    if (first) return String(first);
  }
  const formError = data?.issues?.formErrors?.[0];
  if (formError) return String(formError);
  if (err?.message === 'Network Error') return `Network error while calling ${API_BASE_URL}/auth/login. Check browser console for CORS or blocked-request details.`;
  return err?.message || 'Unexpected login error. Please try again.';
}

export function Login() {
  const remembered = localStorage.getItem('remember-email') || demoEmails.student;
  const [role, setRole] = useState<Role>('student');
  const [email, setEmail] = useState(remembered);
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(Boolean(localStorage.getItem('remember-email')));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const isValid = useMemo(() => /\S+@\S+\.\S+/.test(email) && password.length >= 8, [email, password]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!isValid) {
      setError('Enter a valid email and password with at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password, role);
      if (remember) localStorage.setItem('remember-email', email);
      else localStorage.removeItem('remember-email');
      setSuccess('Login successful. Opening dashboard...');
      navigate(`/${role}`);
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-lg p-6">
        <div className="mb-6 grid h-12 w-12 place-items-center rounded-lg bg-ink text-white dark:bg-mint dark:text-slate-950">
          <LockKeyhole />
        </div>
        <h1 className="text-3xl font-black">Sign in</h1>
        <p className="mt-2 text-sm text-slate-500">Approved students, faculty, and admins can access their workspace.</p>
        <div className="my-5 grid grid-cols-3 rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
          {(['student', 'faculty', 'admin'] as Role[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setRole(item);
                setEmail(demoEmails[item]);
              }}
              className={`rounded-md py-2 text-sm font-bold capitalize ${role === item ? 'bg-white shadow dark:bg-slate-800' : 'text-slate-500'}`}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="mb-3 block text-sm font-bold">
          Email
          <input className="input mt-1" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="mb-3 block text-sm font-bold">
          Password
          <span className="relative mt-1 block">
            <input className="input pr-11" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        <div className="mb-4 flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Remember me
          </label>
          <Link className="font-semibold text-teal-700 dark:text-mint" to="/forgot-password">Forgot password?</Link>
        </div>
        {error && <p className="mb-3 rounded-lg bg-coral/10 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
        {success && <p className="mb-3 rounded-lg bg-mint/10 px-3 py-2 text-sm font-semibold text-teal-700">{success}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" size={17} />} Login
        </button>
        <Link className="mt-4 block text-center text-sm font-semibold text-teal-700 dark:text-mint" to="/register">Create a new account</Link>
      </form>
    </main>
  );
}
