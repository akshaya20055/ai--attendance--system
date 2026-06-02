import { BarChart3, BookOpen, ClipboardCheck, LibraryBig, LogOut, Menu, Moon, ScanFace, Sun, UserCog, UserRound, Webcam } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

const baseNav = [
  { to: '/attendance', label: 'Attendance', icon: Webcam },
  { to: '/face-enrollment', label: 'Face Enrollment', icon: ScanFace },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/users', label: 'Users', icon: UserCog }
];

export function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const dashboard = `/${user?.role || 'student'}`;
  const nav = user?.role === 'admin'
    ? [{ to: '/approvals', label: 'User Approvals', icon: ClipboardCheck }, { to: '/subjects', label: 'Subjects', icon: LibraryBig }, ...baseNav]
    : baseNav.filter((item) => item.to !== '/users');

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 glass rounded-none border-y-0 p-5 transition md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Link to={dashboard} className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-ink text-white dark:bg-mint dark:text-slate-950">
            <BookOpen size={22} />
          </span>
          <span>
            <span className="block text-lg font-black">AI Attendance</span>
            <span className="text-xs uppercase tracking-widest text-slate-500">{user?.role} portal</span>
          </span>
        </Link>
        <nav className="mt-8 space-y-2">
          <NavLink to={dashboard} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-mint/18 text-teal-700 dark:text-mint' : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/5'}`}>
            <BarChart3 size={18} /> Dashboard
          </NavLink>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-mint/18 text-teal-700 dark:text-mint' : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/5'}`}>
              <item.icon size={18} /> {item.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} className="btn-soft absolute bottom-5 left-5 right-5">
          <LogOut size={17} /> Logout
        </button>
      </aside>

      <main className="md:pl-72">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/50 bg-white/70 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60 md:px-8">
          <button className="btn-soft md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <div>
            <p className="text-sm text-slate-500">Welcome back</p>
            <h1 className="text-xl font-black">{user?.name}</h1>
          </div>
          <button className="btn-soft" onClick={() => setDark((value) => !value)} aria-label="Toggle theme">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>
        <section className="p-4 md:p-8">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
