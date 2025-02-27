/**
 * InstructorTool Model
 * Represents tools owned by an instructor.
 */

const mongoose = require('mongoose');

const instructorToolSchema = new mongoose.Schema(
  {
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toolName: { type: String, required: true },
    imageUrl: { type: String }, // S3 URL
    description: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InstructorTool', instructorToolSchema);
