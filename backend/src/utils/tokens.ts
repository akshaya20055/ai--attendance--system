import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signToken(payload: object) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'] });
}

export function verifyToken<T>(token: string) {
  return jwt.verify(token, env.jwtSecret) as T;
}
