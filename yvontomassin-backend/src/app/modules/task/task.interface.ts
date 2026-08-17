export type TaskCategory =
  | 'Arts and Craft'
  | 'Nature'
  | 'Family'
  | 'Sport'
  | 'Friends'
  | 'Meditation';

export type TaskStatus =
  | 'All Task'
  | 'Ongoing'
  | 'Pending'
  | 'Collaborative Task'
  | 'Done';

export interface ITask {
  title: string;
  category: TaskCategory;
  status: TaskStatus;

  // New fields for media
  images?: string[]; // array of image URLs
  videos?: string[]; // array of video URLs
  files?: string[]; // array of file URLs or any storage URL

  [key: string]: any; // optional extension
}
