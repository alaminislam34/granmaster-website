import { Router } from 'express';
import { savedController } from './saved.controller';
import { SavedValidation } from './saved.validation';
import validateRequest from '../../../middlewares/validateRequest';

const savedRouter = Router();

savedRouter.post(
  '/',
  validateRequest(SavedValidation.createSavedValidation),
  savedController.createSaved
);
savedRouter.get('/', savedController.listSaved);
savedRouter.get('/:id/pdf', savedController.downloadPdf);
savedRouter.get('/:id', savedController.getSaved);
savedRouter.delete('/:id', savedController.deleteSaved);

export default savedRouter;
