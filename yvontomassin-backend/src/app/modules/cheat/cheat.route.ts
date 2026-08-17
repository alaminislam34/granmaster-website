import { Router } from 'express';
import { cheatController } from './cheat.controller';
import { CheatValidation } from './cheat.validation';
import validateRequest from '../../../middlewares/validateRequest';
import { imageUpload } from '../../../middlewares/imageUpload';
import parseBodyData from '../../../middlewares/parseBodyData';

const cheatRouter = Router();

// POST /api/cheat/create
cheatRouter.post(
  '/create',
  imageUpload.single('image'),
  parseBodyData,
  validateRequest(CheatValidation.createCheatValidation),
  cheatController.createCheat
);

// GET /api/cheat
cheatRouter.get('/', cheatController.getAllCheats);

// GET /api/cheat/:id
cheatRouter.get('/:id', cheatController.getSingleCheat);

// PATCH /api/cheat/:id
cheatRouter.patch(
  '/:id',
  imageUpload.single('image'),
  parseBodyData,
  validateRequest(CheatValidation.updateCheatValidation),
  cheatController.updateCheat
);

// DELETE /api/cheat/:id
cheatRouter.delete('/:id', cheatController.deleteCheat);

export default cheatRouter;
