import { AlertTriangle, CheckCircle2, QrCode, Save } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { WebcamAttendance } from '../components/WebcamAttendance';
import { api, type AttendanceRecord, type ClassRoom, type Subject, type User } from '../lib/api';
import { useAuth } from '../state/AuthContext';

type AttendanceSaveResult = {
  saved: boolean;
  duplicate: boolean;
  message: string;
};

export function AttendancePage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [qrPayload, setQrPayload] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [faceEnrollmentCount, setFaceEnrollmentCount] = useState<number | null>(null);

  useEffect(() => {
    api.get('/classes').then((res) => {
      setClasses(res.data.classes);
      setSelectedClass(res.data.classes[0]?._id || '');
      setStudents(res.data.classes[0]?.students || []);
    });
    api.get('/subjects').then((res) => {
      const loadedSubjects = res.data.subjects || [];
      setSubjects(loadedSubjects);
      setSelectedSubjectId((value) => loadedSubjects.some((subject: Subject) => subject._id === value) ? value : loadedSubjects[0]?._id || '');
    }).catch(() => undefined);
    api.get('/attendance').then((res) => setRecords(res.data.records)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (user?.role !== 'student') {
      setFaceEnrollmentCount(null);
      return undefined;
    }

    let mounted = true;
    async function loadFaceEnrollment() {
      try {
        const res = await api.get('/face/enrollment');
        if (!mounted) return;
        const count = Number(res.data.count || 0);
        setFaceEnrollmentCount(count);
        if (count === 0) {
          setError('No face enrollment found for this student');
        } else {
          setError('');
        }
      } catch (enrollmentError) {
        if (!mounted) return;
        const enrollmentMessage = (enrollmentError as any)?.response?.data?.message || 'Could not verify face enrollment.';
        setFaceEnrollmentCount(0);
        setError(enrollmentMessage);
      }
    }

    loadFaceEnrollment();
    const refresh = () => loadFaceEnrollment();
    window.addEventListener('face-enrollment:updated', refresh);
    return () => {
      mounted = false;
      window.removeEventListener('face-enrollment:updated', refresh);
    };
  }, [user?.id, user?._id, user?.role]);

  useEffect(() => {
    const cls = classes.find((item) => item._id === selectedClass);
    setStudents(cls?.students || []);
  }, [selectedClass, classes]);

  useEffect(() => {
    if (!classes.length || selectedClass) return;
    setSelectedClass(classes[0]._id);
    setStudents(classes[0].students || []);
  }, [classes, selectedClass]);

  useEffect(() => {
    const selectedSubject = subjects.find((subject) => subject._id === selectedSubjectId);
    if (!selectedSubject) return;
    const matchingClass = classes.find((item) => item.subject === selectedSubject.name);
    if (matchingClass && matchingClass._id !== selectedClass) {
      setSelectedClass(matchingClass._id);
    }
  }, [classes, selectedClass, selectedSubjectId, subjects]);

  async function refreshRecords() {
    const res = await api.get('/attendance');
    setRecords(res.data.records || []);
  }

  async function mark(method: 'face' | 'webcam' | 'manual' | 'qr', confidence = 0.98): Promise<AttendanceSaveResult> {
    setError('');
    setMessage('');
    const selectedSubject = subjects.find((subject) => subject._id === selectedSubjectId);
    if (!selectedSubject) {
      setError('Select a subject before marking attendance.');
      throw new Error('Subject is required');
    }
    const matchingClass = classes.find((item) => item.subject === selectedSubject.name);
    const effectiveClassId = selectedClass || matchingClass?._id || classes[0]?._id || '';
    if (effectiveClassId !== selectedClass) {
      setSelectedClass(effectiveClassId);
    }
    if (!user?.id && !user?._id) {
      setError('Logged-in student is required before marking attendance.');
      throw new Error('Logged-in student is required');
    }
    if (user?.role !== 'student' && !selectedStudent) {
      setError('Select a student before marking attendance.');
      throw new Error('Student is required');
    }
    console.debug('[Attendance] Attendance API called', { method, confidence, classRoom: effectiveClassId, subject: selectedSubject.name });
    const res = await api.post('/attendance/mark', {
      classRoom: effectiveClassId || undefined,
      student: user?.role === 'student' ? undefined : selectedStudent,
      subjectId: selectedSubject._id,
      subject: selectedSubject.name,
      method,
      status: 'present',
      confidence,
      qrPayload: method === 'qr' ? qrPayload : undefined
    });
    setRecords((items) => {
      const withoutDuplicate = items.filter((item) => item._id !== res.data.attendance._id);
      return [res.data.attendance, ...withoutDuplicate];
    });
    await refreshRecords();
    const nextMessage = res.data.duplicatePrevented
      ? 'Attendance already saved for this subject today.'
      : 'Attendance marked successfully.';
    setMessage(nextMessage);
    console.debug('[Attendance] Attendance saved', res.data.attendance);
    window.dispatchEvent(new CustomEvent('attendance:updated', { detail: res.data.attendance }));
    return {
      saved: !res.data.duplicatePrevented,
      duplicate: Boolean(res.data.duplicatePrevented),
      message: nextMessage
    };
  }

  async function loadQr() {
    if (!selectedClass) return;
    const res = await api.get(`/classes/${selectedClass}/qr`);
    setQrPayload(res.data.payload);
  }

  async function submitManual(event: FormEvent) {
    event.preventDefault();
    await mark('manual', 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Attendance</h1>
        <p className="text-slate-500">Face recognition, webcam, QR, and manual attendance in one workspace.</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <WebcamAttendance
          matchedStudentName={user?.role === 'student' ? user?.name : students.find((item) => (item._id || item.id) === selectedStudent)?.name}
          attendanceEnabled={user?.role !== 'student' || Boolean(faceEnrollmentCount)}
          disabledReason="No face enrollment found for this student. Enroll 5 face samples before marking face attendance."
          onScan={async ({ confidence, embedding }) => {
            if (user?.role === 'student' && !faceEnrollmentCount) {
              const enrollmentMessage = 'No face enrollment found for this student';
              setError(enrollmentMessage);
              throw new Error(enrollmentMessage);
            }
            let match;
            try {
              match = await api.post('/face/match', {
                embedding,
                studentId: user?.role === 'student' ? undefined : selectedStudent
              });
            } catch (scanError) {
              const scanMessage = (scanError as any)?.response?.data?.message || (scanError as Error)?.message || 'Face matching failed.';
              console.error('[FaceRecognition] Attendance matching failed', scanError);
              setError(scanMessage);
              throw new Error(scanMessage);
            }
            if (!match.data.matched) {
              const mismatchMessage = `Face did not match your saved enrollment yet. Score ${match.data.score}, required ${match.data.threshold}. Try again with your face centered.`;
              setError(mismatchMessage);
              throw new Error(mismatchMessage);
            }
            console.debug('[FaceRecognition] Face matched', match.data);
            return mark('face', confidence);
          }}
        />
        <div className="card">
          <h2 className="text-lg font-black">Manual / QR Marking</h2>
          <form onSubmit={submitManual} className="mt-4 space-y-3">
            <select className="input" value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}>
              {classes.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
            </select>
            <select className="input" value={selectedSubjectId} onChange={(event) => setSelectedSubjectId(event.target.value)}>
              <option value="">Select subject</option>
              {subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.name}</option>)}
            </select>
            {user?.role !== 'student' && (
              <select className="input" value={selectedStudent} onChange={(event) => setSelectedStudent(event.target.value)}>
                <option value="">Select student</option>
                {students.map((item) => <option key={item._id || item.id} value={item._id || item.id}>{item.name}</option>)}
              </select>
            )}
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" disabled={!selectedSubjectId || !user}><Save size={17} /> Manual present</button>
              <button type="button" className="btn-soft" onClick={loadQr}><QrCode size={17} /> Generate QR</button>
              <button type="button" className="btn-soft" onClick={() => mark('qr', 1)} disabled={!qrPayload}>Mark QR</button>
            </div>
          </form>
          {qrPayload && (
            <div className="mt-5 inline-block rounded-lg bg-white p-4">
              <QRCodeCanvas value={qrPayload} size={164} />
            </div>
          )}
          {message && <p className="mt-4 flex items-center gap-2 rounded-lg bg-mint/10 px-3 py-2 text-sm font-bold text-teal-700 dark:text-mint"><CheckCircle2 size={17} /> {message}</p>}
          {error && <p className="mt-4 flex items-center gap-2 rounded-lg bg-coral/10 px-3 py-2 text-sm font-bold text-rose-700 dark:text-rose-200"><AlertTriangle size={17} /> {error}</p>}
          {user?.role === 'student' && faceEnrollmentCount === 0 && (
            <Link to="/face-enrollment" className="btn-primary mt-3 inline-flex">
              Enroll Face Now
            </Link>
          )}
        </div>
      </div>
      <div className="card overflow-auto">
        <h2 className="mb-4 text-lg font-black">Real-time Attendance Tracking</h2>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-slate-500">
            <tr><th className="py-2">Student</th><th>Subject</th><th>Date</th><th>Status</th><th>Method</th><th>Confidence</th></tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record._id} className="border-t border-slate-200 dark:border-white/10">
                <td className="py-3 font-semibold">{record.student?.name || record.studentName || user?.name}</td>
                <td>{record.subjectName || record.subject}</td>
                <td>{new Date(record.date).toLocaleDateString()}</td>
                <td className="capitalize">{record.status}</td>
                <td className="capitalize">{record.method}</td>
                <td>{Math.round((record.confidence || 0) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
