import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    examples: [
      {
        input: String,
        output: String,
        explanation: String,
      },
    ],
    constraints: {
      type: String,
    },
    boilerplate: {
      javascript: String,
      python: String,
      cpp: String,
      java: String,
    },
    testCases: [
      {
        input: String,
        output: String,
        explanation: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Question = mongoose.model('Question', questionSchema);
