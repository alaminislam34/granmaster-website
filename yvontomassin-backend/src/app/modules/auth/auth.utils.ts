import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

export const createToken = (
  jwtPayload: { email: string; role: string },
  secret: string,
  expiresIn: string
): string => {
  return jwt.sign(jwtPayload, secret, { expiresIn } as SignOptions);
};

export const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret) as JwtPayload;
};

export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
