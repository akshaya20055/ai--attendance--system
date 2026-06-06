import mongoose from 'mongoose';
import { User } from '../backend/src/models/User.js';
import { connectDb } from '../backend/src/config/db.js';

async function inspect() {
  await connectDb();
  const users = await User.find({ role: 'student' }).select('name email studentId faceEmbeddings faceImages');
  console.log('--- Students in Database ---');
  for (const user of users) {
    console.log({
      name: user.name,
      email: user.email,
      studentId: user.studentId,
      embeddingsCount: user.faceEmbeddings?.length || 0,
      imagesCount: user.faceImages?.length || 0,
      hasEmbeddings: Boolean(user.faceEmbeddings?.length),
      embeddingsSample: user.faceEmbeddings?.[0]?.slice(0, 5) || []
    });
  }
  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
