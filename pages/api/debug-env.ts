import { NextApiRequest, NextApiResponse } from 'next';
import { getServerEnvConfig } from 'shared/lib/serverEnv';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const envVars = getServerEnvConfig();
    
    // Return both the .env file content and parsed variables
    const response = {
      envFileContent: Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n'),
      parsedVariables: envVars,
      processEnv: {
        COMPANY_OPENREPLAY_KEY: process.env.COMPANY_OPENREPLAY_KEY,
        COMPANY_OPENREPLAY_URL: process.env.COMPANY_OPENREPLAY_URL,
        COMPANY_POWERBI_URL: process.env.COMPANY_POWERBI_URL,
        SUPPORT_URL: process.env.SUPPORT_URL,
        RESTORE_PASSWORD_URL: process.env.RESTORE_PASSWORD_URL,
        NODE_ENV: process.env.NODE_ENV,
      }
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error reading environment:', error);
    res.status(500).json({ error: 'Error reading environment' });
  }
} 