import bcrypt from 'bcrypt';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../../config';
import { TLoginUser } from './auth.interface';
import { StatusCodes } from 'http-status-codes';
import {
  createToken,
  generateVerificationCode,
  verifyToken,
} from './auth.utils';
import AppError from '../../../errors/AppError';
import { IUser } from '../user/user.interface';
import { User } from '../user/user.model';
import { sendEmail } from '../../../utils/sendEmail';

const verificationEmailHtml = (code: string) => `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Verify Your Email</h2>
      <p>Thank you for registering. Please use the following code to verify your account:</p>
      <div style="background: #f4f4f4; padding: 10px; border-radius: 5px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
        ${code}
      </div>
      <p>This code will expire soon.</p>
    </div>
  `;

const toRegisterResult = (user: { email: string; name: string; _id: { toString(): string }; role: string }) => ({
  email: user.email,
  name: user.name,
  id: user._id.toString(),
  role: user.role,
});

const register = async (file: any, payload: IUser) => {
  if (!payload.password) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Password is required');
  }

  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    if (existingUser.isVerified) {
      throw new AppError(StatusCodes.CONFLICT, 'Email already exists');
    }

    const verificationCode = generateVerificationCode();
    await User.findOneAndUpdate(
      { email: payload.email },
      { verificationCode }
    );
    await sendEmail(existingUser.email, verificationEmailHtml(verificationCode));
    return toRegisterResult(existingUser);
  }

  const verificationCode = generateVerificationCode();
  const user = await User.create({
    ...payload,
    verificationCode,
    isVerified: false,
    status: 'in-progress',
  });

  await sendEmail(user.email, verificationEmailHtml(verificationCode));
  return toRegisterResult(user);
};

const resendVerificationCode = async (email: string) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }

  if (user.isVerified) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Already verified');
  }

  const verificationCode = generateVerificationCode();
  await User.findOneAndUpdate({ email }, { verificationCode });
  await sendEmail(user.email, verificationEmailHtml(verificationCode));
};

const verifyEmail = async (email: string, code?: string) => {
  const user = await User.findOne({ email }).select(
    '+password +verificationCode'
  );

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }

  if (user.isVerified) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Already verified');
  }

  if (!code) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Verification code is required'
    );
  }

  // Trim the codes for comparison to avoid whitespace issues
  const storedCode = user.verificationCode?.trim();
  const providedCode = code?.trim();

  if (!storedCode) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Verification code not found. Please request a new code.'
    );
  }

  if (storedCode !== providedCode) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Invalid verification code. Please check your email for the correct code.`
    );
  }

  await User.findOneAndUpdate(
    { email },
    {
      isVerified: true,
      status: 'active',
      verificationCode: null,
    },
    { new: true }
  );

  return null;
};

const login = async (payload: TLoginUser) => {
  const user = await User.findOne({ email: payload.email }).select('+password');

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'This user is not found !');
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === 'blocked') {
    throw new AppError(StatusCodes.FORBIDDEN, 'This user is blocked ! !');
  }

  if (userStatus === 'in-progress') {
    throw new AppError(StatusCodes.FORBIDDEN, 'Verify your email first');
  }

  // checking if the user is verified
  if (!user.isVerified) {
    throw new AppError(StatusCodes.FORBIDDEN, 'Verify your email first');
  }

  // checking if the password is correct
  if (!user?.password) {
    throw new AppError(StatusCodes.FORBIDDEN, 'Password is not set');
  }

  const isPasswordMatched = await bcrypt.compare(
    payload.password,
    user.password
  );

  if (!isPasswordMatched) {
    throw new AppError(StatusCodes.FORBIDDEN, 'Password do not match');
  }

  // create token and sent to the  client
  const jwtPayload = {
    email: user.email,
    name: user.name,
    id: user._id.toString(),
    role: user.role,
    is_admin: user.is_admin === true,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string
  );

  return {
    accessToken,
    refreshToken,
    needsPasswordChange: user?.needsPasswordChange,
  };
};

const changePassword = async (
  userData: JwtPayload,
  payload: { oldPassword: string; newPassword: string }
) => {
  // checking if the user is exist
  const user = await User.isUserExistsByCustomId(userData.email);

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'This user is not found !');
  }

  // checking if the user is blocked

  const userStatus = user?.status;

  if (userStatus === 'blocked') {
    throw new AppError(StatusCodes.FORBIDDEN, 'This user is blocked ! !');
  }

  //checking if the password is correct

  if (!user?.password) {
    throw new AppError(StatusCodes.FORBIDDEN, 'Password is not set');
  }

  if (!(await User.isPasswordMatched(payload.oldPassword, user.password)))
    throw new AppError(StatusCodes.FORBIDDEN, 'Password do not matched');

  //hash new password
  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  await User.findOneAndUpdate(
    {
      email: userData.email,
      role: userData.role,
    },
    {
      password: newHashedPassword,
      needsPasswordChange: false,
      passwordChangedAt: new Date(),
    }
  );

  return null;
};

const refreshToken = async (token: string) => {
  // checking if the given token is valid
  const decoded = verifyToken(token, config.jwt_refresh_secret as string);

  const { email, iat } = decoded;

  // checking if the user is exist
  const user = await User.isUserExistsByCustomId(email);
  // console.log(decoded);

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'This user is not found !');
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === 'blocked') {
    throw new AppError(StatusCodes.FORBIDDEN, 'This user is blocked ! !');
  }

  if (
    user.passwordChangedAt &&
    User.isJWTIssuedBeforePasswordChanged(user.passwordChangedAt, iat as number)
  ) {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized !');
  }

  const jwtPayload = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    is_admin: user.is_admin === true,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string
  );

  return {
    accessToken,
  };
};

const forgetPassword = async (userEmail: string) => {
  const user = await User.findOne({ email: userEmail });

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'This user is not found !');
  }

  // checking if the user is already deleted
  const isDeleted = user?.isDeleted;

  if (isDeleted) {
    throw new AppError(StatusCodes.FORBIDDEN, 'This user is deleted !');
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === 'blocked') {
    throw new AppError(StatusCodes.FORBIDDEN, 'This user is blocked ! !');
  }

  const verificationCode = generateVerificationCode();

  await User.findOneAndUpdate({ email: userEmail }, { verificationCode });

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Password Reset Code</h2>
      <p>You requested to reset your password. Please use the following code to verify your identity:</p>
      <div style="background: #f4f4f4; padding: 10px; border-radius: 5px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
        ${verificationCode}
      </div>
      <p>This code will expire soon.</p>
    </div>
  `;

  await sendEmail(user.email, emailHtml);
};

const verifyCode = async (email: string, code: string) => {
  const user = await User.findOne({ email }).select('+verificationCode');

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }

  if (!code) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Verification code is required');
  }

  if (user.verificationCode !== code) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid verification code');
  }

  // Don't clear the code here - it will be used in resetPassword

  const jwtPayload = {
    role: user.role,
    email: user.email,
  };

  const resetToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    '10m'
  );

  return { resetToken };
};

const resetPassword = async (payload: {
  email: string;
  code: string;
  newPassword: string;
}) => {
  const { email, code, newPassword } = payload;

  const user = await User.findOne({ email }).select('+verificationCode');

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'This user is not found!');
  }

  // checking if the user is already deleted
  const isDeleted = user?.isDeleted;
  if (isDeleted) {
    throw new AppError(StatusCodes.FORBIDDEN, 'This user is deleted!');
  }

  // checking if the user is blocked
  const userStatus = user?.status;
  if (userStatus === 'blocked') {
    throw new AppError(StatusCodes.FORBIDDEN, 'This user is blocked!');
  }

  // check code
  if (user.verificationCode !== code) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Already updated');
  }

  // hash new password
  const newHashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  await User.findOneAndUpdate(
    { email: email },
    {
      password: newHashedPassword,
      needsPasswordChange: false,
      passwordChangedAt: new Date(),
      verificationCode: null,
    }
  );

  return null;
};

export const AuthService = {
  register,
  resendVerificationCode,
  verifyEmail,
  login,
  changePassword,
  refreshToken,
  forgetPassword,
  verifyCode,
  resetPassword,
};
