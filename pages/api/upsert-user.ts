import { prisma } from 'lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import { TYandexUser } from 'entities/user/yandex/model/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const user: TYandexUser = req.body;
  if (!user.uid || !user.email) return res.status(400).json({ error: 'Missing uid or email' });

  try {
    await prisma.user.upsert({
      where: { uid: BigInt(user.uid) },
      update: {
        position: user.position,
        lastLoginDate: new Date(user.lastLoginDate),
        login_count: { increment: 1 },
        lastLogin: new Date(),
      },
      create: {
        uid: BigInt(user.uid),
        login: user.login,
        email: user.email,
        display: user.display,
        position: user.position,
        lastLoginDate: new Date(user.lastLoginDate),
        created: new Date(),
        lastLogin: new Date(),
        login_count: 1,
        // Do NOT include any other fields!
      },
    });
    res.setHeader('Content-Type', 'application/json');
    res.status(200).end(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('Error upserting user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

