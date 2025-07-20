import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../src/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { uid, photo } = req.body;
    
    if (!uid || !photo) {
      return res.status(400).json({ message: 'User ID and photo are required' });
    }

    // Validate that the user exists
    const user = await prisma.user.findUnique({
      where: {
        uid: BigInt(uid),
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Upsert user extras - create if doesn't exist, update if exists
    const userExtras = await prisma.userExtras.upsert({
      where: {
        uid: BigInt(uid),
      },
      update: {
        photo: photo,
      },
      create: {
        uid: BigInt(uid),
        photo: photo,
        department: null,
        division: null,
      },
    });

    console.log('Photo uploaded for user:', uid, 'Photo length:', photo.length);

    // Convert BigInt to string for JSON serialization
    const serializedUserExtras = {
      uid: userExtras.uid.toString(),
      department: userExtras.department,
      division: userExtras.division,
      photo: userExtras.photo,
    };

    res.status(200).json({ 
      success: true, 
      message: 'Photo uploaded successfully',
      uid: parseInt(uid, 10),
      userExtras: serializedUserExtras
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 