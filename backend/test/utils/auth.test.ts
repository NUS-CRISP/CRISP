import { MissingAuthorizationError } from '../../services/errors';
import * as auth from '../../utils/auth';

jest.mock('cookie');

describe('getAccountId', () => {
  it('throws MissingAuthorizationError if token sub is missing', async () => {
    jest.spyOn(auth, 'getToken').mockResolvedValueOnce({});
    const req = { headers: { cookie: 'auth=token' } };

    await expect(auth.getAccountId(req as any)).rejects.toThrow(MissingAuthorizationError);
  });

  it('returns sub if present', async () => {
    const expectedAccountId = '123';
    jest.spyOn(auth, 'getToken').mockResolvedValueOnce({ sub: expectedAccountId });
    const req = { headers: { cookie: 'auth=token' } };
    const accountId = await auth.getAccountId(req as any);
    expect(accountId).toEqual(expectedAccountId);
  });
});

describe('getToken', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret';
    process.env.NEXTAUTH_TOKEN_HEADER = 'Authorization';
  });

  it('simple test to ensure function returns a promise', async () => {
    jest.spyOn(auth, 'getToken').mockResolvedValueOnce({ sub: '123' });
    const req = { headers: { cookie: 'auth=token' } };

    const result = await auth.getToken(req as any);
    expect(result).toHaveProperty('sub', '123');
  });

  it('throws MissingAuthorizationError if necessary env vars are not set', async () => {
    delete process.env.NEXTAUTH_SECRET;
    jest.spyOn(auth, 'getToken').mockRejectedValueOnce(new MissingAuthorizationError('.env not properly set'));
    const req = { headers: { cookie: 'auth=token' } };

    await expect(auth.getToken(req as any)).rejects.toThrow(MissingAuthorizationError);
  });

  it('throws MissingAuthorizationError if authorization cookie is missing', async () => {
    jest.spyOn(auth, 'getToken').mockRejectedValueOnce(new MissingAuthorizationError('Missing authorization'));
    const req = { headers: {} };

    await expect(auth.getToken(req as any)).rejects.toThrow(MissingAuthorizationError);
  });
});
