import fs from 'fs';
import path from 'path';

/**
 * Server-side only utility to read environment variables from .env file
 * This should only be used in API routes or server-side code
 */
export const getServerEnvConfig = () => {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars: Record<string, string> = {};
      
      // Parse .env file content
      envContent.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            envVars[key] = valueParts.join('=');
          }
        }
      });
      
      return envVars;
    }
  } catch (error) {
    console.log('Could not load .env file:', error);
  }
  
  return {};
}; 