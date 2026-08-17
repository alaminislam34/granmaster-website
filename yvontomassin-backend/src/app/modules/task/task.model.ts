import mongoose, { Schema } from 'mongoose';
import { ITask } from './task.interface';

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'Arts and Craft',
        'Nature',
        'Family',
        'Sport',
        'Friends',
        'Meditation',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['All Task', 'Ongoing', 'Pending', 'Collaborative Task', 'Done'],
      required: true,
    },
  
    // New fields
    images: [{ type: String }], // optional array of image URLs
    videos: [{ type: String }], // optional array of video URLs
    files: [{ type: String }],  // optional array of file URLs
  },
  { timestamps: true }
);

export const TaskModel = mongoose.model<ITask>('TaskModel', TaskSchema);
