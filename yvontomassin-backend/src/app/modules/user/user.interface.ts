import { Model } from 'mongoose';
import { USER_ROLE } from './user.constant';

export interface IUser {
  [x: string]: any | undefined;
  name: string;
  email: string;
  password: string | null;
  role: 'user';
  is_admin: boolean;
  phone?: string;
  address?: string;
  city?: string;
  profileImage?: string;
  needsPasswordChange: boolean;
  passwordChangedAt?: Date;
  status: 'active' | 'in-progress' | 'blocked';
  isBlocked: boolean;
  verificationCode?: string;
  isVerified: boolean;
  isEmailVerified?: boolean;
  provider?: 'google' | 'apple' | 'email';
  providerId?: string;
}

export interface UserModel extends Model<IUser> {
  //instance methods for checking if the user exist
  isUserExistsByCustomId(email: string): Promise<IUser>;
  //instance methods for checking if passwords are matched
  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string
  ): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(
    passwordChangedTimestamp: Date,
    jwtIssuedTimestamp: number
  ): boolean;
}

export type IUserRole = keyof typeof USER_ROLE;
