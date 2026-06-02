import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { AttendanceChart } from '../components/AttendanceChart';
import { api, type AttendanceRecord } from '../lib/api';
import { useAuth } from '../state/AuthContext';

export function ReportsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<any>({ subjectWise: [] });

  useEffect(() => {
    async function loadReports() {
      api.get('/attendance').then((res) => setRecords(res.data.records)).catch(() => undefined);
      if (user?.role === 'student') {
        api.get('/attendance/summary/me').then((res) => setSummary(res.data)).catch(() => undefined);
      }
    }

    loadReports();
    window.addEventListener('attendance:updated', loadReports);
    return () => window.removeEventListener('attendance:updated', loadReports);
  }, [user?.role]);

  function exportPdf() {
    const doc = new jsPDF();
    doc.text('Attendance Report', 14, 16);
    autoTable(doc, {
      head: [['Student', 'Subject', 'Date', 'Status', 'Method']],
      body: records.map((row) => [row.student?.name || user?.name || '', row.subject, new Date(row.date).toLocaleDateString(), row.status, row.method])
    });
    doc.save('attendance-report.pdf');
  }

  function exportExcel() {
    const sheet = XLSX.utils.json_to_sheet(records.map((row) => ({
      Student: row.student?.name || user?.name,
      Subject: row.subject,
      Date: new Date(row.date).toLocaleDateString(),
      Status: row.status,
      Method: row.method
    })));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Attendance');
    XLSX.writeFile(book, 'attendance-report.xlsx');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Reports</h1>
          <p className="text-slate-500">Monthly reports, subject-wise analytics, PDF, and Excel downloads.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-soft" onClick={exportExcel}><Download size={17} /> Excel</button>
          <button className="btn-primary" onClick={exportPdf}><Download size={17} /> PDF</button>
        </div>
      </div>
      <AttendanceChart data={summary.subjectWise || []} />
      <div className="card overflow-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-2">Student</th><th>Subject</th><th>Date</th><th>Status</th><th>Method</th></tr></thead>
          <tbody>
            {records.map((record) => (
              <tr className="border-t border-slate-200 dark:border-white/10" key={record._id}>
                <td className="py-3 font-semibold">{record.student?.name || user?.name}</td>
                <td>{record.subject}</td>
                <td>{new Date(record.date).toLocaleDateString()}</td>
                <td className="capitalize">{record.status}</td>
                <td className="capitalize">{record.method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
