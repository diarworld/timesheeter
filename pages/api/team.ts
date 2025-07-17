import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../src/lib/prisma';

// Helper: get user id from access_token header (dummy for now)
function getUserIdFromRequest(req: NextApiRequest): [string | null, string | null, string | null] {
  return [req.headers['x-user-id'] as string || null, req.headers['x-user-email'] as string || null, req.headers['x-user-display'] as string || null];
}

function replacer(key: string, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  if (req.method !== 'POST' && req.method !== 'PATCH' && req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const [userId, userEmail, userDisplay] = getUserIdFromRequest(req);
  const decodedDisplay = userDisplay ? decodeURIComponent(userDisplay) : '';
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // Find all teams where user is a member or creator
      const user = await prisma.user.findUnique({
        where: { uid: BigInt(userId) },
        include: { teams: { include: { members: true } } },
      });
      const createdTeams = await prisma.team.findMany({
        where: { creatorId: BigInt(userId) },
        include: { members: true },
      });

      // Merge teams (avoid duplicates by id)
      const allTeamsMap = new Map();
      (user?.teams || []).forEach(team => allTeamsMap.set(team.id, team));
      (createdTeams || []).forEach(team => allTeamsMap.set(team.id, team));
      const allTeams = Array.from(allTeamsMap.values());

      // Format teams with all member fields, and convert BigInt to string
      const teams = allTeams.map(team => ({
        id: team.id,
        name: team.name,
        creatorId: team.creatorId.toString(),
        members: team.members.map((m: any) => ({
          uid: m.uid.toString(),
          login: m.login,
          email: m.email,
          display: m.display,
          position: m.position,
          lastLoginDate: m.lastLoginDate?.toISOString(),
          created: m.created?.toISOString(),
          lastLogin: m.lastLogin?.toISOString(),
          login_count: m.login_count,
        })),
      }));

      // Build merged unique members array with teamId
      const members: any[] = [];
      allTeams.forEach(team => {
        team.members.forEach((m: any) => {
          if (!members.some(mem => mem.uid === m.uid && mem.teamId === team.id)) {
            members.push({
              teamId: team.id,
              uid: m.uid.toString(),
              login: m.login,
              email: m.email,
              display: m.display,
              position: m.position,
            });
          }
        });
      });

      res.setHeader('Content-Type', 'application/json');
      return res.status(200).end(JSON.stringify({ teams, members }));
    } catch (error) {
      console.error('Error fetching team:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PATCH') {
    const { teamId, members } = req.body;
    if (!teamId || !Array.isArray(members)) {
      return res.status(400).json({ error: 'Missing teamId or members' });
    }
    try {
    // Ensure all users exist
    const userRecords = await Promise.all(members.map(async (m: any) => {
      let user = await prisma.user.findUnique({ where: { uid: BigInt(m.uid) } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            uid: BigInt(m.uid),
            email: m.email,
            login: m.login,
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
          set: userRecords.map(u => ({ uid: u.uid })),
        },
      },
      include: { members: true },
    });
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).end(JSON.stringify({ team: updatedTeam }, replacer));
    } catch (error) {
      console.error('Error updating team:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
    const { members, name } = req.body;
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'Необходимо сначала настроить свою команду' });
    }

    // Use email as unique identifier for users
    const emails = members.map((m: any) => m.email).sort();

    // Try to find a team with exactly these members (by email)
    const allTeams = await prisma.team.findMany({ include: { members: true } });
    // console.log('allTeams', allTeams);
    let foundTeam = allTeams.find((team: any) => {
      const teamEmails = team.members.map((m: any) => m.email).sort();
      return teamEmails.length === emails.length && teamEmails.every((e: any, i: number) => e === emails[i]);
    });

    if (foundTeam) {
      // console.log('foundTeam', foundTeam);
      return res.json({ teamId: foundTeam.id });
    }
    
    
    // Ensure all users exist in DB
    const userRecords = await Promise.all(members.map(async (m: any) => {
      let user = await prisma.user.findUnique({ where: { uid: BigInt(m.uid) } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            uid: BigInt(m.uid),
            email: m.email,
            login: m.login,
            display: m.display,
            position: m.position,
            // Add other fields as needed
          },
        });
      }
      return user;
    }));

    const teamCreator = await prisma.team.findFirst({
      where: { creatorId: BigInt(userId) },
    });

    if (teamCreator) {
      return res.json({ teamId: teamCreator.id });
    }
    // Create new team if not found existing team
    const newTeam = await prisma.team.create({
      data: {
        name: name || `Команда ${decodedDisplay}`,
        creatorId: BigInt(userId),
        members: {
          connect: userRecords.map(u => ({ uid: u.uid })),
        },
      },
    });

    return res.json({ teamId: newTeam.id });
    } catch (error) {
      console.error('Error creating team:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}