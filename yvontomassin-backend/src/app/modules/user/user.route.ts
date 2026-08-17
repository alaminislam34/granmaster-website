import { Router } from 'express';
import { userController } from './user.controller';
import { UserValidation } from './user.validation';
import validateRequest from '../../../middlewares/validateRequest';
import auth from '../../../middlewares/globalErrorHandler';
import { USER_ROLE } from './user.constant';
import { imageUpload } from '../../../middlewares/imageUpload';
import parseBodyData from '../../../middlewares/parseBodyData';

const userRouter = Router();

userRouter.get('/me', auth(USER_ROLE.user), userController.getMe);

userRouter.get('/:userId', userController.getSingleUser);

userRouter.patch(
  '/:id',
  auth(USER_ROLE.user),
  imageUpload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  parseBodyData,
  validateRequest(UserValidation.updateUserValidationSchema),
  userController.updateUser
);

userRouter.delete('/:id', userController.deleteUser);
userRouter.get('/', userController.getUser);
userRouter.patch(
  '/change-status/:id',
  validateRequest(UserValidation.changeStatusValidationSchema),
  userController.changeStatus
);

export default userRouter;
