import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { query, user } = req.body;
  const difyToken = process.env.DIFY_API_TOKEN;
  const difyUrl = process.env.DIFY_URL;
  const difyCost = Number(process.env.DIFY_COST);
//   console.log(difyToken);
  if (!difyToken) return res.status(500).json({ error: 'Dify token not configured' });
  if (!difyUrl) return res.status(500).json({ error: 'LLM API url not configured' });

  try {
    const difyRes = await fetch(`${difyUrl}/v1/completion-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: { query, uuidv4: uuidv4() },
        response_mode: 'blocking',
        user: user || 'Anonymous',
      }),
    });

    const data = await difyRes.json();
    const totalTokens = data.metadata?.usage?.total_tokens || 0;
    const cost = (totalTokens * difyCost).toFixed(2);
    // Extract JSON from code block in answer
    const match = data.answer?.match(/```(?:json)?\n?([\s\S]*?)```/i);
    let rule = null;
    if (match && match[1]) {
      rule = JSON.parse(match[1]);
    //   console.log(rule);
    }
    if (!rule || !rule.name || !rule.conditions || !rule.actions) {
      res.status(200).json({ error: 'No rule generated', raw: data, cost });
      return;
    }
    res.status(200).json({ rule, raw: data, cost });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate rule', details: e instanceof Error ? e.message : e });
  }
} 