import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../src/lib/prisma';

// Helper: get user id from access_token header (dummy for now)
function getUserIdFromRequest(req: NextApiRequest): [string | null, string | null] {
  return [req.headers['x-user-id'] as string || null, req.headers['x-user-email'] as string || null];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Return all teams the user belongs to
    const [userId] = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teams: { include: { members: true } } },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Return teams with id, name, and members
    const teams = user.teams.map((team: any) => ({
      id: team.id,
      name: team.name,
      members: team.members.map((m: any) => ({ id: m.id, email: m.email, display: m.display, position: m.position })),
    }));
    return res.json({ teams });
  }

  if (req.method === 'PATCH') {
    const [userId, userEmail] = getUserIdFromRequest(req);
    if (!userId || !userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { teamId, members } = req.body;
    if (!teamId || !Array.isArray(members)) {
      return res.status(400).json({ error: 'Missing teamId or members' });
    }
    // Ensure all users exist
    const userRecords = await Promise.all(members.map(async (m: any) => {
      let user = await prisma.user.findUnique({ where: { id: m.uid.toString() } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: String(m.uid),
            email: m.email,
            display: m.display,
            position: m.position,
          },
        });
      }
      return user;
    }));
    // Update team members
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        members: {
          set: userRecords.map(u => ({ id: u.id.toString() })),
        },
      },
      include: { members: true },
    });
    return res.json({ team: updatedTeam });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const [userId, userEmail] = getUserIdFromRequest(req);
  if (!userId || !userEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { members, name } = req.body;
  if (!Array.isArray(members) || members.length === 0) {
    return res.status(400).json({ error: 'Missing or empty members array' });
  }

  // Use email as unique identifier for users
  const emails = members.map((m: any) => m.email).sort();

  // Try to find a team with exactly these members (by email)
  const allTeams = await prisma.team.findMany({ include: { members: true } });
  let foundTeam = allTeams.find((team: any) => {
    const teamEmails = team.members.map((m: any) => m.email).sort();
    return teamEmails.length === emails.length && teamEmails.every((e: any, i: number) => e === emails[i]);
  });

  if (foundTeam) {
    return res.json({ teamId: foundTeam.id });
  }
  
  
  // Ensure all users exist in DB
  const userRecords = await Promise.all(members.map(async (m: any) => {
    let user = await prisma.user.findUnique({ where: { id: m.uid.toString() } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: String(m.uid),
          email: m.email,
          display: m.display,
          position: m.position,
          // Add other fields as needed
        },
      });
    }
    return user;
  }));

  const teamCreator = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  if (teamCreator) {
    return res.json({ teamId: teamCreator.id });
  }
  // Create new team
  const newTeam = await prisma.team.create({
    data: {
      name: name || `Team of ${userEmail}`,
      creatorId: userId,
      members: {
        connect: userRecords.map(u => ({ id: u.id.toString() })),
      },
    },
  });

  return res.json({ teamId: newTeam.id });
} 