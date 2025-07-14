import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { query, user } = req.body;
  const difyToken = process.env.DIFY_API_TOKEN;
//   console.log(difyToken);
  if (!difyToken) return res.status(500).json({ error: 'Dify token not configured' });

  try {
    const difyRes = await fetch('https://dify.apps.data.lmru.tech/v1/completion-messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: { query },
        response_mode: 'blocking',
        user: user || 'Anonymous',
      }),
    });

    const data = await difyRes.json();
    // Extract JSON from code block in answer
    const match = data.answer?.match(/```(?:json)?\n?([\s\S]*?)```/i);
    let rule = null;
    if (match && match[1]) {
      rule = JSON.parse(match[1]);
    //   console.log(rule);
    }
    if (!rule || !rule.name || !rule.conditions || !rule.actions) {
      res.status(200).json({ error: 'No rule generated', raw: data });
      return;
    }
    res.status(200).json({ rule, raw: data });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate rule', details: e instanceof Error ? e.message : e });
  }
} 