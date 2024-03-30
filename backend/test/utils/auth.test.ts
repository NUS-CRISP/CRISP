import * as hkdfLib from '@panva/hkdf';
import * as cookie from 'cookie';
import { Request } from 'express';
import * as jose from 'jose';
import { MissingAuthorizationError } from '../../services/errors';
import * as auth from '../../utils/auth';

jest.mock('cookie');
jest.mock('jose');
jest.mock('@panva/hkdf', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(async () => 'mockKey'),
  hkdf: jest.fn().mockImplementation(async () => 'mockKey'),
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
  beforeAll(() => {
    (hkdfLib.default as jest.Mock).mockImplementation(async () => 'mockKey');

    (jose.jwtDecrypt as jest.Mock).mockImplementation(async () => ({
      payload: { sub: 'mockSub' },
    }));
  });

  it('throws MissingAuthorizationError if NEXTAUTH_SECRET or NEXTAUTH_TOKEN_HEADER is not set', async () => {
    const req = { headers: {} } as Request;
    process.env.NEXTAUTH_SECRET = '';
    process.env.NEXTAUTH_TOKEN_HEADER = '';

    await expect(auth.getToken(req)).rejects.toThrow(MissingAuthorizationError);

    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_TOKEN_HEADER;
  });

  it('throws MissingAuthorizationError if no cookies are present', async () => {
    const req = { headers: {} } as Request;
    process.env.NEXTAUTH_SECRET = 'mockSecret';
    process.env.NEXTAUTH_TOKEN_HEADER = 'mockTokenHeader';

    await expect(auth.getToken(req)).rejects.toThrow(MissingAuthorizationError);
  });

  it('correctly parses and decrypts the token', async () => {
    const mockToken = 'mockToken';
    const req = {
      headers: {
        cookie: 'mockTokenHeader=mockToken',
      },
    } as Request;
    process.env.NEXTAUTH_SECRET = 'mockSecret';
    process.env.NEXTAUTH_TOKEN_HEADER = 'mockTokenHeader';
    (cookie.parse as jest.Mock).mockReturnValue({ mockTokenHeader: mockToken });

    const result = await auth.getToken(req);

    expect(result).toEqual({ sub: 'mockSub' });

    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_TOKEN_HEADER;
  });
});
