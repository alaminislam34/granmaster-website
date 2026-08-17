import express from 'express';
import { taskController } from './task.controller';

const taskRoute = express.Router();

// Route for creating a task with images, videos, and other files
taskRoute.post(
  '/create',
  taskController.createTask // Controller to handle the task creation
);

export default taskRoute;
