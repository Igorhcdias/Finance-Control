import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface ITokenPayload {
  sub: string; // id do usuário
  email: string;
}

export function signToken(payload: ITokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyToken(token: string): ITokenPayload {
  return jwt.verify(token, env.jwtSecret) as ITokenPayload;
}