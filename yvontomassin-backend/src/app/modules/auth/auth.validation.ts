import { z } from 'zod';

const loginValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        message: 'Email must be provided and must be a string',
      })
      .email(),
    password: z.string({ message: 'Password is required' }),
  }),
});

const verifyEmailValidationSchema = z.object({
  body: z.object({
    email: z.string().email(),
    code: z.string().length(6).optional(),
    verificationCode: z.string().length(6).optional(),
  }),
});

const verifyCodeValidationSchema = z.object({
  body: z.object({
    email: z.string().email(),
    code: z.string().length(6),
  }),
});

const changePasswordValidationSchema = z.object({
  body: z.object({
    oldPassword: z.string({
      message: 'Old password is required',
    }),
    newPassword: z.string({ message: 'Password is required' }),
  }),
});
const refreshTokenValidationSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({
      message: 'Refresh token is required!',
    }),
  }),
});

const forgetPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string({
      message: 'User id is required!',
    }),
  }),
});

const resendVerificationValidationSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

const resetPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string({
      message: 'Email is required!',
    }),
    code: z.string().length(6),
    newPassword: z.string({
      message: 'Password is required!',
    }),
  }),
});

export const AuthValidation = {
  loginValidationSchema,
  verifyEmailValidationSchema,
  verifyCodeValidationSchema,
  changePasswordValidationSchema,
  refreshTokenValidationSchema,
  forgetPasswordValidationSchema,
  resendVerificationValidationSchema,
  resetPasswordValidationSchema,
};
