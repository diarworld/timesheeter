import { prisma } from 'lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { id, email, display, position } = req.body;
  if (!id || !email) return res.status(400).json({ error: 'Missing id or email' });

  const user = await prisma.user.upsert({
    where: { id },
    update: {
      login_count: { increment: 1 },
      lastLogin: new Date(),
      email,
      display,
      position,
    },
    create: {
      id,
      email,
      display,
      position,
      login_count: 0,
      lastLogin: new Date(),
      created: new Date(),
    },
  });

  res.status(200).json({ user });
}
