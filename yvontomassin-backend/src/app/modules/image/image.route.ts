import { Router } from 'express';
import { imageController } from './image.controller';

const router = Router();

router.get('/', imageController.getImage);

export default router;
