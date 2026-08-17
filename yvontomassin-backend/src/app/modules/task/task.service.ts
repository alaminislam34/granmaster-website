import { ITask } from './task.interface';
import { TaskModel } from './task.model';

// Create a new task
const createTask = async (data: ITask) => {
  const result = await TaskModel.create(data);
  return result;
};

// Get all tasks
const getAllTasks = async () => {
  const result = await TaskModel.find();
  return result;
};

// Get single task by ID
const getSingleTask = async (id: string) => {
  const result = await TaskModel.findById(id);
  return result;
};

// Update task by ID
const updateTask = async (id: string, payload: Partial<ITask>) => {
  const result = await TaskModel.findByIdAndUpdate(id, payload, {
    new: true, // return updated document
    runValidators: true,
  });
  return result;
};

// Delete task by ID
const deleteTask = async (id: string) => {
  const result = await TaskModel.findByIdAndDelete(id);
  return result;
};

export const taskService = {
  createTask,
  getAllTasks,
  getSingleTask,
  updateTask,
  deleteTask,
};
