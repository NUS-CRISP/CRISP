import hkdf from '@panva/hkdf';
import cookie from 'cookie';
import { Request } from 'express';
import * as jose from 'jose';

/**
 * Decrypts and decodes the JWE constructed by NextAuth.
 */
export const getToken = async (req: Request) => {
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (!nextAuthSecret) {
    throw new Error('NEXTAUTH_SECRET is not set');
  }

  if (!req.headers.cookie) {
    throw new Error('Missing authorization');
  }

  const jwe = cookie.parse(req.headers.cookie)['next-auth.session-token'];

  // Adapted from https://github.com/nextauthjs/next-auth/blob/d3571e01ba06599ca0411d14d524aa3145ba492b/packages/next-auth/src/jwt/index.ts#L119
  const key = await hkdf(
    'sha256',
    nextAuthSecret,
    '',
    'NextAuth.js Generated Encryption Key',
    32
  );

  return (await jose.jwtDecrypt(jwe, key)).payload;
};
