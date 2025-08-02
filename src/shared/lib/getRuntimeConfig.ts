import getConfig from 'next/config';

/**
 * Get runtime configuration with fallback to process.env
 * This ensures we can access environment variables at runtime in production
 */
export const getRuntimeConfig = () => {
  // Fallback to Next.js runtime config and process.env
  const { publicRuntimeConfig } = getConfig() || {};

  const config = {
    // OpenReplay configuration
    COMPANY_OPENREPLAY_KEY:
      publicRuntimeConfig?.NEXT_PUBLIC_COMPANY_OPENREPLAY_KEY || 
      process.env.NEXT_PUBLIC_COMPANY_OPENREPLAY_KEY ||
      process.env.COMPANY_OPENREPLAY_KEY,
    COMPANY_OPENREPLAY_URL:
      publicRuntimeConfig?.NEXT_PUBLIC_COMPANY_OPENREPLAY_URL || 
      process.env.NEXT_PUBLIC_COMPANY_OPENREPLAY_URL ||
      process.env.COMPANY_OPENREPLAY_URL,

    // External service URLs
    COMPANY_POWERBI_URL: 
      publicRuntimeConfig?.NEXT_PUBLIC_COMPANY_POWERBI_URL || 
      process.env.NEXT_PUBLIC_COMPANY_POWERBI_URL ||
      process.env.COMPANY_POWERBI_URL,
    SUPPORT_URL: 
      publicRuntimeConfig?.NEXT_PUBLIC_SUPPORT_URL || 
      process.env.NEXT_PUBLIC_SUPPORT_URL ||
      process.env.SUPPORT_URL,
    RESTORE_PASSWORD_URL: 
      publicRuntimeConfig?.NEXT_PUBLIC_RESTORE_PASSWORD_URL || 
      process.env.NEXT_PUBLIC_RESTORE_PASSWORD_URL ||
      process.env.RESTORE_PASSWORD_URL,
  };

  console.log('Runtime config loaded:', {
    COMPANY_OPENREPLAY_KEY: config.COMPANY_OPENREPLAY_KEY ? '***SET***' : 'undefined',
    COMPANY_OPENREPLAY_URL: config.COMPANY_OPENREPLAY_URL ? '***SET***' : 'undefined',
    COMPANY_POWERBI_URL: config.COMPANY_POWERBI_URL ? '***SET***' : 'undefined',
    SUPPORT_URL: config.SUPPORT_URL ? '***SET***' : 'undefined',
    RESTORE_PASSWORD_URL: config.RESTORE_PASSWORD_URL ? '***SET***' : 'undefined',
  });

  return config;
};
