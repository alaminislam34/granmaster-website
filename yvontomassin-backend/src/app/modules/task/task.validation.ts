import { z } from 'zod';

export const taskSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters long')
    .max(100, 'Title cannot exceed 100 characters')
    .trim(),

  category: z.enum(
    [
      'Arts and Craft',
      'Nature',
      'Family',
      'Sport',
      'Friends',
      'Meditation',
    ] as const,
    { message: 'Please select a valid category' }
  ),

  status: z.enum(
    ['All Task', 'Ongoing', 'Pending', 'Collaborative Task', 'Done'] as const,
    { message: 'Please select a valid status' }
  ),


  // Optional arrays for media URLs
  images: z.array(z.string().url()).optional(),
  videos: z.array(z.string().url()).optional(),
  files: z.array(z.string().url()).optional(),
});
