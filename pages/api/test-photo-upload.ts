import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../src/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ message: 'User ID is required' });
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

    // Create a simple 1x1 pixel red PNG image as base64 for testing
    const testPhotoBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    // Upsert user extras with test photo
    const userExtras = await prisma.userExtras.upsert({
      where: {
        uid: BigInt(uid),
      },
      update: {
        photo: testPhotoBase64,
        department: 'Test Department',
        division: 'Test Division',
      },
      create: {
        uid: BigInt(uid),
        photo: testPhotoBase64,
        department: 'Test Department',
        division: 'Test Division',
      },
    });

    console.log('Test photo uploaded for user:', uid);

    // Convert BigInt to string for JSON serialization
    const serializedUserExtras = {
      uid: userExtras.uid.toString(),
      department: userExtras.department,
      division: userExtras.division,
      photo: userExtras.photo,
    };

    res.status(200).json({ 
      success: true, 
      message: 'Test photo uploaded successfully',
      uid: parseInt(uid, 10),
      userExtras: serializedUserExtras
    });
  } catch (error) {
    console.error('Error uploading test photo:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 