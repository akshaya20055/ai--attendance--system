import { ArrowRight, BrainCircuit, QrCode, ScanFace } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Landing() {
  return (
    <main className="min-h-screen text-slate-950 dark:text-white">
      <section className="grid min-h-screen content-center px-5 py-12 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="animate-fadeUp">
            <p className="mb-4 inline-flex rounded-lg border border-mint/40 bg-mint/10 px-3 py-1 text-sm font-bold text-teal-700">AI-powered campus operations</p>
            <h1 className="max-w-3xl text-5xl font-black leading-tight md:text-7xl">AI Attendance Management System</h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              Face recognition, QR check-ins, manual controls, analytics, and reporting for students, faculty, and administrators.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="btn-primary" to="/login">Open portal <ArrowRight size={18} /></Link>
              <Link className="btn-soft" to="/register">Create account</Link>
            </div>
          </div>
          <div className="glass animate-float rounded-lg p-6">
            <div className="grid gap-4">
              {[
                ['Face AI', 'Duplicate-safe biometric attendance', ScanFace],
                ['QR Mode', 'Time-limited classroom QR codes', QrCode],
                ['Prediction', 'Performance and risk insights', BrainCircuit]
              ].map(([title, text, Icon]) => (
                <div key={title as string} className="rounded-lg border border-white/50 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
                  <Icon className="mb-4 text-coral" />
                  <h3 className="text-xl font-black">{title as string}</h3>
                  <p className="mt-1 text-sm text-slate-500">{text as string}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section id="features" className="mx-auto grid max-w-6xl gap-4 px-5 pb-12 md:grid-cols-3">
        {['Student analytics', 'Faculty reports', 'Admin control'].map((item) => (
          <div className="card" key={item}>
            <h2 className="text-lg font-black">{item}</h2>
            <p className="mt-2 text-sm text-slate-500">Responsive dashboards, exports, charts, and secure REST APIs.</p>
          </div>
        ))}
      </section>
    </main>
  );
}
