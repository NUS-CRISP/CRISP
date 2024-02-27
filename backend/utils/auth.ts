import hkdf from '@panva/hkdf';
import cookie from 'cookie';
import { Request } from 'express';
import * as jose from 'jose';

export const getAccountId = async (req: Request) => (await getToken(req)).sub;

const getToken = async (req: Request) => {
  const tokenHeader = process.env.NEXTAUTH_TOKEN_HEADER;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;

  if (!nextAuthSecret || !tokenHeader) {
    throw new Error('.env not properly set');
  } else if (!req.headers.cookie) {
    throw new Error('Missing authorization');
  }

  const jwe = cookie.parse(req.headers.cookie)[tokenHeader];

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
