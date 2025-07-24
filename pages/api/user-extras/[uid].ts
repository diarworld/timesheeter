import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../src/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { uid } = req.query;
    
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const userExtras = await prisma.userExtras.findUnique({
      where: {
        uid: BigInt(uid),
      },
    });

    if (!userExtras) {
      return res.status(404).json({ message: 'User extras not found' });
    }

    // Convert BigInt to string for JSON serialization
    const serializedUserExtras = {
      uid: userExtras.uid.toString(),
      department: userExtras.department,
      division: userExtras.division,
      photo: userExtras.photo,
    };

    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.status(200).json(serializedUserExtras);
  } catch (error) {
    console.error('Error fetching user extras:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 