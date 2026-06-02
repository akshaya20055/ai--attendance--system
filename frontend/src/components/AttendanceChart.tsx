import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type DataPoint = { subject: string; percentage: number; total?: number; present?: number };

export function AttendanceChart({ data }: { data: DataPoint[] }) {
  const rows = data.length ? data : [
    { subject: 'Machine Learning', percentage: 86, total: 28, present: 24 },
    { subject: 'Cloud Systems', percentage: 78, total: 26, present: 20 },
    { subject: 'Data Mining', percentage: 92, total: 25, present: 23 }
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card h-80">
        <h2 className="mb-4 text-lg font-black">Subject Analytics</h2>
        <ResponsiveContainer width="100%" height="86%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="percentage" fill="#2dd4bf" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card h-80">
        <h2 className="mb-4 text-lg font-black">Monthly Trend</h2>
        <ResponsiveContainer width="100%" height="86%">
          <AreaChart data={rows.map((item, index) => ({ month: ['Jan', 'Feb', 'Mar', 'Apr'][index] || item.subject, value: item.percentage }))}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke="#fb7185" fill="#fb7185" fillOpacity={0.18} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
