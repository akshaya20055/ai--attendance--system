import type { LucideIcon } from 'lucide-react';

export function StatCard({
  title,
  value,
  accent,
  icon: Icon
}: {
  title: string;
  value: string | number;
  accent: string;
  icon: LucideIcon;
}) {
  return (
    <div className="card animate-fadeUp">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-black">{value}</p>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-lg ${accent}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
