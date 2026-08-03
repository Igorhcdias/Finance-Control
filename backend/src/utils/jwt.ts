import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface ITokenPayload {
  sub: string; // id do usuário
  email: string;
}

export function signToken(payload: ITokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyToken(token: string): ITokenPayload {
  return jwt.verify(token, env.jwtSecret) as ITokenPayload;
}
