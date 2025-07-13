import type { NextApiRequest, NextApiResponse } from 'next';
import * as cookie from 'cookie';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { type, token, clear } = req.body;

  if (clear) {
    res.setHeader('Set-Cookie', cookie.serialize('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    }));
    return res.status(200).json({ success: true });
  }

  if (token && type) {
    const cookieName = type === 'microsoft' ? 'code' : type === 'yandex' ? 'access_code' : 'access_token';
    res.setHeader('Set-Cookie', cookie.serialize(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week, adjust as needed
    }));
    res.status(200).json({ success: true });
    return;
  }

  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  res.setHeader('Set-Cookie', cookie.serialize('access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  }));

  res.status(200).json({ success: true });
} 