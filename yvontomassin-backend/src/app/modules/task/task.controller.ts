import { Request, Response } from 'express';
import { taskService } from './task.service';
import { ITask } from './task.interface';

const createTask = async (req: Request, res: Response) => {
  try {
    const { title, category, status, endDate } = req.body;

    console.log('📝 Request Body:', req.body);
    console.log('🔍 Raw values:', { title, category, status, endDate });

    // Validate and trim inputs first
    const trimmedTitle = title?.trim();
    const trimmedCategory = category?.trim();
    const trimmedStatus = status?.trim();

    if (!trimmedTitle || !trimmedCategory || !trimmedStatus || !endDate) {
      console.error('❌ Missing fields:', {
        title: trimmedTitle,
        category: trimmedCategory,
        status: trimmedStatus,
        endDate: endDate,
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (title, category, status, endDate)',
        received: {
          title: !!trimmedTitle,
          category: !!trimmedCategory,
          status: !!trimmedStatus,
          endDate: !!endDate,
        },
      });
    }

    // Parse date - handle various formats
    const trimmedEndDate = endDate.trim();
    console.log('📅 Parsing date:', trimmedEndDate);

    const parsedDate = new Date(trimmedEndDate);
    console.log(
      '📅 Parsed date:',
      parsedDate,
      'Valid:',
      !isNaN(parsedDate.getTime())
    );

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: `Invalid date format. Received: "${trimmedEndDate}". Expected ISO format like: 2026-01-20T18:00:00.000Z`,
      });
    }

    const images: string[] = [];
    const videos: string[] = [];
    const filesArr: string[] = [];

    // Create new task
    const newTask: ITask = {
      title: trimmedTitle,
      category: trimmedCategory,
      status: trimmedStatus,
      endDate: parsedDate,
      images,
      videos,
      files: filesArr,
    };

    console.log('💾 Saving task to database:', newTask);

    // Save the task to the database
    const result = await taskService.createTask(newTask);

    console.log('✅ Task created successfully:', result);

    res.status(201).json({ success: true, task: result });
  } catch (error: any) {
    console.error('❌ Error creating task:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const taskController = {
  createTask,
};
