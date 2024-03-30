import { Request } from 'express';
import * as jose from 'jose';
import { MissingAuthorizationError } from '../../services/errors';
import * as auth from '../../utils/auth';

jest.mock('jose', () => ({
  ...jest.requireActual('jose'),
  jwtDecrypt: jest.fn().mockResolvedValue({ payload: { sub: 'mockSub' } }),
}));

jest.mock('cookie', () => ({
  parse: jest.fn().mockImplementation(() => ({
    mockTokenHeader: 'eyJhbGciOiJIUzI1NiJ9...a.b.c.d.e'
  })),
}));

describe('getAccountId', () => {
  it('throws MissingAuthorizationError if token sub is missing', async () => {
    jest.spyOn(auth, 'getToken').mockResolvedValueOnce({});
    const req = { headers: { cookie: 'auth=token' } } as Request;

    await expect(auth.getAccountId(req)).rejects.toThrow(MissingAuthorizationError);
  });

  it('returns sub if present', async () => {
    const expectedAccountId = '123';
    jest.spyOn(auth, 'getToken').mockResolvedValueOnce({ sub: expectedAccountId });
    const req = { headers: { cookie: 'auth=token' } } as Request;
    const accountId = await auth.getAccountId(req);
    expect(accountId).toEqual(expectedAccountId);
  });
});

describe('getToken', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'mockSecret';
    process.env.NEXTAUTH_TOKEN_HEADER = 'mockTokenHeader';
  });

  it('throws MissingAuthorizationError if NEXTAUTH_SECRET or NEXTAUTH_TOKEN_HEADER is not set', async () => {
    const req = {
      headers: {
        cookie: 'mockTokenHeader=mockToken',
      },
    } as Request;
    delete process.env.NEXTAUTH_SECRET;

    await expect(auth.getToken(req)).rejects.toThrow(MissingAuthorizationError);
  });

  it('throws MissingAuthorizationError if no cookies are present', async () => {
    const req = { headers: {} } as Request;

    await expect(auth.getToken(req)).rejects.toThrow(MissingAuthorizationError);
  });

  it('correctly parses and decrypts the token', async () => {
    const req = {
      headers: {
        cookie: 'mockTokenHeader=eyJhbGciOiJIUzI1NiJ9...a.b.c.d.e',
      },
    } as Request;

    const result = await auth.getToken(req);

    expect(jose.jwtDecrypt).toHaveBeenCalled();
    expect(result).toEqual({ sub: 'mockSub' });
  });

  afterEach(() => {
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_TOKEN_HEADER;
  });
});
