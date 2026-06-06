import { connectDb } from './config/db.js';
import { User } from './models/User.js';

async function inspect() {
  await connectDb();
  const users = await User.find({ role: 'student' }).select('name email studentId faceEmbeddings faceImages status approvalStatus isActive');
  console.log('--- Students in Database ---');
  for (const user of users) {
    console.log({
      name: user.name,
      email: user.email,
      studentId: user.studentId,
      embeddingsCount: user.faceEmbeddings?.length || 0,
      imagesCount: user.faceImages?.length || 0,
      hasEmbeddings: Boolean(user.faceEmbeddings?.length),
      status: user.status,
      approvalStatus: user.approvalStatus,
      isActive: user.isActive
    });
  }
  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
