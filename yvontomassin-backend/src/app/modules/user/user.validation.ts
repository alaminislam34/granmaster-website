import { z } from 'zod';
import { UserStatus } from './user.constant';

// Define the Zod schema
export const UserValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, { message: 'Name must be at least 3 characters long' })
      .nonempty({ message: 'Name is required' })
      .trim(),
    email: z.string().email({ message: 'Please enter a valid email address' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long' }),
    role: z.enum(['user']).default('user'),
    isBlocked: z.boolean().default(false),
  }),
});
const changeStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum([...UserStatus] as [string, ...string[]]),
  }),
});

const updateUserValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, { message: 'Name must be at least 3 characters long' })
      .trim()
      .optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    profileImage: z.string().optional(),
  }),
});

export const UserValidation = {
  UserValidationSchema,
  changeStatusValidationSchema,
  updateUserValidationSchema,
};
