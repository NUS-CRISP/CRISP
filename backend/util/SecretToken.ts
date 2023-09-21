import jwt from 'jsonwebtoken';

export default (id: string) =>
    jwt.sign({ id }, process.env.JWT_SECRET!, {
        expiresIn: '30d',
    });
