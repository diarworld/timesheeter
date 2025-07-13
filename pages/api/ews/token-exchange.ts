import type { NextApiRequest, NextApiResponse } from 'next';
import { parse, serialize } from 'cookie';
import { AuthConfig } from './AuthConfig';

const TENANT_ID = AuthConfig.tenantId;
const CLIENT_ID = AuthConfig.appId;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';
const TOKEN_ENDPOINT = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { code, redirectUri } = req.body;
  if (!code || !redirectUri) return res.status(400).json({ error: 'Missing code or redirectUri' });

  try {
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    if (CLIENT_SECRET) params.append('client_secret', CLIENT_SECRET);
    params.append('scope', AuthConfig.appScopes.join(' '));
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('grant_type', 'authorization_code');

    const fetch = (await import('node-fetch')).default;
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const tokenData = await tokenRes.json();
    console.log('tokenData', tokenData);

    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(400).json({ error: 'Failed to get access token', details: tokenData });
    }

    // Set access token as HTTP-only cookie
    res.setHeader('Set-Cookie', serialize('ms_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokenData.expires_in || 3600,
    }));
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Token exchange failed', details: (err as Error).message });
  }
} 