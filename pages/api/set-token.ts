import type { NextApiRequest, NextApiResponse } from 'next';
import * as cookie from 'cookie';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { token, clear } = req.body;
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