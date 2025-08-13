import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../src/lib/prisma';
import { Team, User } from '@prisma/client';

// Helper: get user id from access_token header (dummy for now)
function getUserIdFromRequest(req: NextApiRequest): [string | null, string | null, string | null] {
  return [req.headers['x-user-id'] as string || null, req.headers['x-user-email'] as string || null, req.headers['x-user-display'] as string || null];
}

function replacer(key: string, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  if (req.method !== 'POST' && req.method !== 'PATCH' && req.method !== 'GET' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const [userId, userEmail, userDisplay] = getUserIdFromRequest(req);
  const decodedDisplay = userDisplay ? decodeURIComponent(userDisplay) : '';
  // if (!userId) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  if (req.method === 'GET') {
    try {
      // --- NEW: support search and creatorId filter ---
      const { search, creatorId } = req.query;
      let teamWhere = {};
      if (creatorId) {
        teamWhere = { ...teamWhere, creatorId: BigInt(creatorId as string) };
      }
      if (search) {
        teamWhere = {
          ...teamWhere,
          name: { contains: search as string, mode: 'insensitive' },
        };
      }
      let allTeams;
      if (search || creatorId) {
        allTeams = await prisma.team.findMany({
          where: teamWhere,
          include: { members: true },
        });
      } else {
        // Find all teams where user is a member or creator
        const user = await prisma.user.findUnique({
          where: { uid: BigInt(userId || '1') },
          include: { teams: { include: { members: true } } },
        });
        const createdTeams = await prisma.team.findMany({
          where: { creatorId: BigInt(userId || '1') },
          include: { members: true },
        });
        // Merge teams (avoid duplicates by id)
        const allTeamsMap = new Map();
        (user?.teams || []).forEach((team: Team & { members: User[] }) => allTeamsMap.set(team.id, team));
        (createdTeams || []).forEach((team: Team & { members: User[] }) => allTeamsMap.set(team.id, team));
        allTeams = Array.from(allTeamsMap.values());
      }
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
    const { teamId, members, name } = req.body;
    if (!teamId) {
      return res.status(400).json({ error: 'Missing teamId' });
    }
    
    try {
      // Check if user is the creator of the team
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { creator: true },
      });
      
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
      
      if (team.creatorId.toString() !== userId) {
        return res.status(403).json({ error: 'Only team creator can modify the team' });
      }

      let updateData: any = {};
      
      // Handle team name update
      if (name !== undefined) {
        if (!name || name.trim() === '') {
          return res.status(400).json({ error: 'Team name cannot be empty' });
        }
        
        // Check if a team with the same name and creator already exists
        const existingTeamWithSameName = await prisma.team.findFirst({
          where: { 
            name: name.trim(),
            creatorId: BigInt(userId || '1'),
            id: { not: teamId } // Exclude current team
          },
        });

        if (existingTeamWithSameName) {
          return res.status(400).json({ error: "Team with this name already exists for this creator" });
        }
        
        updateData.name = name.trim();
      }
      
      // Handle team members update
      if (members !== undefined) {
        if (!Array.isArray(members)) {
          return res.status(400).json({ error: 'Members must be an array' });
        }
        
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
        
        updateData.members = {
          set: userRecords.map(u => ({ uid: u.uid })),
        };
      }
      
      // Update team
      const updatedTeam = await prisma.team.update({
        where: { id: teamId },
        data: updateData,
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
    if (!Array.isArray(members)) {
      return res.status(400).json({ error: 'Members must be an array' });
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

    // Check if a team with the same name and creator already exists
    const existingTeamWithSameName = await prisma.team.findFirst({
      where: { 
        name: name,
        creatorId: BigInt(userId || '1')
      },
    });

    if (existingTeamWithSameName) {
      return res.status(400).json({ error: "Team with this name already exists for this creator" });
    }

    // Create new team
    const newTeam = await prisma.team.create({
      data: {
        name: name || `Команда ${decodedDisplay}`,
        creatorId: BigInt(userId || '1'),
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

  if (req.method === 'DELETE') {
    const { teamId } = req.body;
    if (!teamId) {
      return res.status(400).json({ error: 'Missing teamId' });
    }
    
    try {
      // Check if user is the creator of the team
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { creator: true },
      });
      
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
      
      if (team.creatorId.toString() !== userId) {
        return res.status(403).json({ error: 'Only team creator can delete the team' });
      }
      
      // Delete the team (this will cascade to related rules)
      await prisma.team.delete({
        where: { id: teamId },
      });
      
      return res.status(200).json({ message: 'Team deleted successfully' });
    } catch (error) {
      console.error('Error deleting team:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}