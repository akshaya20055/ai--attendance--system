import { Subject } from '../models/Subject.js';

export const defaultSubjects = [
  { name: 'Data Structures', code: 'DS' },
  { name: 'DBMS', code: 'DBMS' },
  { name: 'Operating Systems', code: 'OS' },
  { name: 'Computer Networks', code: 'CN' },
  { name: 'Software Engineering', code: 'SE' },
  { name: 'Java Programming', code: 'JAVA' },
  { name: 'Python Programming', code: 'PY' },
  { name: 'Artificial Intelligence', code: 'AI' },
  { name: 'Machine Learning', code: 'ML' },
  { name: 'Data Science', code: 'DSCI' },
  { name: 'Web Technologies', code: 'WT' }
];

export async function ensureDefaultSubjects() {
  await Promise.all(
    defaultSubjects.map((subject) =>
      Subject.findOneAndUpdate(
        { code: subject.code },
        { ...subject, isActive: true },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
    )
  );

  await Promise.all(
    defaultSubjects.map(async (subject) => {
      const matches = await Subject.find({ code: subject.code }).sort('createdAt');
      if (matches.length <= 1) return;
      await Subject.deleteMany({ _id: { $in: matches.slice(1).map((item) => item._id) } });
    })
  );
}
