const fs = require('fs').promises;
const path = require('path');
const QuizQuestion = require('../server/models/QuizQuestion');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const { uploadBufferToS3 } = require('../server/utils/s3');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const questions = await QuizQuestion.find();
  for (const q of questions) {
    if (q.image && !q.image.startsWith('http')) {
      const filePath = path.join(__dirname, '../server/uploads', q.image);
      try {
        const buffer = await fs.readFile(filePath);
        const key = `quiz-images/${q._id}-${q.image}`;
        const url = await uploadBufferToS3(buffer, key, 'image/jpeg');
        q.image = url;
        await q.save();
        console.log(`Migrated ${q._id}`);
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.warn(`File missing for ${q._id}, skipping`);
        } else {
          console.error(`Error migrating ${q._id}:`, err);
        }
      }
    }
  }
  await mongoose.disconnect();
})();
