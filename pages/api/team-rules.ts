import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../src/lib/prisma';

// Dummy getUserIdFromRequest for now (replace with real auth)
function getUserIdFromRequest(req: NextApiRequest): string | null {
  // TODO: Replace with real authentication logic
  // For now, get from header for testing
  return req.headers['x-user-id'] as string || null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // GET /api/team-rules?teamId=...
    const { teamId } = req.query;
    if (teamId && typeof teamId === 'string') {
      // Return rules for a specific team
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { members: true, rules: true },
      });
      if (!team || !team.members.some((m: { id: any; }) => m.id === userId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return res.json({ rules: team.rules });
    } else {
      // Return rules for all teams the user is a member of
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { teams: { include: { rules: true } } },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      // Flatten and deduplicate rules by id
      const allRules = user.teams.flatMap((team: { rules: any; }) => team.rules);
      const uniqueRules = Array.from(new Map(allRules.map((r: { id: any; }) => [r.id, r])).values());
      return res.json({ rules: uniqueRules });
    }
  }

  if (req.method === 'POST') {
    // POST /api/team-rules { teamId, rule }
    const { teamId, rule } = req.body;
    if (!teamId || !rule) {
      return res.status(400).json({ error: 'Missing teamId or rule' });
    }
    // Check membership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });
    if (!team || !team.members.some((m: { id: any; }) => m.id === userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Ensure creator exists
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: userId, // or use a real email if available
      },
    });
    const created = await prisma.rule.create({
      data: {
        ...rule,
        shared: true,
        team: { connect: { id: teamId } },
        creator: { connect: { id: userId } },
      },
    });
    return res.status(201).json({ rule: created });
  }

  if (req.method === 'PUT') {
    // PUT /api/team-rules { id, teamId, rule }
    const { id, teamId, rule } = req.body;
    if (!id || !teamId || !rule) {
      return res.status(400).json({ error: 'Missing id, teamId, or rule' });
    }
    // Check membership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });
    if (!team || !team.members.some((m: { id: any; }) => m.id === userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await prisma.rule.update({
      where: { id },
      data: { ...rule },
    });
    return res.json({ rule: updated });
  }

  if (req.method === 'DELETE') {
    // DELETE /api/team-rules { id, teamId }
    const { id, teamId: teamIdFromBody } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }
    // Find the rule to get its teamId if not provided
    let teamId = teamIdFromBody;
    if (!teamId) {
      const rule = await prisma.rule.findUnique({ where: { id } });
      if (!rule || !rule.teamId) {
        return res.status(404).json({ error: 'Rule or team not found' });
      }
      teamId = rule.teamId;
    }
    // Check membership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });
    if (!team || !team.members.some((m: { id: any; }) => m.id === userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.rule.delete({ where: { id } });
    return res.json({ success: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
} 