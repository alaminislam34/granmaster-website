import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthService } from './auth.service';
import config from '../../config';
import catchAsync from '../../../utils/catchAsync';
import sendResponse from '../../../utils/sendResponse';
import AppError from '../../../errors/AppError';

const getRefreshTokenCookieOptions = () => {
  const useSecureCookie =
    process.env.COOKIE_SECURE === 'true' ||
    (config.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false');

  return {
    secure: useSecureCookie,
    httpOnly: true,
    sameSite: useSecureCookie ? 'none' as const : 'lax' as const,
  };
};

const register = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.register((req as any).file, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.ACCEPTED,
    success: true,
    message:
      'User Registered successfully. Please check your email for the verification code.',
    data: result,
  });
});

const resendVerificationCode = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  await AuthService.resendVerificationCode(email);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Verification code sent. Please check your email.',
    data: null,
  });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { email, code, verificationCode } = req.body;
  // accept both "code" and "verificationCode" field names
  const result = await AuthService.verifyEmail(email, code ?? verificationCode);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Email verified successfully',
    data: result,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);

  const { refreshToken, accessToken, needsPasswordChange } = result;

  res.cookie('refreshToken', refreshToken, {
    ...getRefreshTokenCookieOptions(),
    maxAge: 1000 * 60 * 60 * 24 * 365,
  });

  sendResponse(res, {
    statusCode: StatusCodes.ACCEPTED,
    success: true,
    message: 'User logged in successfully',
    data: {
      accessToken,
      needsPasswordChange,
    },
  });
});

const changePassword = catchAsync(async (req, res) => {
  const { ...passwordData } = req.body;
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized!');
  }

  const result = await AuthService.changePassword(req.user, passwordData);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Password is updated successfully!',
    data: result,
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;
  const result = await AuthService.refreshToken(refreshToken);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'refreshToken token is retrieved successfully!',
    data: {
      result,
    },
  });
});

const logout = catchAsync(async (req, res) => {
  // Clear the httpOnly refreshToken cookie
  res.clearCookie('refreshToken', getRefreshTokenCookieOptions());
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Logged out successfully',
    data: null,
  });
});

const forgetPassword = catchAsync(async (req, res) => {
  const userEmail = req.body.email;
  const result = await AuthService.forgetPassword(userEmail);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Verification code is sent to your email successfully!',
    data: result,
  });
});

const verifyCode = catchAsync(async (req, res) => {
  const { email, code } = req.body;
  const result = await AuthService.verifyCode(email, code);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Code verified successfully',
    data: result,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const result = await AuthService.resetPassword(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Password reset successful!',
    data: result,
  });
});

export const AuthControllers = {
  register,
  resendVerificationCode,
  verifyEmail,
  login,
  changePassword,
  refreshToken,
  logout,
  forgetPassword,
  verifyCode,
  resetPassword,
};
