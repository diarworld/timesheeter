import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET or POST (depending on your frontend)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Parse cookies
  const cookies = parse(req.headers.cookie || '');
  const accessToken = cookies.code; // 'code' is your access token

  if (!accessToken) {
    return res.status(401).json({ message: 'No access token found in cookies' });
  }

  // Optionally, get date range from query/body
  const { start, end } = req.method === 'POST' ? req.body : req.query;

  // Build Microsoft Graph API URL
  let url = 'https://graph.microsoft.com/v1.0/me/calendar/events';
  if (start && end) {
    url += `?$filter=start/dateTime ge '${start}' and end/dateTime le '${end}'`;
  }

  try {
    const graphRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!graphRes.ok) {
      const error = await graphRes.json();
      return res.status(graphRes.status).json({ message: 'Graph API error', error });
    }

    const data = await graphRes.json();
    return res.status(200).json({ success: true, events: data.value });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: (error as Error).message });
  }
} 