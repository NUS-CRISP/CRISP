import { handleError } from '../../utils/error';
import {
  NotFoundError,
  BadRequestError,
  MissingAuthorizationError,
} from '../../services/errors';

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('handleError', () => {
  it('returns 404 for NotFoundError', () => {
    const res = makeRes();
    const err = new NotFoundError('missing');
    handleError(res, err, 'fallback');

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'missing: Not found' });
  });

  it('returns 400 for BadRequestError', () => {
    const res = makeRes();
    const err = new BadRequestError('bad');
    handleError(res, err, 'fallback');

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'bad' });
  });

  it('returns 403 for MissingAuthorizationError', () => {
    const res = makeRes();
    const err = new MissingAuthorizationError('nope');
    handleError(res, err, 'fallback');

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'nope: Unauthorized' });
  });

  it('returns 500 + logs for unknown error', () => {
    const res = makeRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const err = new Error('boom');
    handleError(res, err, 'fallback msg');

    expect(spy).toHaveBeenCalledWith('fallback msg', err);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'fallback msg: Internal server error' });

    spy.mockRestore();
  });

  it('handles non-Error unknown values', () => {
    const res = makeRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    handleError(res, 'oops', 'fallback msg');

    expect(spy).toHaveBeenCalledWith('fallback msg', 'oops');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'fallback msg: Internal server error' });

    spy.mockRestore();
  });
});
