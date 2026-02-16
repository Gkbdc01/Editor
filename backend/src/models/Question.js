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
    
    // 🌟 THE NEW METADATA ENGINE 🌟
    metaData: {
      className: {
        type: String,
        required: true, // e.g., 'Solution'
      },
      methodName: {
        type: String,
        required: true, // e.g., 'twoSum'
      },
      params: [
        {
          name: String, // e.g., 'nums'
          type: { type: String, required: true } // Workaround because 'type' is a reserved Mongoose keyword
        }
      ],
      returnType: {
        type: String, // e.g., 'int[]'
        required: true,
      }
    },

    testCases: [
      {
        input: {
          type: String,
          required: true // Added required since execution breaks without input
        },
        output: {
          type: String,
          required: true // Added required since execution breaks without output
        },
        explanation: {
          type: String,
          required: false
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Question = mongoose.model('Question', questionSchema);