import { Router } from 'express';
import validateRequest from '../../../middlewares/validateRequest';
import { portionFilterController } from './portionFilter.controller';
import { PortionFilterValidation } from './portionFilter.validation';

const portionFilterRouter = Router();

portionFilterRouter.get('/', portionFilterController.getPortionFilters);
portionFilterRouter.put(
  '/',
  validateRequest(PortionFilterValidation.updatePortionFilterValidation),
  portionFilterController.updatePortionFilters
);

export default portionFilterRouter;
