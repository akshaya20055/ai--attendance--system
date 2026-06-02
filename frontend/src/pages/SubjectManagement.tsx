import { Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api, type Subject } from '../lib/api';

type SubjectForm = {
  name: string;
  code: string;
  description: string;
};

const emptyForm: SubjectForm = { name: '', code: '', description: '' };

export function SubjectManagement() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [form, setForm] = useState<SubjectForm>(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    const res = await api.get('/subjects');
    setSubjects(res.data.subjects || []);
  }

  function editSubject(subject: Subject) {
    setEditingId(subject._id);
    setForm({
      name: subject.name,
      code: subject.code,
      description: subject.description || ''
    });
    setMessage('');
    setError('');
  }

  function resetForm() {
    setEditingId('');
    setForm(emptyForm);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      if (editingId) {
        await api.patch(`/subjects/${editingId}`, form);
        setMessage('Subject updated successfully.');
      } else {
        await api.post('/subjects', form);
        setMessage('Subject added successfully.');
      }
      resetForm();
      await loadSubjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not save subject.');
    }
  }

  async function removeSubject(subject: Subject) {
    setMessage('');
    setError('');
    try {
      await api.delete(`/subjects/${subject._id}`);
      setMessage('Subject deleted successfully.');
      await loadSubjects();
      if (editingId === subject._id) resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not delete subject.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Subject Management</h1>
        <p className="text-slate-500">Add, edit, and delete subjects used by attendance forms.</p>
      </div>

      <form onSubmit={submit} className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black">{editingId ? 'Edit Subject' : 'Add Subject'}</h2>
          {editingId && (
            <button type="button" className="btn-soft" onClick={resetForm}>
              <X size={17} /> Cancel
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_180px_1.4fr_auto]">
          <input
            className="input"
            placeholder="Subject name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Code"
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
            required
          />
          <input
            className="input"
            placeholder="Description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <button className="btn-primary">
            {editingId ? <Save size={17} /> : <Plus size={17} />}
            {editingId ? 'Update' : 'Add'}
          </button>
        </div>
        {message && <p className="mt-4 rounded-lg bg-mint/10 px-3 py-2 text-sm font-bold text-teal-700 dark:text-mint">{message}</p>}
        {error && <p className="mt-4 rounded-lg bg-coral/10 px-3 py-2 text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p>}
      </form>

      <div className="card overflow-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-slate-500">
            <tr><th className="py-2">Subject</th><th>Code</th><th>Description</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject._id} className="border-t border-slate-200 dark:border-white/10">
                <td className="py-3 font-black">{subject.name}</td>
                <td>{subject.code}</td>
                <td>{subject.description || '-'}</td>
                <td>
                  <div className="flex justify-end gap-2">
                    <button className="btn-soft px-3" onClick={() => editSubject(subject)} aria-label={`Edit ${subject.name}`}>
                      <Edit3 size={16} />
                    </button>
                    <button className="btn-soft px-3 text-rose-700" onClick={() => removeSubject(subject)} aria-label={`Delete ${subject.name}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
