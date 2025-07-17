import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../src/lib/prisma';
import { Team, User, Rule } from '@prisma/client';

// Dummy getUserIdFromRequest for now (replace with real auth)
function getUserIdFromRequest(req: NextApiRequest): string | null {
  // TODO: Replace with real authentication logic
  // For now, get from header for testing
  return req.headers['x-user-id'] as string || null;
}

function replacer(key: string, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
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
      if (!team || !team.members.some((m: User) => m.uid === BigInt(userId))) {
        return res.status(403).json({ error: 'Forbidden1' });
      }
      return res.json({ rules: team.rules });
    } else {
      // Return rules for all teams the user is a member of
      const user = await prisma.user.findUnique({
        where: { uid: BigInt(userId) },
        include: { teams: { include: { rules: true } } },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      // Flatten and deduplicate rules by id
      const allRules = user.teams.flatMap((team: Team & { rules: Rule[] }) => team.rules);
      const uniqueRules = Array.from(new Map(allRules.map((r: Rule) => [r.id, r])).values());
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).end(JSON.stringify({ rules: uniqueRules }, replacer));
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
    if (!team || !team.members.some((m: User) => m.uid === BigInt(userId))) {
      return res.status(403).json({ error: 'Вы не входите в команду: "' + team?.name + '"' });
    }
    // Ensure creator exists
    await prisma.user.upsert({
      where: { uid: BigInt(userId) },
      update: {},
      create: {
        uid: BigInt(userId),
        login: userId,
        email: userId, // or use a real email if available
      },
    });
    const created = await prisma.rule.create({
      data: {
        ...rule,
        shared: true,
        team: { connect: { id: teamId } },
        creator: { connect: { uid: BigInt(userId) } },
      },
    });
    res.setHeader('Content-Type', 'application/json');
    return res.status(201).end(JSON.stringify({ rule: created }, replacer));
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
    if (!team || !team.members.some((m: User) => m.uid === BigInt(userId))) {
      return res.status(403).json({ error: 'Forbidden3' });
    }
    const updated = await prisma.rule.update({
      where: { id },
      data: { ...rule },
    });
    return res.status(201).end(JSON.stringify({ rule: updated }, replacer));
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
    if (!team || !team.members.some((m: User) => m.uid === BigInt(userId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.rule.delete({ where: { id } });
    return res.json({ success: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
} 