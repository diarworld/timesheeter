import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../src/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { uid, department, division } = req.body;
    
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

    // Prepare update data
    const updateData: any = {};
    if (department !== undefined) updateData.department = department;
    if (division !== undefined) updateData.division = division;

    // Upsert user extras
    const userExtras = await prisma.userExtras.upsert({
      where: {
        uid: BigInt(uid),
      },
      update: updateData,
      create: {
        uid: BigInt(uid),
        department: department || null,
        division: division || null,
        photo: null,
      },
    });

    console.log('User extras updated for user:', uid, updateData);

    // Convert BigInt to string for JSON serialization
    const serializedUserExtras = {
      uid: userExtras.uid.toString(),
      department: userExtras.department,
      division: userExtras.division,
      photo: userExtras.photo,
    };

    res.status(200).json({ 
      success: true, 
      message: 'User extras updated successfully',
      uid: parseInt(uid, 10),
      userExtras: serializedUserExtras
    });
  } catch (error) {
    console.error('Error updating user extras:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 