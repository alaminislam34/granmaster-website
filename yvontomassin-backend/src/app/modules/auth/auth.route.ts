import { Router, NextFunction, Request, Response } from 'express';
import { UserValidation } from '../user/user.validation';
import { AuthValidation } from './auth.validation';
import validateRequest from '../../../middlewares/validateRequest';
import { AuthControllers } from './auth.controller';
import auth from '../../../middlewares/globalErrorHandler';
import { USER_ROLE } from '../user/user.constant';

const authRouter = Router();

authRouter.post(
  '/register',
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      try {
        req.body = JSON.parse(req.body.data);
      } catch (error) {
        // Keep original body if parsing fails
      }
    }
    next();
  },
  validateRequest(UserValidation.UserValidationSchema),
  AuthControllers.register
);
authRouter.post(
  '/login',
  validateRequest(AuthValidation.loginValidationSchema),
  AuthControllers.login
);
authRouter.post(
  '/verify-email',
  validateRequest(AuthValidation.verifyEmailValidationSchema),
  AuthControllers.verifyEmail
);
authRouter.post(
  '/change-password',
  auth(USER_ROLE.user),
  validateRequest(AuthValidation.changePasswordValidationSchema),
  AuthControllers.changePassword
);

authRouter.post('/logout', AuthControllers.logout);

authRouter.post(
  '/refresh-token',
  validateRequest(AuthValidation.refreshTokenValidationSchema),
  AuthControllers.refreshToken
);

authRouter.post(
  '/forget-password',
  validateRequest(AuthValidation.forgetPasswordValidationSchema),
  AuthControllers.forgetPassword
);

authRouter.post(
  '/code-verify',
  validateRequest(AuthValidation.verifyCodeValidationSchema),
  AuthControllers.verifyCode
);

authRouter.post(
  '/reset-password',
  validateRequest(AuthValidation.resetPasswordValidationSchema),
  AuthControllers.resetPassword
);

export default authRouter;
