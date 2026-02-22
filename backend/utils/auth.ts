import hkdf from '@panva/hkdf';
import cookie from 'cookie';
import { Request } from 'express';
import * as jose from 'jose';
import { MissingAuthorizationError } from '../services/errors';
import AccountModel from '@models/Account';
import { getUserIdByAccountId } from '../services/accountService';
import { CourseRole } from '@shared/types/auth/CourseRole';

export const getAccountId = async (req: Request) => {
  const result = (await getToken(req)).sub;
  if (!result) {
    throw new MissingAuthorizationError('Missing account ID');
  }
  return result;
};

export const getToken = async (req: Request) => {
  const tokenHeader = process.env.NEXTAUTH_TOKEN_HEADER;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;

  if (!nextAuthSecret || !tokenHeader) {
    throw new MissingAuthorizationError('.env not properly set');
  } else if (!req.headers.cookie) {
    throw new MissingAuthorizationError('Missing authorization');
  }

  const parsedCookies = cookie.parse(req.headers.cookie);

  let jwe: string | undefined = parsedCookies[tokenHeader];
  if (!jwe) {
    const chunks = Object.keys(parsedCookies)
      .filter(key => key.startsWith(`${tokenHeader}.`))
      .map(key => ({
        key,
        idx: Number(key.slice(tokenHeader.length + 1)),
      }))
      .filter(x => Number.isFinite(x.idx))
      .sort((a, b) => a.idx - b.idx)
      .map(x => parsedCookies[x.key])
      .filter((part): part is string => typeof part === 'string');

    if (chunks.length > 0) {
      jwe = chunks.join('');
    }
  }

  if (typeof jwe !== 'string' || !jwe) {
    throw new MissingAuthorizationError(
      'Missing or invalid auth cookie. Ensure you are logged in and NEXTAUTH_TOKEN_HEADER matches the base cookie name.'
    );
  }

  // Adapted from https://github.com/nextauthjs/next-auth/blob/d3571e01ba06599ca0411d14d524aa3145ba492b/packages/next-auth/src/jwt/index.ts#L119
  const key = await hkdf(
    'sha256',
    nextAuthSecret,
    '',
    'NextAuth.js Generated Encryption Key',
    32
  );

  const dec = await jose.jwtDecrypt(jwe, key);
  return dec.payload;
};

export const verifyRequestUser = async (req: Request) => {
  const accountId = await getAccountId(req);
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new MissingAuthorizationError('Access denied, invalid account');
  }
  const userCourseRole = account.courseRoles.find(
    cr => cr.course.toString() === req.params.courseId
  )?.courseRole;
  if (!userCourseRole) {
    throw new MissingAuthorizationError('Access denied, invalid course role');
  }
  return { account, userCourseRole };
};

export const verifyRequestPermission = async (
  accountId: string,
  userCourseRole: CourseRole,
  authorisedRoles: CourseRole[]
) => {
  if (authorisedRoles.length > 0 && !authorisedRoles.includes(userCourseRole)) {
    throw new MissingAuthorizationError(
      'Access denied, insufficient permissions'
    );
  }
  return await getUserIdByAccountId(accountId);
};
