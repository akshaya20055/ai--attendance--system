import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Role } from '../lib/api';

const strengthChecks = [
  { label: '8+ chars', test: (value: string) => value.length >= 8 },
  { label: 'Uppercase', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'Lowercase', test: (value: string) => /[a-z]/.test(value) },
  { label: 'Number', test: (value: string) => /[0-9]/.test(value) }
];

export function Register() {
  const [role, setRole] = useState<Role>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    rollNumber: '',
    employeeId: '',
    department: 'CSE',
    year: '1',
    phone: '',
    adminCode: ''
  });

  const score = useMemo(() => strengthChecks.filter((item) => item.test(form.password)).length, [form.password]);

  function update(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (score < 4) {
      setError('Use a stronger password with uppercase, lowercase, number, and at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        department: form.department,
        phone: form.phone,
        year: Number(form.year),
        rollNumber: form.rollNumber,
        employeeId: form.employeeId,
        adminCode: form.adminCode
      };
      const res = await api.post(`/auth/${role}/register`, payload);
      setMessage(res.data.message || 'Registration submitted successfully.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.issues?.formErrors?.[0] || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <form onSubmit={submit} className="glass w-full max-w-2xl rounded-lg p-6">
        <div className="mb-6 grid h-12 w-12 place-items-center rounded-lg bg-ink text-white dark:bg-mint dark:text-slate-950">
          <UserPlus />
        </div>
        <h1 className="text-3xl font-black">Create account</h1>
        <p className="mt-2 text-sm text-slate-500">Student and faculty accounts require admin approval before login.</p>
        <div className="my-5 grid grid-cols-3 rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
          {(['student', 'faculty', 'admin'] as Role[]).map((item) => (
            <button key={item} type="button" onClick={() => setRole(item)} className={`rounded-md py-2 text-sm font-bold capitalize ${role === item ? 'bg-white shadow dark:bg-slate-800' : 'text-slate-500'}`}>
              {item}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="input" placeholder="Full name" value={form.name} onChange={(event) => update('name', event.target.value)} required />
          <input className="input" placeholder="Email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required />
          <span className="relative block">
            <input className="input pr-11" placeholder="Password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => update('password', event.target.value)} required />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
          <input className="input" placeholder="Confirm password" type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} required />
          <input className="input" placeholder="Department" value={form.department} onChange={(event) => update('department', event.target.value)} />
          <input className="input" placeholder="Phone number" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
          {role === 'student' && (
            <>
              <input className="input" placeholder="Roll number" value={form.rollNumber} onChange={(event) => update('rollNumber', event.target.value)} required />
              <input className="input" placeholder="Year" type="number" min="1" max="6" value={form.year} onChange={(event) => update('year', event.target.value)} />
            </>
          )}
          {role === 'faculty' && <input className="input" placeholder="Employee ID" value={form.employeeId} onChange={(event) => update('employeeId', event.target.value)} required />}
          {role === 'admin' && <input className="input" placeholder="Secret admin code" value={form.adminCode} onChange={(event) => update('adminCode', event.target.value)} required />}
        </div>
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full bg-mint transition-all" style={{ width: `${(score / 4) * 100}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
            {strengthChecks.map((item) => <span key={item.label} className={item.test(form.password) ? 'text-teal-700 dark:text-mint' : ''}>{item.label}</span>)}
          </div>
        </div>
        {error && <p className="mt-4 rounded-lg bg-coral/10 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
        {message && <p className="mt-4 rounded-lg bg-mint/10 px-3 py-2 text-sm font-semibold text-teal-700">{message}</p>}
        <button className="btn-primary mt-5 w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" size={17} />} Register
        </button>
        <Link className="mt-4 block text-center text-sm font-semibold text-teal-700 dark:text-mint" to="/login">Back to login</Link>
      </form>
    </main>
  );
}
