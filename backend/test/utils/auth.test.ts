import { Request } from 'express';
import * as jose from 'jose';
import { MissingAuthorizationError } from '../../services/errors';
import * as auth from '../../utils/auth';
import hkdf from '@panva/hkdf';
import AccountModel from '@models/Account';
import { getUserIdByAccountId } from '../../services/accountService';

jest.mock('@models/Account', () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

jest.mock('../../services/accountService', () => ({
  getUserIdByAccountId: jest.fn(),
}));

jest.mock('@panva/hkdf', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('getAccountId', () => {
  it('throws MissingAuthorizationError if token sub is missing', async () => {
    jest.spyOn(auth, 'getToken').mockResolvedValueOnce({} as any);
    const req = { headers: { cookie: 'auth=token' } } as Request;

    await expect(auth.getAccountId(req)).rejects.toThrow(
      MissingAuthorizationError
    );
  });

  it('returns sub if present', async () => {
    const expectedAccountId = '123';
    jest
      .spyOn(auth, 'getToken')
      .mockResolvedValueOnce({ sub: expectedAccountId });
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

  it('successfully decrypts token and returns payload when valid cookie is present', async () => {
    const req = {
      headers: {
        cookie: 'mockTokenHeader=validToken',
      },
    } as Request;
    jest
      .spyOn(jose, 'jwtDecrypt')
      .mockResolvedValueOnce({ payload: { sub: '123' } } as any);

    const tokenPayload = await auth.getToken(req);
    expect(tokenPayload).toHaveProperty('sub', '123');
  });

  describe('chunked cookie reconstruction', () => {
    beforeEach(() => {
      (hkdf as unknown as jest.Mock).mockResolvedValue(
        Buffer.from('x'.repeat(32))
      );
    });

    it('reconstructs JWE from multiple cookies with tokenHeader.N and decrypts', async () => {
      const req = {
        headers: {
          cookie:
            'mockTokenHeader.0=part0; mockTokenHeader.1=part1; mockTokenHeader.2=part2',
        },
      } as Request;
      jest
        .spyOn(jose, 'jwtDecrypt')
        .mockResolvedValueOnce({ payload: { sub: '456' } } as any);

      const tokenPayload = await auth.getToken(req);
      expect(tokenPayload).toHaveProperty('sub', '456');
      expect(jose.jwtDecrypt).toHaveBeenCalledWith(
        'part0part1part2',
        expect.anything()
      );
    });

    it('reconstructs JWE when chunks are out of order in cookie string', async () => {
      const req = {
        headers: {
          cookie: 'mockTokenHeader.2=part2; mockTokenHeader.0=part0; mockTokenHeader.1=part1',
        },
      } as Request;
      jest
        .spyOn(jose, 'jwtDecrypt')
        .mockResolvedValueOnce({ payload: { sub: '789' } } as any);

      const tokenPayload = await auth.getToken(req);
      expect(tokenPayload).toHaveProperty('sub', '789');
      expect(jose.jwtDecrypt).toHaveBeenCalledWith(
        'part0part1part2',
        expect.anything()
      );
    });

    it('ignores keys with non-finite index (only uses tokenHeader.0, tokenHeader.1, ...)', async () => {
      const req = {
        headers: {
          cookie:
            'mockTokenHeader.0=A; mockTokenHeader.foo=ignored; mockTokenHeader.1=B',
        },
      } as Request;
      jest
        .spyOn(jose, 'jwtDecrypt')
        .mockResolvedValueOnce({ payload: { sub: 'ok' } } as any);

      await auth.getToken(req);
      expect(jose.jwtDecrypt).toHaveBeenCalledWith('AB', expect.anything());
    });

    it('throws MissingAuthorizationError when no single cookie and no valid chunks', async () => {
      const req = {
        headers: {
          cookie: 'other=value; another=thing',
        },
      } as Request;

      await expect(auth.getToken(req)).rejects.toThrow(MissingAuthorizationError);
      await expect(auth.getToken(req)).rejects.toThrow(
        'Missing or invalid auth cookie'
      );
      expect(jose.jwtDecrypt).not.toHaveBeenCalled();
    });

    it('throws MissingAuthorizationError when chunks exist but all have non-string values', async () => {
      const req = {
        headers: {
          cookie: 'other.0=x; other.1=y',
        },
      } as Request;

      await expect(auth.getToken(req)).rejects.toThrow(MissingAuthorizationError);
      expect(jose.jwtDecrypt).not.toHaveBeenCalled();
    });

    it('prefers single tokenHeader cookie over chunked when both present', async () => {
      const req = {
        headers: {
          cookie:
            'mockTokenHeader=fullToken; mockTokenHeader.0=chunk0; mockTokenHeader.1=chunk1',
        },
      } as Request;
      jest
        .spyOn(jose, 'jwtDecrypt')
        .mockResolvedValueOnce({ payload: { sub: 'single' } } as any);

      const tokenPayload = await auth.getToken(req);
      expect(tokenPayload).toHaveProperty('sub', 'single');
      expect(jose.jwtDecrypt).toHaveBeenCalledWith('fullToken', expect.anything());
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_TOKEN_HEADER;
  });
});

describe('verifyRequestUser', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'mockSecret';
    process.env.NEXTAUTH_TOKEN_HEADER = 'mockTokenHeader';
    (hkdf as unknown as jest.Mock).mockResolvedValue(
      Buffer.from('x'.repeat(32))
    );
    jest.spyOn(jose, 'jwtDecrypt').mockResolvedValue({
      payload: { sub: 'acc1' },
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_TOKEN_HEADER;
  });

  it('throws MissingAuthorizationError when account is not found', async () => {
    jest.spyOn(auth, 'getAccountId').mockResolvedValue('acc1'); // not once
    (AccountModel.findById as jest.Mock).mockResolvedValueOnce(null);

    const req = {
      params: { courseId: 'c1' },
      headers: {}, // IMPORTANT: prevent req.headers undefined
    } as unknown as Request;

    await expect(auth.verifyRequestUser(req)).rejects.toThrow(
      'Access denied, invalid account'
    );
  });

  it('throws MissingAuthorizationError when course role not found for courseId', async () => {
    (AccountModel.findById as jest.Mock).mockResolvedValueOnce({
      _id: 'acc1',
      courseRoles: [{ course: 'OTHER_COURSE', courseRole: 'Student' }],
    });

    const req = {
      params: { courseId: 'c1' },
      headers: { cookie: 'mockTokenHeader=validToken' },
    } as unknown as Request;

    await expect(auth.verifyRequestUser(req)).rejects.toThrow(
      'Access denied, invalid course role'
    );
  });

  it('returns { account, userCourseRole } when valid', async () => {
    (AccountModel.findById as jest.Mock).mockResolvedValueOnce({
      _id: 'acc1',
      courseRoles: [{ course: 'c1', courseRole: 'Student' }],
    });

    const req = {
      params: { courseId: 'c1' },
      headers: { cookie: 'mockTokenHeader=validToken' },
    } as unknown as Request;

    const result = await auth.verifyRequestUser(req);

    expect(result.account._id).toBe('acc1');
    expect(result.userCourseRole).toBe('Student');
  });
});

describe('verifyRequestPermission', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws MissingAuthorizationError when authorisedRoles does not include userCourseRole', async () => {
    await expect(
      auth.verifyRequestPermission('acc1', 'Student' as any, ['Faculty' as any])
    ).rejects.toThrow(MissingAuthorizationError);

    await expect(
      auth.verifyRequestPermission('acc1', 'Student' as any, ['Faculty' as any])
    ).rejects.toThrow('Access denied, insufficient permissions');

    expect(getUserIdByAccountId).not.toHaveBeenCalled();
  });

  it('returns userId when authorisedRoles is empty (no restriction)', async () => {
    (getUserIdByAccountId as jest.Mock).mockResolvedValueOnce('u1');

    const userId = await auth.verifyRequestPermission(
      'acc1',
      'Student' as any,
      []
    );

    expect(getUserIdByAccountId).toHaveBeenCalledWith('acc1');
    expect(userId).toBe('u1');
  });

  it('returns userId when userCourseRole is in authorisedRoles', async () => {
    (getUserIdByAccountId as jest.Mock).mockResolvedValueOnce('u1');

    const userId = await auth.verifyRequestPermission(
      'acc1',
      'Faculty' as any,
      ['Faculty' as any]
    );

    expect(getUserIdByAccountId).toHaveBeenCalledWith('acc1');
    expect(userId).toBe('u1');
  });
});
